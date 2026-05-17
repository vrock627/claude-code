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

const errors = [];
function check(cond, msg) {
  if (!cond) errors.push(msg);
}

check(D, "GAMEDATA not exposed");
const STAT_SET = new Set(D.STATS);

// Backgrounds reference valid stats and a sane point total.
for (const [id, bg] of Object.entries(D.BACKGROUNDS)) {
  const keys = Object.keys(bg.stats);
  check(keys.length === D.STATS.length, `${id}: stat count mismatch`);
  for (const k of keys) check(STAT_SET.has(k), `${id}: unknown stat ${k}`);
  const sum = Object.values(bg.stats).reduce((a, b) => a + b, 0);
  check(sum === 18, `${id}: stat sum ${sum} != 18`);
}

// Approaches reference valid stats.
for (const ap of D.APPROACHES) {
  check(STAT_SET.has(ap.stat), `approach ${ap.id}: bad stat ${ap.stat}`);
}

// Locations: action stat valid.
for (const [id, loc] of Object.entries(D.LOCATIONS)) {
  check(STAT_SET.has(loc.action.stat), `${id}: bad action stat`);
}

// Characters: liked stat valid, schedule points at real locations for every phase.
const APP_STYLES = new Set(D.APPROACHES.map((a) => a.style));
for (const [id, c] of Object.entries(D.CHARACTERS)) {
  check(STAT_SET.has(c.likedStat), `${id}: bad likedStat`);
  check(APP_STYLES.has(c.likedStyle), `${id}: likedStyle "${c.likedStyle}" matches no approach`);
  check(APP_STYLES.has(c.dislikedStyle), `${id}: dislikedStyle "${c.dislikedStyle}" matches no approach`);
  for (const ph of D.PHASES) {
    check(D.LOCATIONS[c.schedule[ph]], `${id}: schedule[${ph}] -> unknown location ${c.schedule[ph]}`);
  }
}

// Every character is reachable: appears at some location in some phase.
for (const id of Object.keys(D.CHARACTERS)) {
  const reachable = D.PHASES.some((ph) =>
    Object.keys(D.LOCATIONS).includes(D.CHARACTERS[id].schedule[ph])
  );
  check(reachable, `${id}: never appears anywhere`);
}

// Simulate 4000 interactions: ensure tiers fire, affection stays in range,
// and a "good fit" approach beats a "bad fit" one on average.
function rollTier(statVal, vibe, affection) {
  const T = D.TUNING;
  const d20 = 1 + Math.floor(Math.random() * 20);
  const total = d20 + statVal + vibe;
  const dc = Math.round(T.baseDC + affection * T.dcPerAffection);
  const margin = total - dc;
  if (d20 === 20 || margin >= 10) return "crit";
  if (margin >= 0) return "success";
  if (d20 === 1 || margin <= -8) return "fail";
  return "partial";
}
const tiers = { crit: 0, success: 0, partial: 0, fail: 0 };
const DELTA = { crit: 9, success: 5, partial: 1, fail: -3 };
// Sample across the realistic spread: weak->strong stats, all three vibe
// states, low->high affection (which raises DC). Every tier should be
// reachable *somewhere* in this space, even if a given build reliably wins.
for (let i = 0; i < 8000; i++) {
  const statVal = Math.floor(Math.random() * 13); // 0..12
  const vibe = [-D.TUNING.dislikedStylePenalty, 0, D.TUNING.likedStyleBonus][i % 3];
  const aff = Math.floor(Math.random() * (D.TUNING.affectionCap + 1));
  tiers[rollTier(statVal, vibe, aff)]++;
}
for (const k of Object.keys(tiers)) check(tiers[k] > 0, `tier "${k}" unreachable across 8000 mixed rolls`);

// At a fixed mid build, liking the approach must out-earn disliking it.
let goodFitGain = 0;
let badFitGain = 0;
for (let i = 0; i < 4000; i++) {
  goodFitGain += DELTA[rollTier(6, D.TUNING.likedStyleBonus, 30)];
  badFitGain += DELTA[rollTier(6, -D.TUNING.dislikedStylePenalty, 30)];
}
check(
  goodFitGain > badFitGain,
  `liked-style approach (${goodFitGain}) should beat disliked-style (${badFitGain})`
);

console.log("Backgrounds:", Object.keys(D.BACKGROUNDS).join(", "));
console.log("Locations:", Object.keys(D.LOCATIONS).join(", "));
console.log("Characters:", Object.keys(D.CHARACTERS).join(", "));
console.log("Tier distribution / 8000 mixed rolls:", JSON.stringify(tiers));
console.log(`Net affection @ mid build: liked-style ${goodFitGain} vs disliked-style ${badFitGain}`);

if (errors.length) {
  console.error("\nFAIL:");
  errors.forEach((e) => console.error("  " + e));
  process.exit(1);
}
console.log("\nSMOKE TEST PASSED");
