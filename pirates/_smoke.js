// Headless validation for Black Tide data + core battle math. Not shipped.
// Run: node pirates/_smoke.js
const fs = require("fs"), path = require("path"), vm = require("vm");

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, "data.js"), "utf8"), sandbox);
const D = sandbox.window.PIRATEDATA;

const errors = [];
const check = (c, m) => { if (!c) errors.push(m); };

check(D, "PIRATEDATA missing");
const AREA_KEYS = new Set(D.AREAS.map((a) => a.key));
const SKILL = new Set(D.SKILLS);

// --- AREAS ---
check(D.AREAS.length >= 4, "need at least 4 ship areas");
check(AREA_KEYS.has("hull"), "hull area required (flooding/sink hinges on it)");
for (const a of D.AREAS) check(a.key && a.label && a.effect, `area ${a.key}: missing meta`);

// --- SHOT TYPES ---
for (const k of Object.keys(D.SHOT_TYPES)) {
  const s = D.SHOT_TYPES[k];
  check(s.key === k, `shot ${k}: key mismatch`);
  check(typeof s.base === "number" && s.base > 0, `shot ${k}: base must be > 0`);
  check(typeof s.casualty === "number" && s.casualty >= 0, `shot ${k}: casualty must be >= 0`);
  for (const area of Object.keys(s.bias || {})) check(AREA_KEYS.has(area), `shot ${k}: bias targets unknown area ${area}`);
}
check(Object.keys(D.SHOT_TYPES.round.bias).includes("hull"), "round-shot should favor hull");
check(Object.keys(D.SHOT_TYPES.chain.bias).includes("masts"), "chain-shot should favor masts");
check(Object.keys(D.SHOT_TYPES.grape.bias).includes("deck"), "grape-shot should favor deck");

// --- SHIP CLASSES ---
for (const k of Object.keys(D.SHIP_CLASSES)) {
  const sc = D.SHIP_CLASSES[k];
  check(sc.key === k, `ship ${k}: key mismatch`);
  for (const f of ["maxSpeed", "turnRate", "gunsPerSide", "crewCap", "crewIdeal", "gunRange", "length", "beam"])
    check(typeof sc[f] === "number" && sc[f] > 0, `ship ${k}: ${f} must be a positive number`);
  check(sc.crewIdeal * D.STATIONS.length <= sc.crewCap + D.STATIONS.length, `ship ${k}: crewIdeal vs cap sanity`);
}

// --- STATIONS ---
const STATION_KEYS = new Set(D.STATIONS.map((s) => s.key));
for (const want of ["guns", "sails", "helm", "pumps"]) check(STATION_KEYS.has(want), `station ${want} missing`);

// --- TRAITS / CAPTAIN / WEAPONS ---
for (const k of Object.keys(D.TRAITS)) {
  const t = D.TRAITS[k];
  check(t.key === k && t.label && t.blurb, `trait ${k}: missing meta`);
  for (const mk of Object.keys(t.mods || {})) check(SKILL.has(mk), `trait ${k}: mod targets unknown skill ${mk}`);
}
for (const k of Object.keys(D.CAPTAIN_TRAITS)) {
  const ct = D.CAPTAIN_TRAITS[k];
  check(ct.key === k && ct.label && ct.perk, `captain ${k}: missing meta`);
  const perkKeys = Object.keys(ct.perk);
  check(perkKeys.length === 1, `captain ${k}: expected exactly one perk`);
  check(["reloadMult", "speedMult", "meleeMult"].includes(perkKeys[0]), `captain ${k}: unknown perk ${perkKeys[0]}`);
}
for (const k of Object.keys(D.WEAPONS)) {
  const w = D.WEAPONS[k];
  check(w.key === k && w.label, `weapon ${k}: missing meta`);
  check(typeof w.melee === "number" && w.melee >= 0, `weapon ${k}: melee must be >= 0`);
  check(typeof w.cost === "number" && w.cost >= 0, `weapon ${k}: cost must be >= 0`);
}
check(D.WEAPONS.fists, "fists (default weapon) must exist");
for (const wk of D.PORT.weaponStock) check(D.WEAPONS[wk], `port stocks unknown weapon ${wk}`);

