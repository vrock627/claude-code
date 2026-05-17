// Headless validation for the life-sim data + roll math. Not shipped.
// Run: node _smoke.js
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const src = fs.readFileSync(path.join(__dirname, "data.js"), "utf8");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(src, sandbox);
const D = sandbox.window.GAMEDATA;
const T = D.TUNING;

const errors = [];
const check = (cond, msg) => { if (!cond) errors.push(msg); };

check(D, "GAMEDATA not exposed");
const STAT_SET = new Set(D.STATS);

// Backgrounds: valid stats, fixed point total.
for (const [id, bg] of Object.entries(D.BACKGROUNDS)) {
  const keys = Object.keys(bg.stats);
  check(keys.length === D.STATS.length, `${id}: stat count mismatch`);
  for (const k of keys) check(STAT_SET.has(k), `${id}: unknown stat ${k}`);
  const sum = Object.values(bg.stats).reduce((a, b) => a + b, 0);
  check(sum === 18, `${id}: stat sum ${sum} != 18`);
}

// Approaches reference valid stats.
for (const ap of D.APPROACHES) check(STAT_SET.has(ap.stat), `approach ${ap.id}: bad stat ${ap.stat}`);

// Items: structural sanity per type.
for (const [id, it] of Object.entries(D.ITEMS)) {
  check(it.price > 0, `item ${id}: bad price`);
  if (it.type === "tempStat") {
    check(STAT_SET.has(it.stat), `item ${id}: bad stat`);
    check(it.amount > 0 && it.phases > 0, `item ${id}: bad temp values`);
  } else if (it.type === "permStat") {
    check(STAT_SET.has(it.stat) && it.amount > 0, `item ${id}: bad perm values`);
  } else if (it.type === "gift") {
    check(it.value > 0, `item ${id}: gift has no value`);
  } else if (it.type !== "tool") {
    check(false, `item ${id}: unknown type ${it.type}`);
  }
}

// Shops reference real locations + real items.
for (const [loc, ids] of Object.entries(D.SHOPS)) {
  check(D.LOCATIONS[loc], `shop at unknown location ${loc}`);
  for (const i of ids) check(D.ITEMS[i], `shop ${loc}: unknown item ${i}`);
}
// Phone must be buyable somewhere, or dates/texting are unreachable.
check(
  Object.values(D.SHOPS).some((ids) => ids.includes("phone")),
  "smartphone is not sold anywhere"
);

// Locations: action/work stats valid; home flagged correctly.
for (const [id, loc] of Object.entries(D.LOCATIONS)) {
  if (loc.action) check(STAT_SET.has(loc.action.stat), `${id}: bad action stat`);
  if (loc.work) check(loc.work.wage > 0, `${id}: bad wage`);
}
check(Object.values(D.LOCATIONS).some((l) => l.home), "no home location");
check(Object.values(D.LOCATIONS).some((l) => l.work), "nowhere to earn money");

// Characters: liked stat/styles valid, favorite gift is a real gift,
// schedule points at real locations for every phase.
const APP_STYLES = new Set(D.APPROACHES.map((a) => a.style));
for (const [id, c] of Object.entries(D.CHARACTERS)) {
  check(STAT_SET.has(c.likedStat), `${id}: bad likedStat`);
  check(APP_STYLES.has(c.likedStyle), `${id}: likedStyle matches no approach`);
  check(APP_STYLES.has(c.dislikedStyle), `${id}: dislikedStyle matches no approach`);
  check(D.ITEMS[c.favoriteGift] && D.ITEMS[c.favoriteGift].type === "gift",
    `${id}: favoriteGift ${c.favoriteGift} is not a gift item`);
  for (const ph of D.PHASES) {
    check(D.LOCATIONS[c.schedule[ph]], `${id}: schedule[${ph}] -> unknown ${c.schedule[ph]}`);
  }
}

