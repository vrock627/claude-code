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

// --- STATIONS (non-gun; cannons are manned individually now) ---
const STATION_KEYS = new Set(D.STATIONS.map((s) => s.key));
for (const want of ["sails", "helm", "pumps"]) check(STATION_KEYS.has(want), `station ${want} missing`);
check(!STATION_KEYS.has("guns"), "'guns' should no longer be a station (cannons are per-gun manned)");
for (const st of D.STATIONS) check(SKILL.has(st.skill), `station ${st.key}: skill ${st.skill} unknown`);

// --- TRAITS (quirks) / CAPTAIN / WEAPONS ---
const EFFECT_FIELDS = new Set(["skillAffinity", "board", "acc", "maxHp", "misfire", "xpMult",
  "healPerLeg", "repairMult", "areaResist", "stormImmune", "ambushDodge", "scout", "loy",
  "moraleAura", "mutinyResist", "rumLove", "lootMult", "demandsShares", "moraleWinBonus",
  "quietLegMorale", "cowardly"]);
for (const k of Object.keys(D.TRAITS)) {
  const t = D.TRAITS[k];
  check(t.key === k && t.label && t.blurb, `trait ${k}: missing meta`);
  check(t.effects && typeof t.effects === "object", `trait ${k}: needs an effects block`);
  check(Object.keys(t.effects).length >= 1, `trait ${k}: needs at least one effect`);
  for (const f of Object.keys(t.effects || {})) check(EFFECT_FIELDS.has(f), `trait ${k}: unknown effect field ${f}`);
  for (const mk of Object.keys((t.effects || {}).skillAffinity || {})) check(SKILL.has(mk), `trait ${k}: skillAffinity targets unknown skill ${mk}`);
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

// --- FACTIONS ---
const FACTION_KEYS = new Set(Object.keys(D.FACTIONS));
for (const f of ["navy", "merchants", "brethren"]) check(FACTION_KEYS.has(f), `faction ${f} missing`);
for (const k of Object.keys(D.FACTIONS)) check(D.FACTIONS[k].key === k && D.FACTIONS[k].label, `faction ${k}: bad meta`);
for (const k of Object.keys(D.ENEMIES)) check(!D.ENEMIES[k].faction || FACTION_KEYS.has(D.ENEMIES[k].faction), `enemy ${k}: unknown faction`);

// --- EVENTS: exercise every cond/req/effect against a mock run + helper API ---
function mockRun() {
  return {
    gold: 100, supplies: 10, notoriety: 0, morale: 65, areas: { hull: 100, masts: 100, rudder: 100, guns: 100, deck: 100 },
    // crew carry quirk `traits` arrays so cond gates (drunkard/greedy…) can pass.
    crew: [{ traits: ["drunkard"], skills: {} }, { traits: ["greedy", "sealegs"], skills: {} }, { traits: ["loyal", "sawbones"], skills: { medicine: 4 } }],
    rep: { navy: 0, merchants: 0, brethren: 0 }, flags: {}, quests: [], questsDone: [],
  };
}
const mockH = {
  has: () => true, skillAtLeast: () => true, gold: () => {}, supplies: () => {}, rep: () => {}, morale: () => {}, notor: () => {},
  damage: () => {}, repair: () => {}, flag: () => {}, hasFlag: () => false,
  addQuest: () => {}, addCrew: () => "New Hand", loseCrew: () => "Old Hand",
};
for (const k of Object.keys(D.EVENTS)) {
  const ev = D.EVENTS[k];
  check(ev.id === k && ev.title && ev.text, `event ${k}: missing meta`);
  check(Array.isArray(ev.options) && ev.options.length, `event ${k}: needs options`);
  if (ev.cond) { check(typeof ev.cond === "function", `event ${k}: cond must be a function`); try { ev.cond(mockRun()); } catch (e) { check(false, `event ${k}: cond threw ${e.message}`); } }
  for (let i = 0; i < ev.options.length; i++) {
    const o = ev.options[i];
    check(o.label, `event ${k} opt ${i}: no label`);
    check(typeof o.effect === "function", `event ${k} opt ${i}: effect must be a function`);
    if (o.req) { check(typeof o.req === "function", `event ${k} opt ${i}: req must be a function`); try { o.req(mockRun(), mockH); } catch (e) { check(false, `event ${k} opt ${i}: req threw ${e.message}`); } }
    try {
      const res = o.effect(mockRun(), mockH);
      check(res && Array.isArray(res.lines) && res.lines.length, `event ${k} opt ${i}: effect must return {lines:[…]}`);
      if (res.battle) check(D.ENEMIES[res.battle], `event ${k} opt ${i}: effect starts unknown battle ${res.battle}`);
    } catch (e) { check(false, `event ${k} opt ${i}: effect threw ${e.message}`); }
  }
}

// --- QUESTS ---
for (const k of Object.keys(D.QUESTS)) {
  const q = D.QUESTS[k];
  check(q.id === k && q.title && q.log, `quest ${k}: missing meta`);
  check(["bounty", "delivery", "treasure"].includes(q.type), `quest ${k}: bad type ${q.type}`);
  check(FACTION_KEYS.has(q.faction), `quest ${k}: unknown faction ${q.faction}`);
  check(q.reward && typeof q.reward.gold === "number", `quest ${k}: reward.gold required`);
  for (const f in (q.reward.rep || {})) check(FACTION_KEYS.has(f), `quest ${k}: reward rep unknown faction ${f}`);
  for (const f in (q.reqRep || {})) check(FACTION_KEYS.has(f), `quest ${k}: reqRep unknown faction ${f}`);
  if (q.type === "bounty") check(D.ENEMIES[q.targetEnemy], `quest ${k}: unknown targetEnemy ${q.targetEnemy}`);
  if (q.type === "delivery") check(typeof q.targetPort === "string", `quest ${k}: targetPort required`);
  if (q.type === "treasure") check(typeof q.targetNode === "number", `quest ${k}: targetNode required`);
}
for (const id of D.PORT_QUESTS) check(D.QUESTS[id], `PORT_QUESTS references unknown quest ${id}`);

// --- RANKS (skill tiers) ---
check(Array.isArray(D.RANKS) && D.RANKS.length >= 2, "need at least 2 ranks");
check(D.RANKS[0].min === 0, "lowest rank must start at 0");
for (let i = 1; i < D.RANKS.length; i++) check(D.RANKS[i].min > D.RANKS[i - 1].min, "ranks must be in ascending order");
for (const rk of D.RANKS) check(rk.label && rk.tag, "rank missing label/tag");
// rankOf mirror: value → highest rank whose min it meets.
function rankOf(v) { let r = D.RANKS[0]; for (const rk of D.RANKS) if (v >= rk.min) r = rk; return r; }
check(rankOf(0) === D.RANKS[0], "rankOf(0) must be the lowest rank");
check(rankOf(D.TUNING.skillMax) === D.RANKS[D.RANKS.length - 1], "rankOf(skillMax) must be the top rank");

// --- OFFICER_ROLES ---
const TRAIT_KEYS = new Set(Object.keys(D.TRAITS));
for (const k of Object.keys(D.OFFICER_ROLES)) {
  const o = D.OFFICER_ROLES[k];
  check(o.key === k && o.label && o.blurb, `officer ${k}: missing meta`);
  check(SKILL.has(o.skill), `officer ${k}: scaling skill ${o.skill} unknown`);
  // has at least one numeric effect field beyond key/label/skill/blurb
  const fx = Object.keys(o).filter((f) => !["key", "label", "skill", "blurb"].includes(f) && typeof o[f] === "number");
  check(fx.length >= 1, `officer ${k}: needs at least one numeric effect`);
}
// officerFactor rises with the appointee's skill (mirror of game.js).
const offFactor = (sk) => Math.max(D.TUNING.officerFloor, Math.min(1, D.TUNING.officerFloor + (1 - D.TUNING.officerFloor) * (sk / D.TUNING.officerRefSkill)));
check(offFactor(0) === D.TUNING.officerFloor, "a green officer gives the floor effect");
check(offFactor(D.TUNING.officerRefSkill) === 1, "a master officer gives full effect");
check(offFactor(5) > offFactor(1), "officer effect must rise with skill");

// --- crew-depth math sanity ---
const Tu = D.TUNING;
// gainSkill caps at skillMax and increases
const gain = (v, amt) => Math.min(Tu.skillMax, v + amt);
check(gain(0, 0.5) === 0.5, "gainSkill should increase skill");
check(gain(Tu.skillMax, 1) === Tu.skillMax, "gainSkill must cap at skillMax");
// healing is positive and helped by medicine
const heal = (med, mult) => (Tu.healBase + med * Tu.healPerMedicine) * mult;
check(heal(0, 1) > 0, "wounded must heal even with no medic");
check(heal(5, 1) > heal(0, 1), "medicine must speed healing");
// morale bounds + mutiny threshold sane
check(Tu.startMorale > 0 && Tu.startMorale <= Tu.moraleMax, "startMorale within (0, moraleMax]");
check(Tu.mutinyThreshold > 0 && Tu.mutinyThreshold < Tu.startMorale, "mutiny threshold below starting morale");
check(Tu.mutinyChancePerPoint > 0 && Tu.mutinyChancePerPoint < 1, "mutiny chance per point in (0,1)");
// drunkard flavour used by the rum ration
check(D.TRAITS.drunkard && D.TRAITS.drunkard.effects.rumLove, "drunkard should love a rum ration");

// --- TUNING presence ---
const TUNE_KEYS = ["startGold", "startSupplies", "startCrew", "supplyPerLeg", "arenaW", "arenaH",
  "windMinFactor", "windMaxFactor", "accel", "drag", "reloadBase", "gunArcDeg", "accuracyBase",
  "accuracyRangeFalloff", "accuracyMotionPenalty", "areaMax", "floodGain", "pumpRate", "floodSink",
  "grappleRange", "boardTickSec", "boardLethality", "meleeBase", "enemyHullSurrender", "enemyCrewSurrender", "sinkGoldMult",
  "gunnerReloadK", "gunnerAccK", "gunneryXpPerFire", "skillMax", "eventChance", "repPriceSwing",
  "xpSailPerSec", "xpRepairPerSec", "xpMeleePerBoardTick", "xpMedicinePerHeal", "xpNavPerLeg", "xpRepairPerPortFix",
  "woundGrape", "woundBoardScale", "healBase", "healPerMedicine", "infirmaryCostPerHp",
  "startMorale", "moraleMax", "moraleWin", "moraleCapture", "moraleTreasure", "moraleLoss", "moraleLostHand",
  "moraleStarve", "moraleOverwork", "overworkGraceLegs", "rumRationSupplies", "rumRationMorale",
  "sharePerCrew", "shareMorale", "loyaltyStart", "mutinyThreshold", "mutinyChancePerPoint",
  "officerRefSkill", "officerFloor", "greedyMutinyBump", "greedyStaleLegs", "scoutHops"];
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

// per-cannon reload: driven by the gunner's gunnery skill; a skilled gunner
// reloads faster, an unmanned gun (skill treated as "no gunner") never fires.
const cannonReload = (skill) => T.reloadBase / (0.6 + T.gunnerReloadK * skill);
check(cannonReload(0) > cannonReload(5), "a more-skilled gunner must reload faster");
check(cannonReload(5) > 0, "reload time must stay positive");
check(T.gunnerReloadK > 0, "gunnery skill must matter to reload");
// per-cannon accuracy rises with gunnery skill and stays in a sane band
const acc = (skill) => Math.max(0.05, Math.min(0.96, T.accuracyBase * (1 + T.gunnerAccK * skill)));
check(acc(5) > acc(0), "a more-skilled gunner must aim better");
check(acc(9) <= 0.96 && acc(0) >= 0.05, "accuracy must stay within 0.05..0.96");
// operational cannons per side scale with the gun-deck condition (0 → none)
const opsPerSide = (guns, perSide) => Math.max(0, Math.ceil(perSide * guns / T.areaMax));
check(opsPerSide(0, 5) === 0, "a destroyed gun-deck fires no cannons");
check(opsPerSide(T.areaMax, 5) === 5, "an intact gun-deck fields every cannon");

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
  Object.keys(D.ENEMIES).length + " enemies, " +
  Object.keys(D.FACTIONS).length + " factions, " +
  Object.keys(D.EVENTS).length + " events, " +
  Object.keys(D.QUESTS).length + " quests, " +
  Object.keys(D.OFFICER_ROLES).length + " officer roles, " +
  D.RANKS.length + " ranks; all TUNING + battle/crew/event/quest invariants hold.");
