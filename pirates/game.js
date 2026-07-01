// Black Tide — engine. Full-canvas, real-time-with-pause naval roguelike.
// Vanilla JS, no build step. Depends only on window.PIRATEDATA (data.js).
(function () {
  "use strict";

  const D = window.PIRATEDATA;
  const T = D.TUNING;
  const SAVE_KEY = "blackTideSave_v1";

  // ---------------------------------------------------------------------------
  // Canvas + render transform
  // ---------------------------------------------------------------------------
  const W = 960, H = 600;            // logical resolution
  const HUD_TOP = 428;               // battle arena occupies y:0..HUD_TOP
  const canvas = document.getElementById("game");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Arena → screen transform (whole battle plane fits above the HUD).
  const ARENA_SCALE = Math.min(W / T.arenaW, HUD_TOP / T.arenaH);
  const ARENA_OX = (W - T.arenaW * ARENA_SCALE) / 2;
  const ARENA_OY = 0;
  const ax = (wx) => ARENA_OX + wx * ARENA_SCALE;
  const ay = (wy) => ARENA_OY + wy * ARENA_SCALE;
  const as = (n) => n * ARENA_SCALE;

  // ---------------------------------------------------------------------------
  // Input (mouse mapped to logical coords; held keys + discrete press queue)
  // ---------------------------------------------------------------------------
  const mouse = { x: 0, y: 0, down: false, clicked: false };
  const keys = new Set();
  const pressed = [];               // discrete key presses, consumed per frame

  function mapMouse(e) {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * (W / r.width);
    mouse.y = (e.clientY - r.top) * (H / r.height);
  }
  canvas.addEventListener("mousemove", mapMouse);
  canvas.addEventListener("mousedown", (e) => { mapMouse(e); mouse.down = true; mouse.clicked = true; });
  window.addEventListener("mouseup", () => { mouse.down = false; });
  window.addEventListener("keydown", (e) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)) e.preventDefault();
    if (!keys.has(e.key)) pressed.push(e.key);
    keys.add(e.key);
  });
  window.addEventListener("keyup", (e) => keys.delete(e.key));
  const consumePress = (k) => { const i = pressed.indexOf(k); if (i >= 0) { pressed.splice(i, 1); return true; } return false; };

  // ---------------------------------------------------------------------------
  // Small immediate-mode UI + draw helpers
  // ---------------------------------------------------------------------------
  const C = {
    sea: "#0d3550", seaDeep: "#0a2840", ink: "#0a1722", paper: "#e9dcc3",
    wood: "#6b4a2b", woodDark: "#3c2a18", gold: "#e6b422", red: "#b8412f",
    green: "#3f8a4f", blue: "#3d6fa6", text: "#f2ead6", dim: "#9fb0bd",
    panel: "#13242f", panelLt: "#1d3543", hi: "#f4d77a", danger: "#d9533b",
  };
  function rrect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function panel(x, y, w, h, fill) {
    ctx.fillStyle = fill || C.panel; rrect(x, y, w, h, 8); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 1; ctx.stroke();
  }
  function text(s, x, y, size, color, align, weight) {
    ctx.fillStyle = color || C.text;
    ctx.font = (weight || "") + " " + (size || 16) + "px Georgia, 'Times New Roman', serif";
    ctx.textAlign = align || "left"; ctx.textBaseline = "alphabetic";
    ctx.fillText(s, x, y);
  }
  function inRect(x, y, w, h) { return mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + h; }
  // Immediate-mode button. Returns true on click this frame.
  function button(x, y, w, h, label, opt) {
    opt = opt || {};
    const hov = inRect(x, y, w, h);
    const disabled = !!opt.disabled;
    let bg = opt.bg || C.panelLt;
    if (disabled) bg = "#22303a";
    else if (hov) bg = opt.hover || "#27506a";
    ctx.fillStyle = bg; rrect(x, y, w, h, 6); ctx.fill();
    ctx.strokeStyle = hov && !disabled ? C.hi : "rgba(255,255,255,0.12)";
    ctx.lineWidth = hov && !disabled ? 2 : 1; ctx.stroke();
    text(label, x + w / 2, y + h / 2 + (opt.size || 15) / 3, opt.size || 15,
      disabled ? "#5e6e78" : (opt.fg || C.text), "center", opt.weight);
    const click = hov && !disabled && mouse.clicked;
    if (click) mouse.clicked = false;
    return click;
  }
  function bar(x, y, w, h, frac, color, bg) {
    frac = clamp(frac, 0, 1);
    ctx.fillStyle = bg || "#0a1620"; rrect(x, y, w, h, 3); ctx.fill();
    if (frac > 0) { ctx.fillStyle = color; rrect(x, y, Math.max(2, w * frac), h, 3); ctx.fill(); }
  }

  // ---------------------------------------------------------------------------
  // Math helpers + RNG
  // ---------------------------------------------------------------------------
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const TAU = Math.PI * 2;
  function normAngle(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // ---------------------------------------------------------------------------
  // Crew + ship factories
  // ---------------------------------------------------------------------------
  function makeCrew(opts) {
    opts = opts || {};
    const traitKey = opts.trait || choice(Object.keys(D.TRAITS));
    const skills = {};
    for (const s of D.SKILLS) skills[s] = randInt(0, 2);
    const mods = D.TRAITS[traitKey].mods || {};
    for (const k in mods) skills[k] = Math.max(0, (skills[k] || 0) + mods[k]);
    let name = choice(D.FIRST_NAMES);
    if (Math.random() < 0.5) name += " " + choice(D.NICKNAMES);
    return { name, trait: traitKey, skills, hp: 100, weapon: opts.weapon || "fists" };
  }
  function freshAreas() {
    const a = {};
    for (const ar of D.AREAS) a[ar.key] = T.areaMax;
    return a;
  }
  const meleePower = (c) =>
    T.meleeBase + (c.skills.melee || 0) + (D.WEAPONS[c.weapon] ? D.WEAPONS[c.weapon].melee : 0);
  const avgSkill = (crew, k) => crew.length ? crew.reduce((s, c) => s + (c.skills[k] || 0), 0) / crew.length : 0;

  // ---------------------------------------------------------------------------
  // Game state, new game, save/load
  // ---------------------------------------------------------------------------
  let state = null;     // { screen, run, battle, port, map, msg... }

  function newGame(captainTrait) {
    const crew = [];
    crew.push(makeCrew({ trait: "gunner", weapon: "cutlass" }));
    crew.push(makeCrew({ trait: "carpenter" }));
    crew.push(makeCrew({ trait: "brawler", weapon: "cutlass" }));
    while (crew.length < T.startCrew) crew.push(makeCrew({}));
    const run = {
      captain: captainTrait,
      shipClass: "sloop",
      areas: freshAreas(),
      crew,
      gold: T.startGold,
      supplies: T.startSupplies,
      notoriety: 0,
      legs: 0,
      rep: { navy: 0, merchants: 0, brethren: 0 },
      quests: [],        // active quest ids
      questsDone: [],    // completed quest ids
      flags: {},         // misc story flags
    };
    state = { screen: "map", run, map: makeMap(), battle: null, msg: null, flash: 0 };
    save();
  }

  function save() {
    if (!state || !state.run) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ run: state.run, map: state.map }));
    } catch (e) { /* storage may be unavailable; fail silently */ }
  }
  function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      state = { screen: "map", run: d.run, map: d.map, battle: null, msg: null, flash: 0 };
      return true;
    } catch (e) { return false; }
  }
  function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }

  // ---------------------------------------------------------------------------
  // World map
  // ---------------------------------------------------------------------------
  function makeMap() {
    // A small hand-laid open-sea graph for the vertical slice.
    const nodes = [
      { id: 0, x: 130, y: 300, type: "start", name: "Tortuga Cove", links: [1, 2] },
      { id: 1, x: 330, y: 170, type: "enemy", enemy: "merchant", name: "Open Water", links: [0, 3] },
      { id: 2, x: 330, y: 430, type: "sea", name: "Reef Shallows", links: [0, 3, 4] },
      { id: 3, x: 560, y: 250, type: "enemy", enemy: "cutter", name: "Trade Lane", links: [1, 2, 5] },
      { id: 4, x: 560, y: 470, type: "port", name: "Port Royal", links: [2, 5] },
      { id: 5, x: 790, y: 350, type: "port", name: "Nassau", links: [3, 4] },
    ];
    return { nodes, current: 0, revealed: [0, 1, 2] };
  }
  function nodeById(id) { return state.map.nodes.find((n) => n.id === id); }

  // ---------------------------------------------------------------------------
  // Factions, events & quests
  // ---------------------------------------------------------------------------
  function repChange(faction, amt) {
    const r = state.run.rep;
    r[faction] = clamp((r[faction] || 0) + amt, -50, 50);
  }
  // Helper bundle passed to event req/effect/cond so data.js stays declarative.
  function eventAPI() {
    const run = state.run;
    return {
      has: (trait) => run.crew.some((c) => c.trait === trait),
      gold: (n) => { run.gold = Math.max(0, run.gold + n); },
      supplies: (n) => { run.supplies = Math.max(0, run.supplies + n); },
      rep: (f, n) => repChange(f, n),
      notor: (n) => { run.notoriety = clamp(run.notoriety + n, 0, 200); },
      damage: (area, n) => { run.areas[area] = clamp((run.areas[area] || 0) - n, 0, T.areaMax); },
      repair: (area, n) => { run.areas[area] = clamp((run.areas[area] || 0) + n, 0, T.areaMax); },
      flag: (k, v) => { run.flags[k] = v; },
      hasFlag: (k) => !!run.flags[k],
      addQuest: (id) => addQuest(id),
      addCrew: () => {
        if (run.crew.length >= D.SHIP_CLASSES[run.shipClass].crewCap) return null;
        const c = makeCrew({}); run.crew.push(c); return c.name;
      },
      loseCrew: () => { if (run.crew.length <= 1) return null; const c = run.crew.pop(); return c.name; },
    };
  }
  function rollEvent() {
    const run = state.run;
    const pool = Object.values(D.EVENTS).filter((ev) => !ev.cond || ev.cond(run));
    if (!pool.length) return null;
    let total = pool.reduce((s, ev) => s + (ev.weight || 1), 0);
    let r = Math.random() * total;
    for (const ev of pool) { r -= (ev.weight || 1); if (r <= 0) return ev; }
    return pool[0];
  }
  function openEvent(def) { state.event = { def, phase: "choose", result: null }; state.screen = "event"; }
  function resolveEventOption(opt) {
    const res = opt.effect ? (opt.effect(state.run, eventAPI()) || {}) : {};
    if (!res.lines) res.lines = ["…"];
    state.event.result = res; state.event.phase = "result"; save();
  }
  function finishEvent() {
    const res = state.event.result || {};
    state.event = null;
    if (res.battle) {
      // Synthetic encounter node so the existing battle flow can run.
      startBattle({ enemy: res.battle, name: "Open Water", type: "sea", links: [state.map.current] });
    } else { state.screen = "map"; save(); }
  }

  // --- Quests ---
  const questActive = (id) => state.run.quests.includes(id);
  const questDone = (id) => state.run.questsDone.includes(id);
  function questReqMet(id) {
    const q = D.QUESTS[id]; if (!q) return false;
    if (questActive(id) || questDone(id)) return false;
    for (const f in (q.reqRep || {})) if ((state.run.rep[f] || 0) < q.reqRep[f]) return false;
    return true;
  }
  function addQuest(id) {
    if (!D.QUESTS[id] || questActive(id) || questDone(id)) return;
    state.run.quests.push(id);
    if (D.QUESTS[id].targetNode != null) { const n = nodeById(D.QUESTS[id].targetNode); if (n) n.quest = id; }
    save();
  }
  function completeQuest(id, extraLines) {
    const q = D.QUESTS[id]; if (!q || !questActive(id)) return null;
    state.run.quests = state.run.quests.filter((x) => x !== id);
    state.run.questsDone.push(id);
    const rw = q.reward || {};
    if (rw.gold) state.run.gold += rw.gold;
    for (const f in (rw.rep || {})) repChange(f, rw.rep[f]);
    if (q.targetNode != null) { const n = nodeById(q.targetNode); if (n) delete n.quest; }
    save();
    return { title: "Quest complete: " + q.title, lines: (extraLines || []).concat(["Reward: " + (rw.gold || 0) + " gold."]) };
  }
  // Arrival/battle hooks.
  function checkArrivalQuests(node) {
    const done = [];
    for (const id of state.run.quests.slice()) {
      const q = D.QUESTS[id];
      if (q.type === "delivery" && node.type === "port" && node.name === q.targetPort) {
        const r = completeQuest(id, ["The Guild factor takes the silk with a nod."]); if (r) done.push(r);
      }
    }
    return done;
  }
  function treasureQuestForNode(node) {
    for (const id of state.run.quests) { const q = D.QUESTS[id]; if (q.type === "treasure" && q.targetNode === node.id) return id; }
    return null;
  }
  function checkBountyQuests(enemyKey) {
    const done = [];
    for (const id of state.run.quests.slice()) {
      const q = D.QUESTS[id];
      if (q.type === "bounty" && q.targetEnemy === enemyKey) { const r = completeQuest(id, ["The bounty is yours."]); if (r) done.push(r); }
    }
    return done;
  }
  // Reputation shift for defeating an enemy, by its faction.
  function applyEnemyRep(tmpl) {
    if (!tmpl || !tmpl.faction) return;
    if (tmpl.faction === "navy") { repChange("brethren", 4); repChange("navy", -5); }
    else if (tmpl.faction === "merchants") { repChange("merchants", -6); repChange("brethren", 2); }
  }
  // Merchant reputation nudges port prices (goodwill = discount).
  function priceMult() {
    return clamp(1 - (state.run.rep.merchants || 0) * T.repPriceSwing, 0.75, 1.35);
  }

  function sailTo(id) {
    const from = nodeById(state.map.current);
    if (!from.links.includes(id)) return;
    // Sailing a leg: burn supplies, decay notoriety, advance world.
    state.run.legs++;
    state.run.notoriety = Math.max(0, state.run.notoriety - T.notorietyDecayPerLeg);
    if (state.run.supplies > 0) {
      state.run.supplies = Math.max(0, state.run.supplies - T.supplyPerLeg);
    } else if (state.run.crew.length > 1) {
      // Starvation: lose a hand.
      state.run.crew.pop();
      state.flash = 2;
    }
    state.map.current = id;
    if (!state.map.revealed.includes(id)) state.map.revealed.push(id);
    const n = nodeById(id);
    for (const l of n.links) if (!state.map.revealed.includes(l)) state.map.revealed.push(l);
    save();
    // Delivery quests complete on arrival at their destination port.
    const arrived = checkArrivalQuests(n);
    // Resolve the destination encounter.
    if (n.type === "enemy") { startBattle(n); return; }
    if (n.type === "port") { showMsgs(arrived, () => { state.screen = "port"; buildPort(); }); return; }
    // Non-combat water / island / reef nodes:
    const tq = treasureQuestForNode(n);
    if (tq) { openTreasureDig(tq); return; }
    if (Math.random() < T.eventChance) { const ev = rollEvent(); if (ev) { openEvent(ev); return; } }
    showMsgs(arrived, null, { title: n.name, lines: ["Calm seas. Nothing but salt and horizon."] });
  }
  // Show a list of quest-completion messages (or a fallback), then continue.
  function showMsgs(list, then, fallback) {
    then = then || (() => { state.screen = "map"; });
    if (!list || !list.length) {
      if (fallback) { state.msg = { title: fallback.title, lines: fallback.lines, then }; state.screen = "msg"; return; }
      then(); return;
    }
    const lines = []; for (const m of list) lines.push.apply(lines, m.lines);
    state.msg = { title: list[0].title, lines, then }; state.screen = "msg";
  }
  function openTreasureDig(id) {
    const def = {
      id: "dig", title: "X Marks the Spot",
      text: "You put boats ashore and dig where the inked cross lies…",
      options: [{ label: "Dig", effect: () => { const r = completeQuest(id, ["Spades bite sand — then strike a rotten chest packed with coin!"]); return { lines: r ? r.lines : ["Nothing but sand and crabs."] }; } }],
    };
    openEvent(def);
  }

  // ---------------------------------------------------------------------------
  // Battle
  // ---------------------------------------------------------------------------
  function makeBattleShip(shipClassKey, isPlayer, areas, crewCount, gunnery) {
    const sc = D.SHIP_CLASSES[shipClassKey];
    // One cannon per gun slot per side. `slot` is the 0-based index within its
    // side (used to knock out the highest guns as the gun-deck takes damage).
    const cannons = [];
    let id = 0;
    for (const side of ["port", "star"]) {
      for (let s = 0; s < sc.gunsPerSide; s++) {
        // Enemy cannons come pre-manned by a synthetic gunner of the ship's
        // gunnery skill; the player's are assigned from the crew roster.
        const gunner = isPlayer ? null : { name: "gun crew", skills: { gunnery: gunnery || 1 }, _npc: true };
        cannons.push({ id: id++, side, slot: s, gunner, reload: rand(0, T.reloadBase), reloadMax: T.reloadBase, loaded: false });
      }
    }
    return {
      isPlayer, sc, areas: areas || freshAreas(),
      x: 0, y: 0, heading: 0, speed: 0, sailLevel: 1,
      water: 0, crew: crewCount, gunnery: gunnery || 1,
      cannons, surrendered: false, sunk: false,
    };
  }

  function startBattle(node) {
    const tmpl = D.ENEMIES[node.enemy];
    const player = makeBattleShip(state.run.shipClass, true, state.run.areas, state.run.crew.length, 1 + avgSkill(state.run.crew, "gunnery") * 0.4);
    player.x = T.arenaW * 0.30; player.y = T.arenaH * 0.62; player.heading = -0.5;
    const enemy = makeBattleShip(tmpl.shipClass, false, freshAreas(), tmpl.crew, tmpl.gunnery);
    enemy.x = T.arenaW * 0.68; enemy.y = T.arenaH * 0.32; enemy.heading = Math.PI * 0.8;
    enemy.aggression = tmpl.aggression;

    state.battle = {
      node, tmpl, player, enemy,
      stationCrew: { helm: [], sails: [], pumps: [] }, sel: null,
      shot: "round", target: "hull",
      paused: false, windDir: rand(-Math.PI, Math.PI),
      boarding: null, log: [], outcome: null, time: 0,
    };
    assignStartingPosts(state.battle);
    state.screen = "battle";
  }

  function crewAlive() { return state.run.crew.length; }

  // --- Crew posts (per-cannon gunners + helm/sails/pumps) --------------------
  function operationalPerSide(ship) {
    return Math.max(0, Math.ceil(ship.sc.gunsPerSide * ship.areas.guns / T.areaMax));
  }
  function cannonOnline(cn, ship) { return cn.slot < operationalPerSide(ship); }

  function assignStartingPosts(b) {
    b.stationCrew = { helm: [], sails: [], pumps: [] };
    for (const cn of b.player.cannons) cn.gunner = null;
    const crew = state.run.crew.slice();
    if (crew.length) b.stationCrew.helm.push(crew.shift());
    if (crew.length) b.stationCrew.sails.push(crew.shift());
    // Best gunners to the guns, interleaving sides so both batteries have some
    // guns manned by default (port slot0, star slot0, port slot1, …).
    crew.sort((a, z) => (z.skills.gunnery || 0) - (a.skills.gunnery || 0));
    const order = [];
    for (let s = 0; s < b.player.sc.gunsPerSide; s++)
      for (const side of ["port", "star"]) {
        const cn = b.player.cannons.find((c) => c.side === side && c.slot === s);
        if (cn) order.push(cn);
      }
    for (const cn of order) {
      if (!crew.length) break;
      if (cannonOnline(cn, b.player)) cn.gunner = crew.shift();
    }
    // Anyone left is in reserve (unassigned) for boarding / crisis response.
  }
  function unassign(c) {
    const b = state.battle; if (!b) return;
    for (const cn of b.player.cannons) if (cn.gunner === c) cn.gunner = null;
    for (const k of ["helm", "sails", "pumps"]) {
      const a = b.stationCrew[k], i = a.indexOf(c);
      if (i >= 0) a.splice(i, 1);
    }
  }
  function assignTo(c, post) {
    const b = state.battle;
    unassign(c);
    if (post.type === "cannon") {
      if (post.cannon.gunner) unassign(post.cannon.gunner);   // bump the old gunner to reserve
      post.cannon.gunner = c;
    } else if (post.type !== "reserve") {
      b.stationCrew[post.type].push(c);
    }
  }
  function crewPostLabel(c) {
    const b = state.battle;
    for (const cn of b.player.cannons) if (cn.gunner === c)
      return (cn.side === "port" ? "P" : "S") + (cn.slot + 1);
    for (const k of ["helm", "sails", "pumps"]) if (b.stationCrew[k].indexOf(c) >= 0)
      return k === "helm" ? "Helm" : k === "sails" ? "Sails" : "Pumps";
    return "—";
  }
  function assignedSet() {
    const b = state.battle, s = new Set();
    for (const cn of b.player.cannons) if (cn.gunner) s.add(cn.gunner);
    for (const k of ["helm", "sails", "pumps"]) for (const c of b.stationCrew[k]) s.add(c);
    return s;
  }
  function reserveCount() { const s = assignedSet(); return state.run.crew.filter((c) => !s.has(c)).length; }
  // helm/sails/pumps effectiveness: manning vs ideal, lightly weighted by skill.
  function postEff(key) {
    const b = state.battle, ideal = b.player.sc.crewIdeal;
    const crew = b.stationCrew[key] || [];
    const skillKey = key === "pumps" ? "repair" : "sailing";
    const avgSk = crew.length ? crew.reduce((s, c) => s + (c.skills[skillKey] || 0), 0) / crew.length : 0;
    return clamp(crew.length / ideal, 0, 1.5) * (1 + 0.05 * avgSk);
  }
  // Remove one hand (a casualty) and clear any post they held.
  function killCrew() {
    const c = state.run.crew.pop();
    if (!c) return;
    if (state.battle) { unassign(c); if (state.battle.sel === c) state.battle.sel = null; }
  }
  function applyCasualty(defender) {
    if (defender.isPlayer) killCrew();
    else defender.crew = Math.max(0, defender.crew - 1);
  }

  function windFactor(heading, windDir) {
    // cos = 1 when sailing the way the wind blows (running) → max factor.
    const c = Math.cos(normAngle(heading - windDir));
    return lerp(T.windMinFactor, T.windMaxFactor, (c + 1) / 2) * T.windStrength;
  }

  function shipMaxSpeed(ship, windDir, sailEff) {
    const mast = ship.areas.masts / T.areaMax;
    let mult = 1;
    if (ship.isPlayer && state.run.captain) {
      const perk = D.CAPTAIN_TRAITS[state.run.captain].perk;
      if (perk.speedMult) mult *= perk.speedMult;
    }
    return ship.sc.maxSpeed * (0.35 + 0.65 * mast) * windFactor(ship.heading, windDir) * sailEff * mult;
  }

  const cannonSkill = (cn) => (cn.gunner ? (cn.gunner.skills.gunnery || 0) : 0);
  function cannonReloadTime(cn, isPlayer) {
    let mult = 1;
    if (isPlayer && state.run.captain && D.CAPTAIN_TRAITS[state.run.captain].perk.reloadMult)
      mult = D.CAPTAIN_TRAITS[state.run.captain].perk.reloadMult;
    return (T.reloadBase * mult) / (0.6 + T.gunnerReloadK * cannonSkill(cn));
  }
  // A manned, online cannon loads over its own reload time; unmanned or
  // knocked-out guns never load. No auto-fire — loading only readies the gun.
  function tickCannons(ship, dt) {
    for (const cn of ship.cannons) {
      if (!cn.gunner || !cannonOnline(cn, ship)) { cn.loaded = false; continue; }
      if (!cn.loaded) { cn.reload -= dt; if (cn.reload <= 0) { cn.reload = 0; cn.loaded = true; } }
    }
  }
  function sideLoaded(ship, side) {
    return ship.cannons.filter((cn) => cn.side === side && cn.loaded && cn.gunner && cannonOnline(cn, ship)).length;
  }
  // Discharge every loaded cannon on `side`. They only HIT if that side bears
  // (target within the broadside arc) and is in range — firing out of arc just
  // wastes the load. Each cannon rolls accuracy from its own gunner's skill.
  function fireSide(attacker, defender, side, b) {
    const targetArea = attacker.isPlayer ? b.target : "hull";
    const shotKind = attacker.isPlayer ? D.SHOT_TYPES[b.shot] : D.SHOT_TYPES.round;
    const range = dist(attacker, defender);
    const inRange = range <= attacker.sc.gunRange;
    const bears = bearingSide(attacker, defender) === side;
    const rangeFrac = clamp(range / attacker.sc.gunRange, 0, 1);
    const motionFrac = clamp(defender.speed / defender.sc.maxSpeed, 0, 1);
    let hits = 0, fired = 0;
    for (const cn of attacker.cannons) {
      if (cn.side !== side || !cn.loaded || !cn.gunner || !cannonOnline(cn, attacker)) continue;
      fired++;
      cn.loaded = false;
      cn.reloadMax = cannonReloadTime(cn, attacker.isPlayer);
      cn.reload = cn.reloadMax;
      if (attacker.isPlayer && !cn.gunner._npc)
        cn.gunner.skills.gunnery = Math.min(T.skillMax, (cn.gunner.skills.gunnery || 0) + T.gunneryXpPerFire);
      if (!bears || !inRange) continue;   // fired, but no arc/range → all miss
      let acc = T.accuracyBase * (1 - rangeFrac * T.accuracyRangeFalloff)
        * (1 - motionFrac * T.accuracyMotionPenalty) * (1 + T.gunnerAccK * cannonSkill(cn));
      if (Math.random() < clamp(acc, 0.05, 0.96)) hits++;
    }
    if (fired === 0) return 0;
    const who = attacker.isPlayer ? "Your" : "Enemy";
    if (hits > 0) {
      const dmg = hits * shotKind.base * (shotKind.bias[targetArea] || 0.7);
      defender.areas[targetArea] = Math.max(0, defender.areas[targetArea] - dmg);
      const casChance = shotKind.casualty * (targetArea === "deck" ? 1.5 : 1) * hits * 0.5;
      if (Math.random() < casChance) applyCasualty(defender);
      b.log.unshift(who + " " + side + " battery: " + hits + "/" + fired + " into the " + targetArea);
    } else {
      b.log.unshift(who + " " + side + " battery: " + fired + " fired, " + (bears && inRange ? "all missed" : "none bore"));
    }
    if (b.log.length > 4) b.log.pop();
    return fired;
  }
  // Player fire order (F key / FIRE buttons). Never automatic.
  function firePlayer(side) {
    const b = state.battle, p = b.player, e = b.enemy;
    if (!b || b.boarding || b.outcome || e.sunk) return;
    side = side || bearingSide(p, e);
    if (!side) { b.flash = "No guns bear — turn to bring a broadside about!"; b.flashT = 1.6; return; }
    if (sideLoaded(p, side) === 0) { b.flash = "No loaded guns on the " + side + " side."; b.flashT = 1.4; return; }
    fireSide(p, e, side, b);
  }

  function bearingSide(attacker, defender) {
    // Returns 'port', 'star', or null depending on which broadside bears.
    const ang = normAngle(Math.atan2(defender.y - attacker.y, defender.x - attacker.x) - attacker.heading);
    const arc = (T.gunArcDeg * Math.PI) / 180;
    if (Math.abs(normAngle(ang + Math.PI / 2)) < arc) return "port";   // target ~90° to port
    if (Math.abs(normAngle(ang - Math.PI / 2)) < arc) return "star";   // ~90° to starboard
    return null;
  }

  function updateBattle(dt) {
    const b = state.battle;
    if (!b) return;
    if (b.outcome) return;            // frozen on result panel
    if (b.boarding) { updateBoarding(dt); return; }
    if (b.paused) return;
    b.time += dt;
    const p = b.player, e = b.enemy;

    // --- Player movement (held keys) ---
    const helmEff = 0.5 + 0.5 * postEff("helm");
    const rudder = p.areas.rudder / T.areaMax;
    const turn = p.sc.turnRate * helmEff * (0.3 + 0.7 * rudder);
    if (keys.has("ArrowLeft") || keys.has("a")) p.heading = normAngle(p.heading - turn * dt);
    if (keys.has("ArrowRight") || keys.has("d")) p.heading = normAngle(p.heading + turn * dt);
    if (consumePress("ArrowUp") || consumePress("w")) p.sailLevel = clamp(p.sailLevel + 0.25, 0, 1);
    if (consumePress("ArrowDown") || consumePress("s")) p.sailLevel = clamp(p.sailLevel - 0.25, 0, 1);

    const sailEffP = 0.55 + 0.45 * postEff("sails");
    stepShip(p, b.windDir, shipMaxSpeed(p, b.windDir, sailEffP) * p.sailLevel, dt);

    // Player pumps fight flooding.
    updateFlooding(p, postEff("pumps") * T.pumpRate, dt);

    // Player cannons load on their own; firing happens only on the player's
    // order (F key / FIRE buttons) — never automatically.
    tickCannons(p, dt);

    // --- Enemy AI ---
    if (!e.surrendered) updateEnemyAI(e, p, b, dt);
    else stepShip(e, b.windDir, shipMaxSpeed(e, b.windDir, 0.5) * 0.3, dt);
    updateFlooding(e, e.surrendered ? T.pumpRate * 0.4 : T.pumpRate * 0.5, dt);

    // Enemy surrender check.
    if (!e.surrendered && !e.sunk &&
        (e.areas.hull <= T.enemyHullSurrender || e.crew <= T.enemyCrewSurrender)) {
      e.surrendered = true;
      b.log.unshift("The enemy strikes her colors!");
    }

    // --- Win/lose resolution ---
    if (e.water >= T.floodSink || e.areas.hull <= 0) { e.sunk = true; endBattle("sunk"); return; }
    if (p.water >= T.floodSink || p.areas.hull <= 0) { endBattle("lost"); return; }
    if (crewAlive() <= 0) { endBattle("lost"); return; }
    // Persist the player's area damage back to the run as it happens.
    state.run.areas = p.areas;
  }

  function stepShip(ship, windDir, targetSpeed, dt) {
    targetSpeed = Math.max(0, targetSpeed);
    if (ship.speed < targetSpeed) ship.speed = Math.min(targetSpeed, ship.speed + T.accel * dt);
    else ship.speed = Math.max(targetSpeed, ship.speed - T.drag * T.accel * 0.02 - (ship.speed - targetSpeed) * dt * 1.5);
    ship.x += Math.cos(ship.heading) * ship.speed * dt;
    ship.y += Math.sin(ship.heading) * ship.speed * dt;
    const m = 30;
    ship.x = clamp(ship.x, m, T.arenaW - m);
    ship.y = clamp(ship.y, m, T.arenaH - m);
  }

  function updateFlooding(ship, pumpPower, dt) {
    const breach = (T.areaMax - ship.areas.hull);
    const floodRate = breach * T.floodGain;
    ship.water = clamp(ship.water + (floodRate - pumpPower) * dt, 0, T.floodSink);
  }

  function updateEnemyAI(e, p, b, dt) {
    const range = dist(e, p);
    const toP = normAngle(Math.atan2(p.y - e.y, p.x - e.x) - e.heading);
    const preferred = e.sc.gunRange * 0.62;
    let desiredRel;
    if (range > preferred * 1.25) desiredRel = toP;                  // close in
    else {
      // Put the player on the beam to bring a broadside to bear.
      desiredRel = toP > 0 ? toP - Math.PI / 2 : toP + Math.PI / 2;
    }
    const rudder = e.areas.rudder / T.areaMax;
    const turn = e.sc.turnRate * (0.4 + 0.6 * rudder);
    if (desiredRel > 0.05) e.heading = normAngle(e.heading + Math.min(turn * dt, desiredRel));
    else if (desiredRel < -0.05) e.heading = normAngle(e.heading - Math.min(turn * dt, -desiredRel));
    stepShip(e, b.windDir, shipMaxSpeed(e, b.windDir, 0.9) * (0.5 + 0.5 * e.aggression), dt);

    // Enemy cannons load on their own; the AI captain fires a side once at
    // least half its bearing guns are loaded (this is AI, not player auto-fire).
    tickCannons(e, dt);
    if (range <= e.sc.gunRange) {
      const side = bearingSide(e, p);
      if (side) {
        const ops = operationalPerSide(e), loaded = sideLoaded(e, side);
        if (loaded > 0 && loaded >= Math.ceil(ops / 2)) fireSide(e, p, side, b);
      }
    }
  }

  // --- Boarding -------------------------------------------------------------
  function tryBoard() {
    const b = state.battle;
    if (!b || b.boarding || b.outcome) return;
    if (b.enemy.sunk) return;
    if (dist(b.player, b.enemy) > T.grappleRange) { b.flash = "Too far — close to grapple range!"; b.flashT = 1.5; return; }
    b.player.speed = 0; b.enemy.speed = 0;
    let meleeMult = 1;
    if (state.run.captain && D.CAPTAIN_TRAITS[state.run.captain].perk.meleeMult)
      meleeMult = D.CAPTAIN_TRAITS[state.run.captain].perk.meleeMult;
    const pStr = state.run.crew.reduce((s, c) => s + meleePower(c), 0) * meleeMult;
    const eStr = b.enemy.crew * (T.meleeBase + b.enemy.gunnery) * (b.enemy.surrendered ? 0.4 : 1);
    b.boarding = {
      pStr, eStr, pCrew: crewAlive(), eCrew: b.enemy.crew,
      pCasualty: 0, eCasualty: 0, tick: 0, done: false, result: null,
    };
    b.log.unshift("Grapples away! Boarders over the side!");
  }
  function updateBoarding(dt) {
    const b = state.battle, bd = b.boarding;
    if (bd.done) return;
    bd.tick += dt;
    if (bd.tick < T.boardTickSec) return;
    bd.tick = 0;
    // Each exchange inflicts casualties scaled by melee strength, amplified by
    // who holds the advantage — the stronger party wins decisively and loses
    // few, so arming your boarders and softening the enemy with grape-shot
    // first pays off, while boarding a fresh, bigger crew is suicide.
    const adv = bd.pStr / Math.max(1, bd.eStr);   // > 1 means you're winning
    const eLoss = T.boardLethality * bd.pStr * adv;
    const pLoss = T.boardLethality * bd.eStr / adv;
    bd.eCasualty += eLoss; bd.pCasualty += pLoss;
    while (bd.eCasualty >= 1 && b.enemy.crew > 0) { b.enemy.crew--; bd.eCasualty -= 1; }
    while (bd.pCasualty >= 1 && state.run.crew.length > 0) { killCrew(); bd.pCasualty -= 1; }
    if (b.enemy.crew <= 0) { bd.done = true; bd.result = "captured"; endBattle("captured"); }
    else if (crewAlive() <= 0) { bd.done = true; bd.result = "wiped"; endBattle("lost"); }
  }

  function endBattle(kind) {
    const b = state.battle;
    if (b.outcome) return;
    const tmpl = b.tmpl;
    let gold = 0, supplies = 0, recruited = null, title = "", lines = [];
    if (kind === "captured") {
      gold = Math.round(tmpl.gold * 1.0 + 40);
      supplies = tmpl.supplies + 2;
      title = "Prize Taken!";
      lines.push("You storm the deck and take her whole. The hold is yours.");
      if (state.run.crew.length < D.SHIP_CLASSES[state.run.shipClass].crewCap && Math.random() < 0.6) {
        recruited = makeCrew({}); state.run.crew.push(recruited);
        lines.push("A surrendered hand signs your articles: " + recruited.name + ".");
      }
    } else if (kind === "sunk") {
      gold = Math.round(tmpl.gold * T.sinkGoldMult);
      supplies = Math.max(0, tmpl.supplies - 1);
      title = "Enemy Sunk";
      lines.push("She goes down by the bow. You scoop what flotsam you can.");
    } else if (kind === "lost") {
      title = "Your Ship is Lost";
      lines.push("Water over the rail, colors down. The sea takes the rest.");
      b.outcome = { kind, gold: 0 };
      state.run.dead = true;
      clearSave();
      state.flash = 0;
      return;
    }
    if (b.enemy.surrendered && kind === "sunk") lines.push("(They had struck — boarding would have paid more.)");
    // Faction consequences + any bounty on this foe.
    applyEnemyRep(tmpl);
    if (tmpl.faction === "navy") lines.push("Word spreads: the brethren toast you; the Crown does not.");
    for (const bq of checkBountyQuests(tmpl.key)) lines.push.apply(lines, bq.lines);
    state.run.gold += gold; state.run.supplies += supplies;
    // Bail out water once safe; area damage persists until a shipwright.
    b.player.water = 0; state.run.areas = b.player.areas;
    save();
    b.outcome = { kind, gold, supplies, recruited, title, lines };
  }

  function finishBattle() {
    // Convert the resolved enemy node into open water and return to the map.
    const b = state.battle;
    if (b && b.node) b.node.type = "sea";
    state.battle = null;
    if (state.run.dead) { state.screen = "gameover"; }
    else { state.screen = "map"; save(); }
  }

  // ---------------------------------------------------------------------------
  // Port
  // ---------------------------------------------------------------------------
  function buildPort() {
    state.port = { tab: "yard", weaponBuy: null, recruit: makeCrew({}) };
  }
  function repairCost() {
    const a = state.run.areas; let cost = 0;
    for (const ar of D.AREAS) {
      const miss = T.areaMax - a[ar.key];
      cost += miss * (ar.key === "hull" ? D.PORT.repairHullPerPoint : D.PORT.repairPerPoint);
    }
    return Math.round(cost * priceMult());
  }

  // ---------------------------------------------------------------------------
  // Scenes
  // ---------------------------------------------------------------------------
  function drawSeaBg() {
    ctx.fillStyle = C.seaDeep; ctx.fillRect(0, 0, W, H);
    // subtle swell lines
    ctx.strokeStyle = "rgba(255,255,255,0.03)"; ctx.lineWidth = 1;
    for (let y = 20; y < H; y += 26) {
      ctx.beginPath();
      for (let x = 0; x <= W; x += 24) ctx.lineTo(x, y + Math.sin((x + y) * 0.03) * 3);
      ctx.stroke();
    }
  }

  const Scenes = {
    // --- Title ---
    title: {
      update() {},
      render() {
        drawSeaBg();
        text("BLACK TIDE", W / 2, 170, 64, C.hi, "center", "bold");
        text("a pirate sea-battle roguelike", W / 2, 205, 20, C.dim, "center", "italic");
        if (button(W / 2 - 110, 270, 220, 52, "New Voyage", { size: 20, bg: C.wood, hover: "#855c33" }))
          state.screen = "create";
        const cont = hasSave();
        if (button(W / 2 - 110, 336, 220, 48, "Continue", { size: 18, disabled: !cont }))
          if (loadSave()) state.screen = "map";
        text("Maneuver with the wind. Bring your broadside to bear. Board for the prize.",
          W / 2, 470, 16, C.dim, "center", "italic");
        text("Arrows steer / adjust sail · Space pauses · click to give orders",
          W / 2, 498, 14, C.dim, "center");
      },
    },

    // --- Captain creation ---
    create: {
      update() {},
      render() {
        drawSeaBg();
        text("Choose your captain", W / 2, 90, 34, C.hi, "center", "bold");
        const keys = Object.keys(D.CAPTAIN_TRAITS);
        const cw = 270, gap = 24, total = keys.length * cw + (keys.length - 1) * gap;
        let x = (W - total) / 2;
        for (const k of keys) {
          const ct = D.CAPTAIN_TRAITS[k];
          panel(x, 150, cw, 230, C.panel);
          text(ct.label, x + cw / 2, 195, 24, C.text, "center", "bold");
          wrap(ct.blurb, x + 20, 230, cw - 40, 18, 16, C.dim);
          const perkTxt = ct.perk.reloadMult ? "Faster reloads"
            : ct.perk.speedMult ? "Faster ship" : "Deadlier boarders";
          text("Perk: " + perkTxt, x + cw / 2, 315, 15, C.gold, "center", "italic");
          if (button(x + 35, 335, cw - 70, 36, "Set Sail", { bg: C.wood, hover: "#855c33" }))
            newGame(k);
          x += cw + gap;
        }
        if (button(24, H - 56, 120, 36, "← Back")) state.screen = "title";
      },
    },

    // --- World map ---
    map: {
      update() {},
      render() {
        drawSeaBg();
        const m = state.map, cur = nodeById(m.current);
        // edges
        ctx.strokeStyle = "rgba(230,180,34,0.25)"; ctx.lineWidth = 2;
        for (const n of m.nodes) for (const l of n.links) if (l > n.id) {
          const o = nodeById(l);
          ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(o.x, o.y); ctx.stroke();
        }
        // nodes
        for (const n of m.nodes) {
          const revealed = m.revealed.includes(n.id);
          const adj = cur.links.includes(n.id);
          const r = 16;
          ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, TAU);
          ctx.fillStyle = n.type === "port" ? C.blue : n.type === "enemy" ? C.red
            : n.type === "start" ? C.green : "#39505f";
          if (!revealed) ctx.fillStyle = "#243540";
          ctx.fill();
          ctx.lineWidth = (n.id === m.current) ? 3 : 1;
          ctx.strokeStyle = (n.id === m.current) ? C.hi : "rgba(0,0,0,0.4)"; ctx.stroke();
          const label = !revealed ? "?" : (n.type === "port" ? "⚓ " : n.type === "enemy" ? "⚔ " : "") + n.name;
          text(label, n.x, n.y + 34, 14, revealed ? C.text : C.dim, "center");
          // Quest marker: treasure target node, or a delivery's destination port.
          const isQuestNode = n.quest ||
            (n.type === "port" && state.run.quests.some((id) => D.QUESTS[id].type === "delivery" && D.QUESTS[id].targetPort === n.name));
          if (isQuestNode) text("✦", n.x, n.y - 22, 20, C.gold, "center");
          if (adj && inRect(n.x - r, n.y - r, r * 2, r * 2)) {
            ctx.beginPath(); ctx.arc(n.x, n.y, r + 5, 0, TAU); ctx.strokeStyle = C.hi; ctx.lineWidth = 2; ctx.stroke();
            if (mouse.clicked) { mouse.clicked = false; sailTo(n.id); }
          }
        }
        // your ship marker
        text("⛵", cur.x, cur.y + 5, 22, C.paper, "center");
        // HUD bar
        panel(0, H - 64, W, 64, C.panel);
        const r = state.run;
        text("Gold " + r.gold, 24, H - 30, 18, C.gold, "left", "bold");
        text("Supplies " + r.supplies, 150, H - 30, 18, r.supplies <= 2 ? C.danger : C.text);
        text("Crew " + r.crew.length + "/" + D.SHIP_CLASSES[r.shipClass].crewCap, 320, H - 30, 18, C.text);
        text("Notoriety " + r.notoriety, 470, H - 30, 18, r.notoriety > 50 ? C.danger : C.dim);
        text(D.SHIP_CLASSES[r.shipClass].name, W - 24, H - 30, 18, C.dim, "right");
        text("Click a glowing port to sail there.", W / 2, H - 30, 15, C.dim, "center", "italic");
        if (state.flash > 0) { state.flash -= 0.02; text("A hand starved — supplies ran dry!", W / 2, H - 80, 16, C.danger, "center", "bold"); }
      },
    },

    // --- Simple message screen ---
    msg: {
      update() {},
      render() {
        drawSeaBg();
        const m = state.msg;
        panel(W / 2 - 280, 200, 560, 200);
        text(m.title, W / 2, 250, 28, C.hi, "center", "bold");
        let y = 295; for (const l of m.lines) { wrap(l, W / 2 - 250, y, 500, 22, 17, C.text, "center"); y += 30; }
        if (button(W / 2 - 80, 350, 160, 40, "Onward")) { const f = m.then; state.msg = null; f(); }
      },
    },

    // --- Branching sea event ---
    event: {
      update() {},
      render() {
        drawSeaBg();
        const ev = state.event, def = ev.def;
        panel(W / 2 - 320, 90, 640, 420);
        text(def.title, W / 2, 140, 30, C.hi, "center", "bold");
        if (ev.phase === "choose") {
          const yEnd = wrap(def.text, W / 2 - 290, 180, 580, 24, 18, C.text, "center");
          let y = yEnd + 40;
          const H = eventAPI();
          for (const opt of def.options) {
            const ok = !opt.req || opt.req(state.run, H);
            if (button(W / 2 - 260, y, 520, 40, opt.label, { disabled: !ok, bg: C.panelLt, hover: "#27506a" })) {
              if (ok) resolveEventOption(opt);
            }
            if (!ok && opt.reqText) text("(" + opt.reqText + ")", W / 2 + 250, y + 25, 12, C.danger, "right", "italic");
            y += 50;
          }
        } else {
          let y = 200; for (const l of ev.result.lines) y = wrap(l, W / 2 - 290, y, 580, 24, 18, C.text, "center") + 30;
          if (button(W / 2 - 90, 440, 180, 42, ev.result.battle ? "To arms!" : "Onward", { bg: C.wood, hover: "#855c33" })) finishEvent();
        }
      },
    },

    // --- Battle ---
    battle: {
      update(dt) { updateBattle(dt); },
      render() { renderBattle(); },
    },

    // --- Port ---
    port: {
      update() {},
      render() { renderPort(); },
    },

    // --- Game over / victory ---
    gameover: {
      update() {},
      render() {
        drawSeaBg();
        text("DAVY JONES' LOCKER", W / 2, 220, 46, C.danger, "center", "bold");
        text("Your voyage ends beneath the waves.", W / 2, 270, 20, C.dim, "center", "italic");
        text("Legs sailed: " + (state.run ? state.run.legs : 0), W / 2, 320, 18, C.text, "center");
        if (button(W / 2 - 110, 370, 220, 48, "New Voyage", { bg: C.wood, hover: "#855c33" }))
          state.screen = "title";
      },
    },
    victory: {
      update() {},
      render() {
        drawSeaBg();
        text("A LEGEND RETIRES", W / 2, 210, 46, C.hi, "center", "bold");
        text("You bury your gold and live to tell the tale.", W / 2, 260, 20, C.dim, "center", "italic");
        text("Final fortune: " + (state.run ? state.run.gold : 0) + " gold", W / 2, 312, 22, C.gold, "center", "bold");
        if (button(W / 2 - 110, 370, 220, 48, "New Voyage", { bg: C.wood, hover: "#855c33" })) { clearSave(); state.screen = "title"; }
      },
    },
  };

  function wrap(s, x, y, w, lh, size, color, align) {
    const words = String(s).split(" ");
    let line = "", yy = y;
    ctx.font = size + "px Georgia, serif";
    for (const word of words) {
      const test = line ? line + " " + word : word;
      if (ctx.measureText(test).width > w && line) {
        text(line, align === "center" ? x + w / 2 : x, yy, size, color, align || "left"); line = word; yy += lh;
      } else line = test;
    }
    if (line) text(line, align === "center" ? x + w / 2 : x, yy, size, color, align || "left");
    return yy;
  }

  // ---------------------------------------------------------------------------
  // Battle rendering
  // ---------------------------------------------------------------------------
  function drawShip(ship, color) {
    const L = as(ship.sc.length), B = as(ship.sc.beam);
    ctx.save();
    ctx.translate(ax(ship.x), ay(ship.y));
    ctx.rotate(ship.heading);
    // hull (pointed bow toward +x = heading)
    ctx.beginPath();
    ctx.moveTo(L * 0.6, 0);
    ctx.lineTo(L * 0.2, -B / 2);
    ctx.lineTo(-L * 0.5, -B / 2);
    ctx.lineTo(-L * 0.5, B / 2);
    ctx.lineTo(L * 0.2, B / 2);
    ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 1.5; ctx.stroke();
    // sail (faded if masts damaged)
    const mast = ship.areas.masts / T.areaMax;
    ctx.globalAlpha = 0.4 + 0.5 * mast;
    ctx.fillStyle = ship.sunk ? "#444" : "#e9e2cf";
    ctx.fillRect(-L * 0.12, -B * 0.42, L * 0.26, B * 0.84);
    ctx.globalAlpha = 1;
    ctx.restore();
    // water/fire indicators
    if (ship.water > 30) {
      ctx.fillStyle = "rgba(60,140,200," + (0.2 + ship.water / 200) + ")";
      ctx.beginPath(); ctx.arc(ax(ship.x), ay(ship.y), as(ship.sc.length) * 0.5, 0, TAU); ctx.fill();
    }
  }

  function renderBattle() {
    const b = state.battle;
    drawSeaBg();
    // arena frame
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.strokeRect(ax(0), ay(0), as(T.arenaW), as(T.arenaH));

    // wind arrow
    const wx = 70, wy = 40, wl = 26;
    ctx.save(); ctx.translate(wx, wy); ctx.rotate(b.windDir);
    ctx.strokeStyle = C.hi; ctx.lineWidth = 3; ctx.beginPath();
    ctx.moveTo(-wl, 0); ctx.lineTo(wl, 0); ctx.lineTo(wl - 8, -6); ctx.moveTo(wl, 0); ctx.lineTo(wl - 8, 6); ctx.stroke();
    ctx.restore();
    text("WIND", wx, wy + 26, 12, C.dim, "center");

    // gun range ring for player
    ctx.strokeStyle = "rgba(230,180,34,0.12)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(ax(b.player.x), ay(b.player.y), as(b.player.sc.gunRange), 0, TAU); ctx.stroke();

    drawShip(b.enemy, b.enemy.surrendered ? "#7a6a55" : C.red);
    drawShip(b.player, C.wood);

    // grapple-range hint when close
    const dd = dist(b.player, b.enemy);
    if (dd <= T.grappleRange * 1.6 && !b.enemy.sunk) {
      ctx.strokeStyle = dd <= T.grappleRange ? C.green : "rgba(255,255,255,0.25)";
      ctx.setLineDash([6, 6]); ctx.beginPath();
      ctx.moveTo(ax(b.player.x), ay(b.player.y)); ctx.lineTo(ax(b.enemy.x), ay(b.enemy.y)); ctx.stroke();
      ctx.setLineDash([]);
    }

    // combat log
    let ly = 70; for (const l of b.log) { text(l, W - 16, ly, 14, C.dim, "right"); ly += 18; }

    renderBattleHUD();
    if (b.outcome) renderOutcome();
    else if (b.boarding) renderBoardingOverlay();
  }

  function areaBars(x, y, areas, clickable) {
    const b = state.battle;
    let yy = y;
    for (const ar of D.AREAS) {
      const frac = areas[ar.key] / T.areaMax;
      const col = frac > 0.5 ? C.green : frac > 0.25 ? C.gold : C.danger;
      const selected = clickable && b.target === ar.key;
      if (clickable && inRect(x, yy - 11, 150, 16)) {
        ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.fillRect(x - 2, yy - 12, 154, 17);
        if (mouse.clicked) { mouse.clicked = false; b.target = ar.key; }
      }
      text((selected ? "▸ " : "") + ar.label, x, yy + 2, 13, selected ? C.hi : C.text);
      bar(x + 60, yy - 9, 90, 9, frac, col);
      yy += 19;
    }
    return yy;
  }

  function drawBattery(side, x, y, w) {
    const b = state.battle, p = b.player;
    const bears = bearingSide(p, b.enemy) === side;
    const n = p.sc.gunsPerSide, sw = Math.min(24, (w - 4) / n);
    text(side === "port" ? "Port" : "Star", x, y + 12, 12, bears ? C.hi : C.dim, "left", bears ? "bold" : "");
    let gx = x + 40;
    for (const cn of p.cannons.filter((c) => c.side === side)) {
      const online = cannonOnline(cn, p);
      const bx = gx, by = y, bw = sw - 3, bh = 16;
      if (!online) { ctx.fillStyle = "#242424"; rrect(bx, by, bw, bh, 3); ctx.fill(); }
      else if (!cn.gunner) {
        ctx.strokeStyle = "rgba(255,255,255,0.3)"; rrect(bx, by, bw, bh, 3); ctx.stroke();
      } else if (cn.loaded) {
        ctx.fillStyle = C.green; rrect(bx, by, bw, bh, 3); ctx.fill();
      } else {
        ctx.fillStyle = "#0a1620"; rrect(bx, by, bw, bh, 3); ctx.fill();
        const f = clamp(1 - cn.reload / (cn.reloadMax || 1), 0, 1);
        ctx.fillStyle = C.gold; rrect(bx, by, Math.max(2, bw * f), bh, 3); ctx.fill();
      }
      if (cn.gunner === b.sel) { ctx.strokeStyle = C.hi; ctx.lineWidth = 2; rrect(bx, by, bw, bh, 3); ctx.stroke(); }
      if (inRect(bx, by, bw, bh) && mouse.clicked) {
        mouse.clicked = false;
        if (b.sel && online) { assignTo(b.sel, { type: "cannon", cannon: cn }); b.sel = null; }
        else if (cn.gunner && !cn.gunner._npc) assignTo(cn.gunner, { type: "reserve" });
      }
      gx += sw;
    }
    if (button(x + 40 + n * sw + 6, y - 1, 74, 18, "FIRE", { size: 12, bg: bears && sideLoaded(p, side) ? "#7a3d2a" : C.panelLt, hover: "#9a4d34" }))
      firePlayer(side);
  }

  function renderBattleHUD() {
    const b = state.battle, p = b.player, e = b.enemy;
    panel(0, HUD_TOP, W, H - HUD_TOP, C.panel);
    const y0 = HUD_TOP;

    // --- Col 1: your ship ---
    text("YOUR " + p.sc.name.toUpperCase(), 10, y0 + 20, 14, C.hi, "left", "bold");
    text("Sail " + Math.round(p.sailLevel * 100) + "%", 128, y0 + 20, 12, C.dim);
    areaBars(10, y0 + 40, p.areas, false);
    text("Water", 10, y0 + 148, 12, C.text);
    bar(70, y0 + 139, 96, 9, p.water / T.floodSink, C.blue);

    // --- Col 2: crew roster + station assignment ---
    const cx = 196;
    text("CREW — click to select", cx, y0 + 18, 13, C.hi, "left", "bold");
    text("Reserve " + reserveCount(), cx + 165, y0 + 18, 12, C.dim);
    const shown = Math.min(6, state.run.crew.length);
    for (let r = 0; r < shown; r++) {
      const c = state.run.crew[r], ry = y0 + 28 + r * 16;
      const seld = b.sel === c;
      if (inRect(cx, ry, 244, 15)) { ctx.fillStyle = "rgba(255,255,255,0.05)"; ctx.fillRect(cx, ry, 244, 15); if (mouse.clicked) { mouse.clicked = false; b.sel = seld ? null : c; } }
      if (seld) { ctx.strokeStyle = C.hi; ctx.lineWidth = 1; ctx.strokeRect(cx, ry, 244, 15); }
      const nm = c.name.length > 17 ? c.name.slice(0, 16) + "…" : c.name;
      text((seld ? "▸ " : "") + nm, cx + 4, ry + 12, 12, seld ? C.hi : C.text);
      text("G" + Math.round(c.skills.gunnery || 0), cx + 176, ry + 12, 11, C.dim);
      text(crewPostLabel(c), cx + 206, ry + 12, 11, C.gold);
    }
    if (state.run.crew.length > shown) text("+" + (state.run.crew.length - shown) + " more (win/lose hands to see)", cx, y0 + 28 + shown * 16 + 10, 10, C.dim);
    // Assign-selected-to buttons
    const ays = y0 + 130; let abx = cx;
    for (const [type, label] of [["helm", "Helm"], ["sails", "Sails"], ["pumps", "Pumps"], ["reserve", "Reserve"]]) {
      if (button(abx, ays, 58, 20, label, { size: 11, disabled: !b.sel, bg: C.panelLt })) { if (b.sel) { assignTo(b.sel, { type }); b.sel = null; } }
      abx += 61;
    }
    text(b.sel ? "Now click a gun slot or a station to post " + b.sel.name.split(" ")[0] : "Select a hand, then a gun/station.", cx, ays + 32, 11, C.dim, "left", "italic");

    // --- Col 3: batteries, shot, fire ---
    const bx = 452;
    text("BATTERIES", bx, y0 + 18, 13, C.hi, "left", "bold");
    text("F fires the bearing side", bx + 96, y0 + 18, 11, C.dim);
    drawBattery("port", bx, y0 + 30, 250);
    drawBattery("star", bx, y0 + 54, 250);
    let si = 0;
    for (const k of Object.keys(D.SHOT_TYPES)) {
      if (button(bx + si * 84, y0 + 82, 80, 20, D.SHOT_TYPES[k].label, { size: 12, bg: b.shot === k ? "#2c5a3a" : C.panelLt })) b.shot = k;
      si++;
    }
    text(D.SHOT_TYPES[b.shot].desc, bx, y0 + 120, 11, C.dim, "left", "italic");
    const bs = bearingSide(p, e);
    text(bs ? "▶ " + bs + " battery bears" : "turn to bring guns to bear", bx, y0 + 140, 12, bs ? C.green : C.dim, "left", bs ? "bold" : "italic");

    // --- Col 4: enemy, target, board, pause ---
    const ex = 710;
    text("ENEMY " + e.sc.name.toUpperCase(), ex, y0 + 18, 13, C.red, "left", "bold");
    text("Crew " + e.crew + (e.surrendered ? " struck!" : ""), ex, y0 + 34, 12, e.surrendered ? C.gold : C.dim);
    const closeEnough = dist(p, e) <= T.grappleRange && !e.sunk;
    if (button(ex + 120, y0 + 6, 118, 26, closeEnough ? "BOARD (B)" : "board…", { size: 13, bg: closeEnough ? "#7a3d2a" : "#3a2a22", hover: "#9a4d34", disabled: !closeEnough })) tryBoard();
    if (button(ex + 120, y0 + 36, 118, 22, b.paused ? "▶ Resume" : "❚❚ Pause", { size: 12 })) b.paused = !b.paused;
    text("Target ↓ (click a bar)", ex, y0 + 52, 11, C.dim);
    areaBars(ex, y0 + 68, e.areas, true);

    // Hotkeys
    if (consumePress(" ")) b.paused = !b.paused;
    if (consumePress("1")) b.shot = "round";
    if (consumePress("2")) b.shot = "chain";
    if (consumePress("3")) b.shot = "grape";
    if (consumePress("f") || consumePress("F")) firePlayer(null);
    if (consumePress("b") || consumePress("B")) tryBoard();

    if (b.paused) text("— PAUSED (orders still take —", W / 2, HUD_TOP - 8, 16, C.hi, "center", "bold");
    if (b.flashT > 0) { b.flashT -= 0.02; text(b.flash, W / 2, HUD_TOP - 8, 15, C.danger, "center", "bold"); }
  }

  function renderBoardingOverlay() {
    const bd = state.battle.boarding;
    panel(W / 2 - 220, 120, 440, 180, "rgba(12,22,30,0.95)");
    text("BOARDING ACTION", W / 2, 158, 26, C.hi, "center", "bold");
    text("Your crew: " + crewAlive(), W / 2 - 190, 210, 16, C.text);
    bar(W / 2 - 190, 220, 150, 12, crewAlive() / Math.max(1, bd.pCrew), C.green);
    text("Enemy: " + state.battle.enemy.crew, W / 2 + 40, 210, 16, C.text);
    bar(W / 2 + 40, 220, 150, 12, state.battle.enemy.crew / Math.max(1, bd.eCrew), C.danger);
    text("Steel rings across the deck…", W / 2, 270, 16, C.dim, "center", "italic");
  }

  function renderOutcome() {
    const o = state.battle.outcome;
    panel(W / 2 - 250, 150, 500, 240, "rgba(12,22,30,0.96)");
    if (o.kind === "lost") {
      text("DEFEAT", W / 2, 210, 34, C.danger, "center", "bold");
      wrap("Water over the rail, colors down. The sea takes the rest.", W / 2 - 220, 250, 440, 24, 18, C.text, "center");
      if (button(W / 2 - 90, 330, 180, 40, "Continue")) finishBattle();
      return;
    }
    text(o.title, W / 2, 200, 30, C.hi, "center", "bold");
    let y = 240; for (const l of o.lines) { y = wrap(l, W / 2 - 220, y, 440, 22, 16, C.text, "center") + 26; }
    text("+" + o.gold + " gold   +" + o.supplies + " supplies", W / 2, y + 4, 18, C.gold, "center", "bold");
    if (button(W / 2 - 90, 345, 180, 40, "Onward")) finishBattle();
  }

  // ---------------------------------------------------------------------------
  // Port rendering
  // ---------------------------------------------------------------------------
  function renderPort() {
    drawSeaBg();
    const r = state.run, P = state.port;
    panel(20, 20, W - 40, 70);
    text("⚓ " + nodeById(state.map.current).name, 40, 54, 26, C.hi, "left", "bold");
    // Reputation with the three powers.
    let rxp = 40;
    for (const f of Object.keys(D.FACTIONS)) {
      const v = r.rep[f] || 0;
      text(D.FACTIONS[f].label + " " + (v > 0 ? "+" : "") + v, rxp, 80, 13, v > 4 ? C.green : v < -4 ? C.danger : C.dim);
      rxp += ctx.measureText(D.FACTIONS[f].label + " " + v).width + 28;
    }
    text("Gold " + r.gold, W - 360, 48, 18, C.gold, "left", "bold");
    text("Supplies " + r.supplies, W - 360, 74, 15, C.text);
    text("Crew " + r.crew.length + "/" + D.SHIP_CLASSES[r.shipClass].crewCap, W - 200, 48, 18, C.text);
    if (priceMult() !== 1) text((priceMult() < 1 ? "Goodwill: prices down" : "Distrust: prices up"), W - 200, 74, 13, priceMult() < 1 ? C.green : C.danger);

    // tabs
    const tabs = [["yard", "Shipwright"], ["tavern", "Tavern"], ["market", "Market"], ["rumors", "Rumours"]];
    let tx = 40;
    for (const [k, label] of tabs) {
      if (button(tx, 110, 138, 38, label, { bg: P.tab === k ? C.wood : C.panelLt, hover: "#855c33" })) P.tab = k;
      tx += 148;
    }

    panel(40, 165, W - 80, 330);
    if (P.tab === "yard") renderYard();
    else if (P.tab === "tavern") renderTavern();
    else if (P.tab === "market") renderMarket();
    else renderRumors();

    if (button(40, H - 56, 150, 40, "⛵ Set Sail", { bg: C.wood, hover: "#855c33" })) { state.screen = "map"; save(); }
    if (r.gold >= D.PORT.retireGold) {
      if (button(W - 230, H - 56, 190, 40, "Retire Rich (" + D.PORT.retireGold + ")", { bg: "#2c5a3a", hover: "#3f8a4f" })) {
        state.screen = "victory"; clearSave();
      }
    } else {
      text("Reach " + D.PORT.retireGold + " gold to retire a legend.", W - 40, H - 30, 14, C.dim, "right", "italic");
    }
  }

  function renderYard() {
    const r = state.run;
    text("Hull & rigging repairs", 70, 205, 20, C.text, "left", "bold");
    let y = 240;
    for (const ar of D.AREAS) {
      text(ar.label, 70, y, 16, C.text);
      bar(180, y - 11, 160, 12, r.areas[ar.key] / T.areaMax,
        r.areas[ar.key] > 50 ? C.green : C.gold);
      text(ar.effect, 360, y, 13, C.dim, "left", "italic");
      y += 30;
    }
    const cost = repairCost();
    if (cost <= 0) text("Your ship is sound. Nothing to mend.", 70, y + 20, 16, C.green);
    else {
      const can = r.gold >= cost;
      if (button(70, y + 10, 260, 42, "Repair all — " + cost + " gold", { disabled: !can, bg: can ? "#2c5a3a" : undefined, hover: "#3f8a4f" })) {
        if (can) { r.gold -= cost; r.areas = freshAreas(); save(); }
      }
      if (!can) text("Not enough gold for a full repair.", 70, y + 74, 14, C.danger);
    }
  }

  function renderTavern() {
    const r = state.run, P = state.port;
    text("Recruit a hand", 70, 205, 20, C.text, "left", "bold");
    const c = P.recruit;
    panel(70, 225, 360, 200, C.panelLt);
    text(c.name, 90, 258, 20, C.hi, "left", "bold");
    text(D.TRAITS[c.trait].label + " — " + D.TRAITS[c.trait].blurb, 90, 285, 14, C.gold, "left", "italic");
    let sy = 312;
    for (const s of D.SKILLS) { text(s + ": " + c.skills[s], 90, sy, 14, C.text); sy += 20; }
    const cap = D.SHIP_CLASSES[r.shipClass].crewCap;
    const full = r.crew.length >= cap;
    const recruitCost = Math.round(D.PORT.recruitCost * priceMult());
    const can = r.gold >= recruitCost && !full;
    if (button(70, 440, 175, 40, "Sign on — " + recruitCost + " gold", { disabled: !can, bg: can ? "#2c5a3a" : undefined, hover: "#3f8a4f" })) {
      r.gold -= recruitCost; r.crew.push(c); P.recruit = makeCrew({}); save();
    }
    if (button(255, 440, 130, 40, "See another", {})) P.recruit = makeCrew({});
    if (full) text("Your ship is at full complement (" + cap + ").", 460, 260, 15, C.danger);
    text("Your crew (" + r.crew.length + "):", 460, 300, 16, C.text, "left", "bold");
    let cy = 326;
    for (const m of r.crew.slice(0, 7)) {
      text("• " + m.name + " — " + D.TRAITS[m.trait].label + " · " + D.WEAPONS[m.weapon].label, 470, cy, 13, C.dim);
      cy += 19;
    }
    if (r.crew.length > 7) text("…and " + (r.crew.length - 7) + " more", 470, cy, 13, C.dim);
  }

  function renderMarket() {
    const r = state.run;
    text("Provisions", 70, 205, 20, C.text, "left", "bold");
    const supply5 = Math.round(D.PORT.supplyCost * 5 * priceMult());
    const can5 = r.gold >= supply5;
    if (button(70, 220, 240, 38, "Buy 5 supplies — " + supply5 + " gold", { disabled: !can5, bg: can5 ? C.panelLt : undefined })) {
      if (can5) { r.gold -= supply5; r.supplies += 5; save(); }
    }

    text("Arm your crew (boarding gear)", 70, 295, 20, C.text, "left", "bold");
    let x = 70;
    for (const wk of D.PORT.weaponStock) {
      const wp = D.WEAPONS[wk];
      const cost = Math.round(wp.cost * priceMult());
      panel(x, 315, 150, 120, C.panelLt);
      text(wp.label, x + 75, 345, 16, C.hi, "center", "bold");
      text("+" + wp.melee + " melee", x + 75, 370, 14, C.gold, "center");
      text(cost + " gold", x + 75, 392, 14, C.text, "center");
      const can = r.gold >= cost;
      if (button(x + 15, 402, 120, 26, "Equip a hand", { size: 12, disabled: !can })) {
        // Equip the least-armed crew member.
        if (can) {
          const target = r.crew.slice().sort((a, b2) => D.WEAPONS[a.weapon].melee - D.WEAPONS[b2.weapon].melee)[0];
          if (target) { target.weapon = wk; r.gold -= cost; save(); }
        }
      }
      x += 165;
    }
    text("Equips your worst-armed hand. Better steel wins boarding fights.", 70, 460, 14, C.dim, "left", "italic");
  }

  function renderRumors() {
    const r = state.run;
    text("Rumours & Contracts", 70, 200, 20, C.text, "left", "bold");
    // Available quests offered on this board.
    let y = 226;
    const offers = D.PORT_QUESTS.filter((id) => questReqMet(id));
    if (!offers.length) text("No new contracts here for a captain of your standing.", 70, y, 15, C.dim, "left", "italic");
    for (const id of offers) {
      const q = D.QUESTS[id];
      panel(64, y, W - 128, 66, C.panelLt);
      text(q.title, 82, y + 24, 17, C.hi, "left", "bold");
      text("(" + D.FACTIONS[q.faction].label + ")", 300, y + 24, 13, C.gold, "left", "italic");
      wrap(q.blurb, 82, y + 44, W - 360, 16, 13, C.dim);
      const rw = q.reward || {};
      if (button(W - 210, y + 18, 130, 32, "Accept — " + (rw.gold || 0) + "g", { bg: "#2c5a3a", hover: "#3f8a4f", size: 13 })) { addQuest(id); }
      y += 74;
    }
    // Active quest log.
    y = Math.max(y, 360);
    text("Your log", 70, y, 18, C.text, "left", "bold"); y += 24;
    if (!r.quests.length) text("No active contracts.", 70, y, 14, C.dim, "left", "italic");
    for (const id of r.quests) {
      const q = D.QUESTS[id];
      text("• " + q.title + " — " + q.log, 82, y, 14, C.text); y += 20;
    }
    if (r.questsDone.length) text("Completed: " + r.questsDone.length, 70, y + 6, 13, C.green);
  }

  // ---------------------------------------------------------------------------
  // Main loop (fixed timestep) + boot
  // ---------------------------------------------------------------------------
  const STEP = 1 / 60;
  let last = performance.now(), acc = 0;
  function frame(now) {
    let dt = (now - last) / 1000; last = now;
    if (dt > 0.25) dt = 0.25;
    acc += dt;
    const scene = Scenes[state.screen];
    while (acc >= STEP) { if (scene.update) scene.update(STEP); acc -= STEP; }
    scene.render();
    mouse.clicked = false;     // consume any unhandled click
    pressed.length = 0;        // drop unconsumed discrete presses
    requestAnimationFrame(frame);
  }

  // Boot
  state = { screen: "title", run: null, map: null, battle: null };
  // Debug/testing surface (harmless in play — nothing calls it automatically).
  window.BLACKTIDE = {
    get state() { return state; }, D,
    api: { sailTo, openEvent, rollEvent, addQuest, buildPort, startBattle },
  };
  requestAnimationFrame(frame);
})();
