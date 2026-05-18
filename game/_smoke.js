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
const STYLE = new Set(D.SAYS.map((r) => r.style).concat([D.MOVE.style]));

check(D, "GAMEDATA missing");

// Backgrounds.
for (const [id, bg] of Object.entries(D.BACKGROUNDS)) {
  check(Object.keys(bg.stats).length === D.STATS.length, `${id}: stat count`);
  for (const k of Object.keys(bg.stats)) check(STAT.has(k), `${id}: bad stat ${k}`);
  const s = Object.values(bg.stats).reduce((a, b) => a + b, 0);
  check(s === 18, `${id}: stat sum ${s} != 18`);
}

// Player dialogue pool (SAYS) + MOVE.
for (const r of D.SAYS) {
  check(typeof r.say === "string" && r.say.length, `SAYS line missing text`);
  check(STAT.has(r.stat), `SAYS "${r.say}": bad stat`);
  check(BAR.has(r.bar), `SAYS "${r.say}": bad bar`);
  check(TRAIT.has(r.trait), `SAYS "${r.say}": bad trait`);
  check(STYLE.has(r.style), `SAYS "${r.say}": bad style`);
}
check(STAT.has(D.MOVE.stat) && BAR.has(D.MOVE.bar) && D.MOVE.say, "MOVE bad stat/bar/say");
check(D.SAYS.length >= 6, "need a healthy pool of lines to draw 3 from");
check(D.SAYS.some((s) => s.probe), "some lines should be reveal probes");

// Reaction lines: every mood, every tier (openers now live per-character).
for (const mood of ["cold", "neutral", "warm", "hot"]) {
  check(D.LINES[mood], `LINES missing mood ${mood}`);
  for (const k of ["crit", "success", "partial", "fail"])
    check(D.LINES[mood] && D.LINES[mood][k] && D.LINES[mood][k].length, `LINES[${mood}].${k} empty`);
}

