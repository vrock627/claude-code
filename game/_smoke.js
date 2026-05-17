// Headless validation for the life-sim data + math. Not shipped.
// Run: node _smoke.js
const fs = require("fs"), path = require("path"), vm = require("vm");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, "data.js"), "utf8"), sandbox);
const D = sandbox.window.GAMEDATA, T = D.TUNING;

const errors = [];
const check = (c, m) => { if (!c) errors.push(m); };
const near1 = (n) => Math.abs(n - 1) < 0.001;
const STAT = new Set(D.STATS), BAR = new Set(D.BARS), TRAIT = new Set(D.TRAITS);
const STYLE = new Set(D.RESPONSES.map((r) => r.style).concat([D.MOVE.style]));

check(D, "GAMEDATA missing");

// Backgrounds.
for (const [id, bg] of Object.entries(D.BACKGROUNDS)) {
  check(Object.keys(bg.stats).length === D.STATS.length, `${id}: stat count`);
  for (const k of Object.keys(bg.stats)) check(STAT.has(k), `${id}: bad stat ${k}`);
  const s = Object.values(bg.stats).reduce((a, b) => a + b, 0);
  check(s === 18, `${id}: stat sum ${s} != 18`);
}

// Responses + MOVE.
for (const r of D.RESPONSES) {
  check(STAT.has(r.stat), `response "${r.text}": bad stat`);
  check(BAR.has(r.bar), `response "${r.text}": bad bar`);
  check(TRAIT.has(r.trait), `response "${r.text}": bad trait`);
}
check(STAT.has(D.MOVE.stat) && BAR.has(D.MOVE.bar), "MOVE bad stat/bar");
check(D.RESPONSES.length >= 3, "need >=3 responses to draw from");

// Lines: every mood, every tier.
for (const mood of ["cold", "neutral", "warm", "hot"]) {
  check(D.LINES[mood], `LINES missing mood ${mood}`);
  for (const k of ["open", "crit", "success", "partial", "fail"])
    check(D.LINES[mood] && D.LINES[mood][k] && D.LINES[mood][k].length, `LINES[${mood}].${k} empty`);
}

// Items / shops. Phone must NOT exist (player starts with one).
check(!D.ITEMS.phone, "phone item should be removed (player starts with a phone)");
for (const [id, it] of Object.entries(D.ITEMS)) {
  check(it.price > 0, `item ${id}: price`);
  if (it.type === "tempStat") check(STAT.has(it.stat) && it.amount > 0 && it.phases > 0, `item ${id}: temp`);
  else if (it.type === "permStat") check(STAT.has(it.stat) && it.amount > 0, `item ${id}: perm`);
  else if (it.type === "gift") check(it.value > 0, `item ${id}: gift value`);
  else check(false, `item ${id}: bad type ${it.type}`);
}
for (const [loc, list] of Object.entries(D.SHOPS)) {
  check(D.LOCATIONS[loc], `shop at unknown loc ${loc}`);
  for (const i of list) check(D.ITEMS[i], `shop ${loc}: unknown item ${i}`);
}

// Locations: action stat, work wage, date scenes, party not a static loc.
for (const [id, loc] of Object.entries(D.LOCATIONS)) {
  if (loc.action) check(STAT.has(loc.action.stat), `${id}: bad action stat`);
  if (loc.work) check(loc.work.wage > 0, `${id}: bad wage`);
  if (loc.dateSpot) check(D.DATE_SCENES[id], `${id}: dateSpot has no DATE_SCENE`);
}
check(!D.LOCATIONS.party, "party must be injected, not a static location");
check(Object.values(D.LOCATIONS).some((l) => l.home), "no home");
check(Object.values(D.LOCATIONS).some((l) => l.work), "nowhere to earn");