// Conversation + pursue config present.
check(D.CONVO.beats >= 1 && D.CONVO.prompts.length >= D.CONVO.beats, "convo prompt/beat mismatch");
const PURSUE_IDS = new Set(D.PURSUE.map((p) => p.id));
for (const k of ["gift", "number", "date", "kiss", "wrap"]) {
  check(PURSUE_IDS.has(k), `pursue option "${k}" missing`);
}

// --- Roll math: beat outcomes reachable across the realistic spread ---
function beatTier(statVal, vibe, affection) {
  const d20 = 1 + Math.floor(Math.random() * 20);
  const total = d20 + statVal + vibe;
  const dc = Math.round(T.baseDC + affection * T.dcPerAffection);
  const m = total - dc;
  if (d20 === 20 || m >= 10) return "crit";
  if (m >= 0) return "success";
  if (d20 === 1 || m <= -8) return "fail";
  return "partial";
}
const tiers = { crit: 0, success: 0, partial: 0, fail: 0 };
for (let i = 0; i < 8000; i++) {
  const statVal = Math.floor(Math.random() * 13);
  const vibe = [-T.dislikedStylePenalty, 0, T.likedStyleBonus][i % 3];
  const aff = Math.floor(Math.random() * (T.affectionCap + 1));
  tiers[beatTier(statVal, vibe, aff)]++;
}
for (const k of Object.keys(tiers)) check(tiers[k] > 0, `beat tier "${k}" unreachable`);

// --- Capstone resolver: well-built attempts should mostly succeed,
// cold attempts should mostly fail. Mirrors resolvePursue() math. ---
function pursueWin(cha, aff, momentum, fit, dc) {
  const d20 = 1 + Math.floor(Math.random() * 20);
  const total = d20 + cha + Math.floor(aff / 8) + momentum + fit;
  return d20 !== 1 && (d20 === 20 || total >= dc);
}
function rate(fn, n) {
  let w = 0;
  for (let i = 0; i < n; i++) if (fn()) w++;
  return w / n;
}
const N = 20000;
const kissReady = rate(() => pursueWin(12, 70, 4, 4, T.kissDC), N);
const kissCold = rate(() => pursueWin(3, 55, -2, -2, T.kissDC), N);
const numReady = rate(() => pursueWin(8, 25, 2, 2, T.numberDC), N);
check(kissReady > 0.75, `kiss when ready too low: ${kissReady.toFixed(2)}`);
check(kissCold < 0.45, `kiss when cold too high: ${kissCold.toFixed(2)}`);
check(numReady > 0.6, `number when ready too low: ${numReady.toFixed(2)}`);

// --- Economy: a work shift should out-earn a day's allowance,
// and the phone must be affordable within a few work shifts. ---
const cafeWage = D.LOCATIONS.cafe.work.wage;
check(cafeWage > T.dailyAllowance, "a work shift should beat passive allowance");
const shiftsForPhone = Math.ceil((D.ITEMS.phone.price - T.startMoney) / D.LOCATIONS.mall.work.wage);
check(shiftsForPhone <= 3, `phone takes ${shiftsForPhone} shifts — too grindy`);

console.log("Backgrounds:", Object.keys(D.BACKGROUNDS).join(", "));
console.log("Locations:", Object.keys(D.LOCATIONS).join(", "));
console.log("Items:", Object.keys(D.ITEMS).length, "| Shops:", Object.keys(D.SHOPS).length);
console.log("Beat tiers / 8000:", JSON.stringify(tiers));
console.log(
  `Capstone win rates — kiss ready ${kissReady.toFixed(2)}, kiss cold ${kissCold.toFixed(
    2
  )}, number ready ${numReady.toFixed(2)}`
);
console.log(`Phone affordable in ${shiftsForPhone} mall shift(s) from start.`);

if (errors.length) {
  console.error("\nFAIL:");
  errors.forEach((e) => console.error("  " + e));
  process.exit(1);
}
console.log("\nSMOKE TEST PASSED");