// Items / shops. Phone must NOT exist (player starts with one).
check(!D.ITEMS.phone, "phone item should be removed (player starts with a phone)");
for (const [id, it] of Object.entries(D.ITEMS)) {
  check(it.price > 0, `item ${id}: price`);
  if (it.type === "tempStat") check(STAT.has(it.stat) && it.amount > 0 && it.phases > 0, `item ${id}: temp`);
  else if (it.type === "permStat") check(STAT.has(it.stat) && it.amount > 0, `item ${id}: perm`);
  else if (it.type === "gift") check(it.value > 0, `item ${id}: gift value`);
  else if (it.type === "consumable") check(it.desc, `item ${id}: consumable needs desc`);
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

// Bill is a map keyed by id. Need a full-tab and a cheap option.
let sawCheap = false, sawFull = false;
for (const [bid, b] of Object.entries(D.BILL)) {
  check(b.text, `BILL ${bid}: missing text`);
  check(b.costMul >= 0 && b.costMul <= 1, `BILL ${bid}: costMul out of range`);
  check(TRAIT.has(b.trait) && b.mag > 0, `BILL ${bid}: bad trait/mag`);
  if (b.cheap) sawCheap = true;
  if (b.costMul === 1) sawFull = true;
}
check(sawCheap, "BILL needs a 'cheap' (let-her-pay) option");
check(sawFull, "BILL needs a full-tab option");

// Date scenes: reachable venue (dateSpot or home), a numeric dateCost
// (0 = free, allowed), intro + beats, and any bill must reference real
// BILL ids.
for (const [loc, sc] of Object.entries(D.DATE_SCENES)) {
  const L = D.LOCATIONS[loc];
  check(L && (L.dateSpot || L.home), `DATE_SCENE ${loc} not a dateSpot/home`);
  check(L && typeof L.dateCost === "number" && L.dateCost >= 0, `DATE_SCENE ${loc}: bad dateCost`);
  check(sc.intro && sc.beats.length >= 2, `DATE_SCENE ${loc}: needs intro + >=2 beats`);
  for (const b of sc.beats) {
    check(b.opts.length >= 2, `DATE_SCENE ${loc}: beat needs options`);
    for (const o of b.opts) check(TRAIT.has(o.trait) && o.mag > 0, `DATE_SCENE ${loc}: opt "${o.text}" bad trait/mag`);
  }
  if (sc.bill) {
    check(Array.isArray(sc.bill.options) && sc.bill.options.length, `DATE_SCENE ${loc}: empty bill.options`);
    for (const bid of sc.bill.options) check(D.BILL[bid], `DATE_SCENE ${loc}: bill option "${bid}" not in BILL`);
    check(L.dateCost > 0, `DATE_SCENE ${loc}: has a bill but $0 cost`);
  } else {
    check(L.dateCost === 0, `DATE_SCENE ${loc}: no bill but nonzero cost ($${L.dateCost})`);
  }
}
check(!D.DATE_SCENES.home, "home is now the deep HOME tree, not a DATE_SCENE");
check(D.DATE_SCENES.restaurant && D.DATE_SCENES.restaurant.bill, "restaurant should have a bill");
check(D.DATE_SCENES.park && !D.DATE_SCENES.park.bill, "park should be free (no bill)");

// Deep home date: rooms → nested actions, gates, rolls, swim contextual.
check(D.HOME && D.HOME.intro.includes("{n}"), "HOME.intro must address her ({n})");
check(D.HOME.bedroomGate && D.HOME.bedroomGate.inti > 0 && D.HOME.bedroomGate.rom > 0, "HOME.bedroomGate must be meaningful");
const roomKeys = D.HOME.rooms.map((r) => r.key);
for (const need of ["living", "kitchen", "yard", "bedroom"]) check(roomKeys.includes(need), `HOME missing room ${need}`);
let sawChance = false, sawRoll = false, sawHard = false, sawKissFx = false, sawSex = false, sawInto = false, maxDepth = 0;
(function walk(nodes, depth) {
  maxDepth = Math.max(maxDepth, depth);
  for (const n of nodes) {
    check(n.rooms || n.back || n.label, "HOME node needs a label/nav");
    if (n.gate) check(n.gate.inti > 0 || n.gate.rom > 0 || n.gate.lib > 0, `HOME gate empty: ${n.label}`);
    if (n.chance) sawChance = true;
    if (n.sub) { check(n.sub.length >= 2, `HOME sub too small: ${n.label}`); if (n.roll) sawInto = true; walk(n.sub, depth + 1); }
    if (n.roll) {
      sawRoll = true;
      check(n.roll.dc > 0 && n.roll.win && n.roll.lose, `HOME roll malformed: ${n.label}`);
      if (n.roll.win.sex) sawSex = true;
      else check(n.roll.win.lines && n.roll.win.lines.length, `HOME roll win no lines: ${n.label}`);
      check(n.roll.lose.hard || (n.roll.lose.lines && n.roll.lose.lines.length), `HOME roll lose no lines: ${n.label}`);
      if (n.roll.lose.hard) sawHard = true;
      if (n.roll.win.kiss || (n.roll.win.fx && n.roll.win.fx.kiss)) sawKissFx = true;
    }
    if (n.fx) check(typeof n.fx === "object", `HOME fx bad: ${n.label}`);
    if (!n.sub && !n.roll && !n.chance && !n.rooms && !n.back) check(n.lines && n.lines.length, `HOME terminal no lines: ${n.label}`);
  }
})(D.HOME.rooms.flatMap((r) => r.actions), 0);
check(sawChance, "HOME needs the contextual (hot-tub/swim) check");
check(sawRoll && sawHard && sawKissFx, "HOME needs rolls incl. a hard-fail and a kiss payoff");
check(maxDepth >= 3, `HOME needs deep nesting (couch→undress→shirt→bra); got depth ${maxDepth}`);
check(sawInto, "HOME needs roll-into-submenu nodes (undress chain)");
check(sawSex, "HOME needs a node routing to the sex/condom choice");
const sx = D.HOME.sex;
check(sx && sx.ask && sx.condom && sx.raw && sx.back, "HOME.sex needs ask/condom/raw/back");
check(sx.condom.fx && sx.condom.lines.length, "HOME.sex.condom malformed");
check(sx.raw.dc > 0 && sx.raw.win.fx && sx.raw.lose.hard, "HOME.sex.raw needs dc, win.fx, hard lose");
check(sx.back.lines && sx.back.lines.length, "HOME.sex.back needs lines");
check(D.ITEMS.condom && D.ITEMS.condom.type === "consumable", "condom item missing/typed wrong");
check(D.SHOPS.mall.includes("condom"), "condoms should be buyable (mall)");
check(D.HOME.swim && D.HOME.swim.hasSuit && D.HOME.swim.noSuit.length >= 3, "HOME.swim needs has-suit + 3 no-suit options");
check(D.HOME.swim.noSuit.some((o) => o.roll && o.roll.lose.hard), "skinny-dip should carry a real risk");
check(D.HOME.rooms.every((r) => r.actions.some((a) => a.rooms)), "every room needs a 'go somewhere else'");
// Hot tub is now a real series: entry → inTub → getOut, with attire set.
check(D.HOME.swim.hasSuit.swimNext === "inTub", "hot tub: suit entry must route into the series");
check(Array.isArray(D.HOME.swim.inTub) && D.HOME.swim.inTub.length >= 3, "hot tub needs an inTub series");
check(Array.isArray(D.HOME.swim.getOut) && D.HOME.swim.getOut.length >= 2, "hot tub needs a getOut series");
check(D.HOME.swim.inTub.some((n) => n.goOut) || D.HOME.swim.inTub.some((n) => n.sub), "inTub must lead somewhere (goOut/sub)");
check(D.HOME.swim.getOut.some((n) => (n.fx && n.fx.attire) || (n.roll && n.roll.win.fx && n.roll.win.fx.attire)), "getOut must set her attire");
let swimSawSex = false;
(function walkSwim(nodes) {
  for (const n of nodes || []) {
    if (n.roll && n.roll.win && n.roll.win.sex) swimSawSex = true;
    if (n.sub) walkSwim(n.sub);
  }
})([].concat(D.HOME.swim.noSuit, D.HOME.swim.inTub, D.HOME.swim.getOut));
check(swimSawSex, "hot tub should be able to lead all the way");

// Scenic overlook: nested like HOME, own sex block, photoshoot branches.
check(D.OVERLOOK && D.OVERLOOK.intro.includes("{n}"), "OVERLOOK.intro must address her ({n})");
const ovRoomKeys = D.OVERLOOK.rooms.map((r) => r.key);
for (const need of ["view", "car"]) check(ovRoomKeys.includes(need), `OVERLOOK missing room ${need}`);
let ovDepth = 0, ovSex = false, ovKiss = false, ovHard = false;
(function walkOv(nodes, depth) {
  ovDepth = Math.max(ovDepth, depth);
  for (const n of nodes) {
    check(n.rooms || n.back || n.label, "OVERLOOK node needs a label/nav");
    if (n.gate) check(n.gate.inti > 0 || n.gate.rom > 0 || n.gate.lib > 0, `OVERLOOK gate empty: ${n.label}`);
    if (n.sub) { check(n.sub.length >= 2, `OVERLOOK sub too small: ${n.label}`); walkOv(n.sub, depth + 1); }
    if (n.roll) {
      check(n.roll.dc > 0 && n.roll.win && n.roll.lose, `OVERLOOK roll malformed: ${n.label}`);
      if (n.roll.win.sex) ovSex = true; else check(n.roll.win.lines && n.roll.win.lines.length, `OVERLOOK roll win no lines: ${n.label}`);
      check(n.roll.lose.hard || (n.roll.lose.lines && n.roll.lose.lines.length), `OVERLOOK roll lose no lines: ${n.label}`);
      if (n.roll.lose.hard) ovHard = true;
      if (n.roll.win.kiss || (n.roll.win.fx && n.roll.win.fx.kiss)) ovKiss = true;
    }
    if (!n.sub && !n.roll && !n.rooms && !n.back) check(n.lines && n.lines.length, `OVERLOOK terminal no lines: ${n.label}`);
  }
})(D.OVERLOOK.rooms.flatMap((r) => r.actions), 0);
check(ovDepth >= 3, `OVERLOOK needs deep nesting (photoshoot → tier → action); got ${ovDepth}`);
check(ovSex && ovKiss && ovHard, "OVERLOOK needs a sex route, a kiss payoff, and a hard fail");
const osx = D.OVERLOOK.sex;
check(osx && osx.ask && osx.condom && osx.raw && osx.back, "OVERLOOK.sex needs ask/condom/raw/back");
check(osx.condom.fx && osx.condom.lines.length && osx.raw.dc > 0 && osx.raw.win.fx && osx.raw.lose.hard, "OVERLOOK.sex malformed");
check(D.OVERLOOK.rooms.every((r) => r.actions.some((a) => a.rooms)), "every overlook room needs a nav out");
check(D.OVERLOOK.rooms.some((r) => r.actions.some((a) => /picture/i.test(a.label))), "overlook needs the take-a-picture branch");
const ovLoc = D.LOCATIONS.overlook;
check(ovLoc && ovLoc.overlookSpot && typeof ovLoc.dateCost === "number", "overlook LOCATION needs overlookSpot + dateCost");
check(!ovLoc.dateSpot, "overlook must NOT be a DATE_SCENES dateSpot (it's the nested tree)");

// Party rooms, male NPCs, strip dares, body shots, room hookups.
check(Array.isArray(D.PARTY.rooms) && D.PARTY.rooms.length >= 3, "PARTY needs rooms");
check(D.PARTY.rooms[0].key === "main", "first party room should be 'main'");
for (const r of D.PARTY.rooms) check(r.key && r.name && r.desc, `party room shape: ${r.key}`);
check(D.PARTY.rooms.some((r) => r.gateFlow >= 1), "some party room should gate on flow");
check(Array.isArray(D.PARTY.npcs) && D.PARTY.npcs.length >= 2, "PARTY.npcs needed");
check(Array.isArray(D.PARTY.npcBeats) && D.PARTY.npcBeats.every((b) => b.includes("{n}") && b.includes("{g}")), "npcBeats need {n} and {g}");
check(T.npcFlirt && T.npcFlirt.cutIn && T.npcFlirt.stayCool && T.npcFlirt.sulk && T.npcFlirt.letHer, "TUNING.npcFlirt incomplete");
check(Array.isArray(D.PARTY.stripDares) && D.PARTY.stripDares.length, "PARTY.stripDares missing");
check(D.PARTY.strip && D.PARTY.strip.you.ok && D.PARTY.strip.you.shy && D.PARTY.strip.her.win && D.PARTY.strip.her.lose, "PARTY.strip malformed");
check(D.PARTY.strip.her.win.includes("{n}") && D.PARTY.strip.her.lose.includes("{n}"), "strip.her lines need {n}");
check(T.stripDare && T.stripDare.romance > 0 && T.stripFail, "TUNING.stripDare/stripFail missing");
check(D.PARTY.bodyShot && D.PARTY.bodyShot.ask && D.PARTY.bodyShot.who.you && D.PARTY.bodyShot.who.her && D.PARTY.bodyShot.win && D.PARTY.bodyShot.lose, "PARTY.bodyShot malformed");
check(T.bodyShot && T.bodyShot.dc > 0 && T.bodyShot.romance > 0, "TUNING.bodyShot missing");
check(D.PARTY.hookup && D.PARTY.hookup.ask && D.PARTY.hookup.esc.length >= 2 && D.PARTY.hookup.win.length, "PARTY.hookup malformed");
for (const e of D.PARTY.hookup.esc) check(e.label && typeof e.mod === "number" && e.line, `hookup esc malformed: ${e.label}`);
check(typeof D.PARTY.tdRounds === "number" && D.PARTY.tdRounds >= 6, "PARTY.tdRounds should be a full 6-round game");
check(D.PARTY.makeDares && Array.isArray(D.PARTY.makeDares.plain) && D.PARTY.makeDares.plain.length && Array.isArray(D.PARTY.makeDares.spicy) && D.PARTY.makeDares.spicy.length, "PARTY.makeDares (player-issued) missing/empty");
check(D.PARTY.makeDares.spicy.some((d) => /cloth|layer/i.test(d)), "makeDares should include a strip option");
check(D.PARTY.floorSex && D.PARTY.floorSex.ask && Array.isArray(D.PARTY.floorSex.win) && D.PARTY.floorSex.win.length && D.PARTY.floorSex.headOut, "PARTY.floorSex malformed");
// Undress tree: flat, state-tagged steps so removed/irrelevant garments
// and the whole branch (when bare) stop being offered.
(function () {
  let begin = null;
  (function find(nodes) { for (const n of nodes || []) { if (n.ustep === "begin") begin = n; if (n.sub) find(n.sub); if (n.actions) find(n.actions); } })(D.HOME.rooms);
  check(begin && begin.sub, "HOME undress: a ustep:'begin' node with steps");
  const steps = begin.sub.map((s) => s.ustep).filter(Boolean);
  for (const need of ["shirt", "bra", "pants", "rest"]) check(steps.includes(need), `undress missing ustep ${need}`);
  check(begin.sub.some((s) => s.rooms), "undress chain must offer 'go somewhere else' (stop, don't just back up)");
  check(begin.sub.some((s) => s.back), "undress chain must offer a stop/back");
  const rest = begin.sub.find((s) => s.ustep === "rest");
  check(rest && rest.roll && rest.roll.win && rest.roll.win.sex, "undress 'rest' must route to the sex beat");
})();
check(D.PARTY.flows[D.PARTY.flows.length - 1].at <= 4, "party flow should escalate sooner (top tier at <= 4)");
check(typeof T.partySpicyAt === "number" && T.partySpicyAt >= 1, "TUNING.partySpicyAt missing");
check(typeof T.partyDrinkFlow === "number" && T.partyDrinkFlow >= 1, "TUNING.partyDrinkFlow missing");

// Party hookups now get the same protection + finish choice as home.
const PP = D.INTIMACY.party;
check(PP && PP.ask && PP.condom && PP.condom.lines.length && PP.raw && PP.raw.lines.length && PP.back && PP.back.lines.length, "INTIMACY.party (party protection) malformed");
check(PP.condom.fx && PP.raw.fx && PP.back.fx, "INTIMACY.party fx missing");

check(D.PARTY.kissDare && typeof D.PARTY.kissDare === "string", "PARTY.kissDare prompt missing");
for (const b of D.PARTY.guestBeats.concat(D.PARTY.spicyGuestBeats, D.PARTY.scorchingGuestBeats)) check(b.length > 40 && b.includes("{n}"), `guest beat too vague: ${b}`);
check(D.PARTY.scorchingTruths.length && D.PARTY.scorchingDares.length && D.PARTY.scorchingGuestBeats.length, "scorching pools empty");
check(D.PARTY.privateScene && D.PARTY.privateScene.esc.length >= 2 && D.PARTY.privateScene.win.length, "PARTY.privateScene needs esc options + win lines");
for (const e of D.PARTY.privateScene.esc) check(e.label && typeof e.mod === "number" && e.line, `privateScene esc malformed: ${e.label}`);

// Shared intimacy beats (non-graphic): >=2 beats + a close, all with fx + line.
check(D.INTIMACY && D.INTIMACY.beats.length >= 2 && D.INTIMACY.close, "INTIMACY needs beats + close");
for (const node of D.INTIMACY.beats.concat([D.INTIMACY.close])) {
  check(node.q && node.opts.length >= 2, `INTIMACY node malformed: ${node.q}`);
  for (const op of node.opts) check(op.label && op.line && op.fx && typeof op.fx === "object", `INTIMACY opt malformed: ${op.label}`);
}
check(D.INTIMACY.close.opts.some((o) => o.tone), "INTIMACY close should set a tone");
const F = D.INTIMACY.finish;
check(F && F.q && F.pull && F.inside, "INTIMACY.finish needs q/pull/inside");
for (const k of ["pull", "inside"]) check(F[k].label && F[k].line && F[k].fx, `INTIMACY.finish.${k} malformed`);
const PR = D.INTIMACY.pregnancy;
check(PR && PR.wait && PR.say && PR.react.warm && PR.react.cool && PR.opts.length >= 2, "INTIMACY.pregnancy malformed");
for (const op of PR.opts) check(op.label && op.line && op.fx && op.status && op.kind, `pregnancy opt malformed: ${op.label}`);
check(typeof T.pregChanceRaw === "number" && T.pregChanceRaw > 0 && T.pregChanceRaw < 1, "TUNING.pregChanceRaw out of range");
check(typeof T.pregTalkAfterDays === "number" && T.pregTalkAfterDays >= 1, "TUNING.pregTalkAfterDays missing");

// Date-ending dialogue.
check(Array.isArray(D.DATE_END) && D.DATE_END.length >= 2, "DATE_END missing");
const endKinds = new Set(D.DATE_END.map((e) => e.kind));
for (const e of D.DATE_END) check(e.say && ["gracious", "eager", "forward", "cool"].includes(e.kind), `DATE_END bad: ${e.say}`);
check(endKinds.has("eager"), "DATE_END needs the risky 'eager' option");

// Party content (interactive, multi-round, subset of guests).
check(D.PARTY.rounds >= 4, "PARTY.rounds should be a real night");
check(D.PARTY.gameRounds >= 2, "PARTY.gameRounds too low");
check(D.PARTY.guestsMin >= 1 && D.PARTY.guestsMax >= D.PARTY.guestsMin && D.PARTY.guestsMax < Object.keys(D.CHARACTERS).length, "PARTY guest range should be a real subset");
check(Array.isArray(D.PARTY.games) && ["truthdare", "spin", "pong"].every((g) => D.PARTY.games.includes(g)), "PARTY.games must include the three games");
check(D.PARTY.flows.length >= 2 && D.PARTY.flows[0].at === 0, "PARTY.flows must start at 0");
for (const f of D.PARTY.flows) check(typeof f.at === "number" && f.name && f.desc, "PARTY flow shape");
check(D.PARTY.dance.length >= 3, "expected casual/dirty/handsy dance modes");
for (const m of D.PARTY.dance) check(m.id && m.label && m.rom >= 0 && m.gateFlow >= 0 && m.gateRecept >= 0, `PARTY dance ${m.id}: shape`);
check(D.PARTY.dance.some((m) => m.gateFlow === 0) && D.PARTY.dance.some((m) => m.gateFlow >= 2), "dance modes should span casual→gated");
check(D.PARTY.truths.length && D.PARTY.dares.length && D.PARTY.spicyTruths.length && D.PARTY.spicyDares.length, "PARTY truths/dares (+spicy) empty");
check(D.PARTY.guestBeats.length && D.PARTY.spicyGuestBeats.length, "PARTY guest narration pools empty");
for (const s of D.PARTY.guestBeats.concat(D.PARTY.spicyGuestBeats)) check(s.includes("{n}"), `guest beat missing {n}: ${s}`);
for (const a of D.PARTY.askTruths.concat(D.PARTY.askDares)) check(a.text && TRAIT.has(a.trait) && a.mag > 0, `PARTY ask opt bad: ${a.text}`);
check(D.PARTY.privateGateFlow >= 1 && D.PARTY.privateGateInterest >= 20, "private-room gates should be meaningful");

// Effort + work modes.
for (const [k, m] of Object.entries(D.TUNING.statModes)) {
  check(m.label && Array.isArray(m.roll), `statMode ${k}: shape`);
  const ps = m.roll.reduce((a, s) => a + s.p, 0);
  check(Math.abs(ps - 1) < 0.001, `statMode ${k}: probs sum ${ps} != 1`);
}
for (const [k, m] of Object.entries(D.TUNING.workModes))
  check(m.label && m.mult > 0 && m.variance >= 0, `workMode ${k}: shape`);

// dateCost is a number everywhere it's needed (0 = free venue).
for (const [id, loc] of Object.entries(D.LOCATIONS))
  if (loc.dateSpot || loc.home) check(typeof loc.dateCost === "number" && loc.dateCost >= 0, `${id}: missing dateCost`);

// New-bar / reveal tuning present.
check(typeof T.revealAfter === "number", "TUNING.revealAfter missing");
check(T.danceFail && T.privateReward && T.privateFail, "TUNING dance/private rewards missing");

// Characters.
for (const [id, c] of Object.entries(D.CHARACTERS)) {
  check(STAT.has(c.likedStat), `${id}: likedStat`);
  check(STYLE.has(c.likedStyle) && STYLE.has(c.dislikedStyle), `${id}: liked/disliked style not used by any line`);
  check(D.ITEMS[c.favoriteGift] && D.ITEMS[c.favoriteGift].type === "gift", `${id}: favoriteGift not a gift`);
  for (const ph of D.PHASES) check(D.LOCATIONS[c.schedule[ph]], `${id}: schedule ${ph}`);
  const ap = D.STATS.reduce((s, k) => s + (c.attractProfile[k] || 0), 0);
  check(near1(ap), `${id}: attractProfile sums ${ap} != 1`);
  const bw = D.BARS.reduce((s, k) => s + (c.barWeights[k] || 0), 0);
  check(near1(bw), `${id}: barWeights sum ${bw} != 1`);
  check(c.libidoRange[0] >= 0 && c.libidoRange[1] <= 100 && c.libidoRange[0] < c.libidoRange[1], `${id}: libidoRange`);
  check(c.decay.affection >= 0 && c.decay.romance >= 0, `${id}: decay`);
  for (const k of Object.keys(c.traitAffinity)) check(TRAIT.has(k), `${id}: traitAffinity unknown trait ${k}`);
  // Per-character openers (every mood) + reveals.
  check(c.opens, `${id}: missing opens`);
  for (const mood of ["cold", "neutral", "warm", "hot"])
    check(c.opens && Array.isArray(c.opens[mood]) && c.opens[mood].length, `${id}: opens.${mood} empty`);
  check(Array.isArray(c.reveals) && c.reveals.length >= 3, `${id}: needs >=3 reveals`);
  check(c.reveals.every((r) => typeof r === "string" && r.length), `${id}: bad reveal text`);
}

// --- Fractional stat training per effort mode (mirrors rollTable). ---
function roll(tbl) {
  let r = Math.random(), acc = 0;
  for (const s of tbl) { acc += s.p; if (r <= acc) return s.min === s.max ? s.min : s.min + Math.random() * (s.max - s.min); }
  const l = tbl[tbl.length - 1];
  return l.min === l.max ? l.min : l.min + Math.random() * (l.max - l.min);
}
const N = 40000;
function profile(tbl) {
  let z = 0, b = 0, s = 0;
  for (let i = 0; i < N; i++) { const g = roll(tbl); if (g === 0) z++; if (g >= 2) b++; s += g; }
  return { zero: z / N, big: b / N, mean: s / N };
}
const easy = profile(D.TUNING.statModes.easy.roll);
const focused = profile(D.TUNING.statModes.focused.roll);
const allout = profile(D.TUNING.statModes.allout.roll);
check(easy.zero === 0 && easy.big === 0, "easy should never be 0 and never a breakthrough");
check(focused.zero > 0 && focused.big > 0, "focused should sometimes 0, sometimes 2");
check(allout.zero > 0.2 && allout.big > 0.2, "all-out should be genuinely boom-or-bust");
check(allout.mean > focused.mean - 0.15, "all-out should not be strictly worse than focused on average");
const mean = focused.mean;
check(mean > 0.4 && mean < 0.9, `focused mean ${mean.toFixed(2)} out of band`);

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

const CHARS = Object.keys(D.CHARACTERS);
check(CHARS.length >= 5, `expected >=5 characters, got ${CHARS.length}`);
const favs = CHARS.map((id) => D.CHARACTERS[id].favoriteGift);
check(new Set(favs).size === favs.length, "favorite gifts should be distinct per character");

console.log("Backgrounds:", Object.keys(D.BACKGROUNDS).join(", "));
console.log("Characters:", CHARS.join(", "));
console.log("Locations:", Object.keys(D.LOCATIONS).join(", "), "| date spots:", Object.keys(D.DATE_SCENES).join(","));
console.log("Bars:", D.BARS.join(", "));
console.log(`Stat modes — easy ${easy.mean.toFixed(2)} | focused ${focused.mean.toFixed(2)} (0:${(focused.zero*100|0)}% 2:${(focused.big*100|0)}%) | all-out ${allout.mean.toFixed(2)} (0:${(allout.zero*100|0)}% 2:${(allout.big*100|0)}%)`);
console.log("Beat tiers/8000:", JSON.stringify(tc));
console.log(`Move win — hot ${moveHot.toFixed(2)} / cold ${moveCold.toFixed(2)}`);
console.log(`Capstone — number ${numReady.toFixed(2)}, kiss ready ${kissReady.toFixed(2)}, kiss cold ${kissCold.toFixed(2)}`);
console.log(`Date Q — aiko sincere ${dateQ(aiko, sincerePicks).toFixed(2)} vs adventurous ${dateQ(aiko, brashPicks).toFixed(2)}`);

if (errors.length) { console.error("\nFAIL:"); errors.forEach((e) => console.error("  " + e)); process.exit(1); }
console.log("\nSMOKE TEST PASSED");