// Date scenes well-formed.
for (const [loc, sc] of Object.entries(D.DATE_SCENES)) {
  check(D.LOCATIONS[loc] && D.LOCATIONS[loc].dateSpot, `DATE_SCENE ${loc} not a dateSpot`);
  check(sc.beats.length >= 2, `DATE_SCENE ${loc}: too few beats`);
  for (const b of sc.beats) {
    check(b.opts.length >= 2, `DATE_SCENE ${loc}: beat needs options`);
    for (const o of b.opts) check(TRAIT.has(o.trait) && o.mag > 0, `DATE_SCENE ${loc}: opt "${o.text}" bad trait/mag`);
  }
}

// Characters.
for (const [id, c] of Object.entries(D.CHARACTERS)) {
  check(STAT.has(c.likedStat), `${id}: likedStat`);
  check(STYLE.has(c.likedStyle) && STYLE.has(c.dislikedStyle), `${id}: liked/disliked style not used by any response`);
  check(D.ITEMS[c.favoriteGift] && D.ITEMS[c.favoriteGift].type === "gift", `${id}: favoriteGift not a gift`);
  for (const ph of D.PHASES) check(D.LOCATIONS[c.schedule[ph]], `${id}: schedule ${ph}`);
  const ap = D.STATS.reduce((s, k) => s + (c.attractProfile[k] || 0), 0);
  check(near1(ap), `${id}: attractProfile sums ${ap} != 1`);
  const bw = D.BARS.reduce((s, k) => s + (c.barWeights[k] || 0), 0);
  check(near1(bw), `${id}: barWeights sum ${bw} != 1`);
  check(c.libidoRange[0] >= 0 && c.libidoRange[1] <= 100 && c.libidoRange[0] < c.libidoRange[1], `${id}: libidoRange`);
  check(c.decay.affection >= 0 && c.decay.romance >= 0, `${id}: decay`);
  for (const k of Object.keys(c.traitAffinity)) check(TRAIT.has(k), `${id}: traitAffinity unknown trait ${k}`);
}

// --- Fractional stat training: 0 reachable, 2 reachable, mean sane. ---
function gainOnce() {
  let r = Math.random(), acc = 0;
  for (const seg of T.statRoll) { acc += seg.p; if (r <= acc) return seg.min === seg.max ? seg.min : seg.min + Math.random() * (seg.max - seg.min); }
  return 0;
}
let zero = 0, big = 0, sum = 0, N = 40000;
for (let i = 0; i < N; i++) { const g = gainOnce(); if (g === 0) zero++; if (g >= 2) big++; sum += g; }
check(zero > 0 && big > 0, "stat gain should sometimes be 0 and sometimes 2");
const mean = sum / N;
check(mean > 0.4 && mean < 0.9, `stat gain mean ${mean.toFixed(2)} out of expected band`);
const psum = T.statRoll.reduce((a, s) => a + s.p, 0);
check(Math.abs(psum - 1) < 0.001, `statRoll probabilities sum ${psum} != 1`);

// --- Conversation beat tiers reachable. ---
function tier(d20, total, dc) { const m = total - dc; if (d20 === 20 || m >= 10) return "crit"; if (m >= 0) return "success"; if (d20 === 1 || m <= -8) return "fail"; return "partial"; }
const tc = { crit: 0, success: 0, partial: 0, fail: 0 };
for (let i = 0; i < 8000; i++) {
  const d20 = 1 + Math.floor(Math.random() * 20);
  const sv = Math.floor(Math.random() * 14);
  const vibe = [-T.dislikedStylePenalty, 0, T.likedStyleBonus][i % 3];
  const comp = Math.floor(Math.random() * 101);
  tc[tier(d20, sv + vibe + d20, Math.round(T.baseDC + comp * T.dcPerInterest))]++;
}
for (const k in tc) check(tc[k] > 0, `beat tier ${k} unreachable`);