// --- ENEMIES ---
for (const k of Object.keys(D.ENEMIES)) {
  const e = D.ENEMIES[k];
  check(D.SHIP_CLASSES[e.shipClass], `enemy ${k}: unknown shipClass ${e.shipClass}`);
  for (const f of ["crew", "gunnery", "aggression", "gold", "supplies"])
    check(typeof e[f] === "number", `enemy ${k}: ${f} must be a number`);
  check(e.aggression >= 0 && e.aggression <= 1, `enemy ${k}: aggression must be 0..1`);
}

// --- TUNING presence ---
const TUNE_KEYS = ["startGold", "startSupplies", "startCrew", "supplyPerLeg", "arenaW", "arenaH",
  "windMinFactor", "windMaxFactor", "accel", "drag", "reloadBase", "gunArcDeg", "accuracyBase",
  "accuracyRangeFalloff", "accuracyMotionPenalty", "areaMax", "floodGain", "pumpRate", "floodSink",
  "grappleRange", "boardTickSec", "boardLethality", "meleeBase", "enemyHullSurrender", "enemyCrewSurrender", "sinkGoldMult"];
for (const k of TUNE_KEYS) check(typeof D.TUNING[k] === "number", `TUNING.${k} missing/not a number`);
const T = D.TUNING;
check(T.windMinFactor < T.windMaxFactor, "windMinFactor must be < windMaxFactor");
check(T.windMinFactor > 0, "windMinFactor must be > 0 (always some way to move)");
check(T.gunArcDeg > 0 && T.gunArcDeg < 90, "gunArcDeg must be a sane half-arc (0..90)");
check(T.accuracyBase > 0 && T.accuracyBase < 1, "accuracyBase must be 0..1");
check(T.floodSink > 0, "floodSink must be > 0");

// --- Derived battle-math sanity (mirror engine formulas) ---
function windFactor(headingMinusWind) {
  const c = Math.cos(headingMinusWind);
  return (T.windMinFactor + (T.windMaxFactor - T.windMinFactor) * (c + 1) / 2) * T.windStrength;
}
check(Math.abs(windFactor(0) - T.windMaxFactor * T.windStrength) < 1e-9, "running before the wind should give max factor");
check(Math.abs(windFactor(Math.PI) - T.windMinFactor * T.windStrength) < 1e-9, "dead into the wind should give min factor");

// reload time is positive and rewards more gun crew (effectiveness 0..1.5)
const reload = (eff) => T.reloadBase / (0.5 + eff);
check(reload(0) > reload(1.5), "more gun crew must reload faster");
check(reload(1.5) > 0, "reload time must stay positive");

// flooding: a healthy hull never floods; a holed hull floods without pumps
check((T.areaMax - T.areaMax) * T.floodGain === 0, "pristine hull must not flood");
check((T.areaMax - 0) * T.floodGain > 0, "a destroyed hull must take on water");

// full pumps must be able to out-pace a moderate breach (half hull gone)
check(T.pumpRate > (T.areaMax * 0.5) * T.floodGain, "full pumps should beat a half-hull breach");

// retire goal must be reachable above starting gold
check(D.PORT.retireGold > T.startGold, "retire goal should exceed starting gold");

// --- report ---
if (errors.length) {
  console.error("SMOKE FAILED (" + errors.length + "):");
  for (const e of errors) console.error("  ✗ " + e);
  process.exit(1);
}
console.log("Black Tide smoke OK — " +
  Object.keys(D.SHIP_CLASSES).length + " ships, " +
  Object.keys(D.SHOT_TYPES).length + " shot types, " +
  Object.keys(D.TRAITS).length + " traits, " +
  Object.keys(D.ENEMIES).length + " enemies, all TUNING + battle-math invariants hold.");