// --- "Make a move": risky when cold, reliable when hot. ---
function moveWin(cha, comp, vibe) {
  const d20 = 1 + Math.floor(Math.random() * 20);
  const dc = Math.round(T.moveBaseDC + (comp < 60 ? (60 - comp) * T.movePerInterestMissing : 0));
  return d20 !== 1 && (d20 === 20 || d20 + cha + vibe >= dc);
}
function rate(fn, n) { let w = 0; for (let i = 0; i < n; i++) if (fn()) w++; return w / n; }
const M = 20000;
const moveHot = rate(() => moveWin(10, 75, T.likedStyleBonus), M); // built + her style
const moveCold = rate(() => moveWin(4, 8, 0), M);                  // weak + neutral read
check(moveHot > 0.8, `move when hot too low ${moveHot.toFixed(2)}`);
check(moveCold < 0.45, `move when cold too high ${moveCold.toFixed(2)}`);

// --- Capstone number/kiss sane. ---
function numWin(cha, comp, mom, fit) { const d = 1 + Math.floor(Math.random() * 20); return d !== 1 && (d === 20 || d + cha + Math.floor(comp / 8) + mom + fit >= T.numberDC); }
function kissWin(cha, rom, atr, mom) { const d = 1 + Math.floor(Math.random() * 20); return d !== 1 && (d === 20 || d + cha + Math.floor(rom / 8) + Math.floor(atr / 10) + mom >= T.kissDC); }
const numReady = rate(() => numWin(8, 25, 2, 2), M);
const kissReady = rate(() => kissWin(10, 60, 50, 3), M);
const kissCold = rate(() => kissWin(3, 36, 10, -1), M); // just past the gate, weak build = coin-flip
check(numReady > 0.6, `number ready ${numReady.toFixed(2)}`);
check(kissReady > 0.75, `kiss ready ${kissReady.toFixed(2)}`);
check(kissCold < 0.55, `kiss cold ${kissCold.toFixed(2)}`);

// --- Date math: a trait-aligned run beats a misaligned one. ---
function dateQ(c, picks) {
  let score = 0, mag = 0;
  for (const p of picks) { score += (c.traitAffinity[p.trait] || 0) * p.mag; mag += p.mag; }
  return mag ? score / mag : 0;
}
const aiko = D.CHARACTERS.aiko;
const sincerePicks = [{ trait: "sincere", mag: 3 }, { trait: "sincere", mag: 3 }, { trait: "generous", mag: 3 }];
const brashPicks = [{ trait: "adventurous", mag: 3 }, { trait: "adventurous", mag: 3 }, { trait: "generous", mag: 3 }];
check(dateQ(aiko, sincerePicks) > 1, "aiko sincere date should score high");
check(dateQ(aiko, brashPicks) < dateQ(aiko, sincerePicks), "aiko prefers sincere over adventurous");
const romGood = Math.round(T.dateRomance + dateQ(aiko, sincerePicks) * 4);
check(romGood > T.dateRomance, "a great date should out-gain a flat one");

// --- Economy still solvent without the phone gate. ---
check(D.LOCATIONS.cafe.work.wage > T.dailyAllowance, "a shift should beat passive allowance");

console.log("Backgrounds:", Object.keys(D.BACKGROUNDS).join(", "));
console.log("Locations:", Object.keys(D.LOCATIONS).join(", "), "| date spots:", Object.keys(D.DATE_SCENES).join(","));
console.log("Bars:", D.BARS.join(", "));
console.log("Stat-gain mean:", mean.toFixed(2), "| zero", (zero / N * 100 | 0) + "%", "| big", (big / N * 100 | 0) + "%");
console.log("Beat tiers/8000:", JSON.stringify(tc));
console.log(`Move win — hot ${moveHot.toFixed(2)} / cold ${moveCold.toFixed(2)}`);
console.log(`Capstone — number ${numReady.toFixed(2)}, kiss ready ${kissReady.toFixed(2)}, kiss cold ${kissCold.toFixed(2)}`);
console.log(`Date Q — aiko sincere ${dateQ(aiko, sincerePicks).toFixed(2)} vs adventurous ${dateQ(aiko, brashPicks).toFixed(2)}`);

if (errors.length) { console.error("\nFAIL:"); errors.forEach((e) => console.error("  " + e)); process.exit(1); }
console.log("\nSMOKE TEST PASSED");
