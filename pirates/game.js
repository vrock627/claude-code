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
  const HUD_TOP = 452;               // battle arena occupies y:0..HUD_TOP
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
    // Resolve the destination encounter.
    if (n.type === "enemy") startBattle(n);
    else if (n.type === "port") { state.screen = "port"; buildPort(); }
    else { state.msg = { title: n.name, lines: ["Calm seas. Nothing but salt and horizon."], then: () => { state.screen = "map"; } }; state.screen = "msg"; }
  }

  // ---------------------------------------------------------------------------
  // Battle
  // ---------------------------------------------------------------------------
  function makeBattleShip(shipClassKey, isPlayer, areas, crewCount, gunnery) {
    const sc = D.SHIP_CLASSES[shipClassKey];
    return {
      isPlayer, sc, areas: areas || freshAreas(),
      x: 0, y: 0, heading: 0, speed: 0, sailLevel: 1,
      water: 0, crew: crewCount, gunnery: gunnery || 1,
      reloadPort: rand(0, sc && sc.gunRange ? 1.5 : 1.5), reloadStar: rand(0, 1.5),
      surrendered: false, sunk: false,
    };
  }

  function startBattle(node) {
    const tmpl = D.ENEMIES[node.enemy];
    const player = makeBattleShip(state.run.shipClass, true, state.run.areas, state.run.crew.length, 1 + avgSkill(state.run.crew, "gunnery") * 0.4);
    player.x = T.arenaW * 0.30; player.y = T.arenaH * 0.62; player.heading = -0.5;
    const enemy = makeBattleShip(tmpl.shipClass, false, freshAreas(), tmpl.crew, tmpl.gunnery);
    enemy.x = T.arenaW * 0.68; enemy.y = T.arenaH * 0.32; enemy.heading = Math.PI * 0.8;
    enemy.aggression = tmpl.aggression;

    // Default crew assignment across stations (rest held in reserve for boarding).
    const ideal = player.sc.crewIdeal;
    const st = { guns: Math.min(ideal, state.run.crew.length), sails: 0, helm: 0, pumps: 0 };
    let left = state.run.crew.length - st.guns;
    st.sails = Math.min(ideal, left); left -= st.sails;
    st.helm = Math.min(1, left); left -= st.helm;

    state.battle = {
      node, tmpl, player, enemy,
      stations: st,
      shot: "round", target: "hull",
      paused: false, windDir: rand(-Math.PI, Math.PI),
      boarding: null, log: [], outcome: null, time: 0,
    };
    state.screen = "battle";
  }

  function crewAlive() { return state.run.crew.length; }
  function stationEff(key) {
    const b = state.battle;
    const ideal = b.player.sc.crewIdeal;
    return clamp((b.stations[key] || 0) / ideal, 0, 1.5);
  }
  function reserveCount() {
    const b = state.battle, s = b.stations;
    return crewAlive() - (s.guns + s.sails + s.helm + s.pumps);
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

  function fireBroadside(attacker, defender, side, b, gunnerySkill) {
    const cond = attacker.areas.guns / T.areaMax;
    const nShots = Math.max(1, Math.round(attacker.sc.gunsPerSide * cond));
    const shotKind = attacker.isPlayer ? D.SHOT_TYPES[b.shot] : D.SHOT_TYPES.round;
    const targetArea = attacker.isPlayer ? b.target : "hull";
    const range = dist(attacker, defender);
    const rangeFrac = clamp(range / attacker.sc.gunRange, 0, 1);
    const motionFrac = clamp(defender.speed / defender.sc.maxSpeed, 0, 1);
    let acc = T.accuracyBase
      * (1 - rangeFrac * T.accuracyRangeFalloff)
      * (1 - motionFrac * T.accuracyMotionPenalty)
      * (1 + 0.05 * gunnerySkill);
    acc = clamp(acc, 0.05, 0.96);
    let hits = 0;
    for (let i = 0; i < nShots; i++) if (Math.random() < acc) hits++;
    if (hits > 0) {
      const dmg = hits * shotKind.base * (shotKind.bias[targetArea] || 0.7);
      defender.areas[targetArea] = Math.max(0, defender.areas[targetArea] - dmg);
      // Casualties (deck rakings especially) thin the defender's crew.
      const casChance = shotKind.casualty * (targetArea === "deck" ? 1.5 : 1) * hits * 0.5;
      if (Math.random() < casChance && defender.crew > 0) {
        defender.crew -= 1;
        if (defender.isPlayer && state.run.crew.length > 0) state.run.crew.pop();
      }
      b.log.unshift((attacker.isPlayer ? "You rake" : "They rake") + " the " + targetArea +
        " — " + hits + " hit" + (hits > 1 ? "s" : ""));
      if (b.log.length > 4) b.log.pop();
    }
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
    const helmEff = 0.5 + 0.5 * stationEff("helm");
    const rudder = p.areas.rudder / T.areaMax;
    const turn = p.sc.turnRate * helmEff * (0.3 + 0.7 * rudder);
    if (keys.has("ArrowLeft") || keys.has("a")) p.heading = normAngle(p.heading - turn * dt);
    if (keys.has("ArrowRight") || keys.has("d")) p.heading = normAngle(p.heading + turn * dt);
    if (consumePress("ArrowUp") || consumePress("w")) p.sailLevel = clamp(p.sailLevel + 0.25, 0, 1);
    if (consumePress("ArrowDown") || consumePress("s")) p.sailLevel = clamp(p.sailLevel - 0.25, 0, 1);

    const sailEffP = 0.55 + 0.45 * stationEff("sails");
    stepShip(p, b.windDir, shipMaxSpeed(p, b.windDir, sailEffP) * p.sailLevel, dt);

    // Player pumps fight flooding.
    const pumpPower = stationEff("pumps") * T.pumpRate;
    updateFlooding(p, pumpPower, dt);

    // Player guns auto-fire when a broadside bears, in range, and reloaded.
    p.reloadPort -= dt; p.reloadStar -= dt;
    const gunnery = 1 + avgSkill(state.run.crew, "gunnery");
    let reloadMult = 1;
    if (state.run.captain && D.CAPTAIN_TRAITS[state.run.captain].perk.reloadMult)
      reloadMult = D.CAPTAIN_TRAITS[state.run.captain].perk.reloadMult;
    const reloadTime = (T.reloadBase * reloadMult) / (0.5 + stationEff("guns"));
    if (!e.sunk && dist(p, e) <= p.sc.gunRange) {
      const side = bearingSide(p, e);
      if (side === "port" && p.reloadPort <= 0) { fireBroadside(p, e, side, b, gunnery); p.reloadPort = reloadTime; }
      if (side === "star" && p.reloadStar <= 0) { fireBroadside(p, e, side, b, gunnery); p.reloadStar = reloadTime; }
    }

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

    e.reloadPort -= dt; e.reloadStar -= dt;
    const reloadTime = T.reloadBase / (0.5 + 1.0);   // enemy at ~ideal manning
    if (range <= e.sc.gunRange) {
      const side = bearingSide(e, p);
      if (side === "port" && e.reloadPort <= 0) { fireBroadside(e, p, side, b, e.gunnery); e.reloadPort = reloadTime; }
      if (side === "star" && e.reloadStar <= 0) { fireBroadside(e, p, side, b, e.gunnery); e.reloadStar = reloadTime; }
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
    while (bd.pCasualty >= 1 && state.run.crew.length > 0) { state.run.crew.pop(); bd.pCasualty -= 1; }
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
    return Math.round(cost);
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

  function renderBattleHUD() {
    const b = state.battle, p = b.player, e = b.enemy;
    panel(0, HUD_TOP, W, H - HUD_TOP, C.panel);

    // Left: own ship
    text("YOUR " + p.sc.name.toUpperCase(), 16, HUD_TOP + 24, 15, C.hi, "left", "bold");
    text("Crew " + crewAlive(), 200, HUD_TOP + 24, 14, C.text);
    areaBars(16, HUD_TOP + 44, p.areas, false);
    text("Water", 16, HUD_TOP + 142, 13, C.text);
    bar(76, HUD_TOP + 132, 90, 10, p.water / T.floodSink, C.blue);

    // Middle: stations
    const mx = 250;
    text("CREW STATIONS", mx, HUD_TOP + 24, 15, C.hi, "left", "bold");
    text("Reserve " + reserveCount(), mx + 165, HUD_TOP + 24, 13, C.dim);
    let sy = HUD_TOP + 40;
    for (const st of D.STATIONS) {
      text(st.label, mx, sy + 13, 14, C.text);
      const assigned = b.stations[st.key] || 0;
      if (button(mx + 70, sy, 22, 18, "–", { size: 14 })) {
        if (assigned > 0) b.stations[st.key]--;
      }
      text(String(assigned), mx + 100, sy + 14, 15, C.text, "center");
      if (button(mx + 112, sy, 22, 18, "+", { size: 14, disabled: reserveCount() <= 0 })) {
        if (reserveCount() > 0) b.stations[st.key]++;
      }
      bar(mx + 144, sy + 4, 70, 10, stationEff(st.key) / 1.5, C.blue);
      sy += 23;
    }
    text("Sail " + Math.round(p.sailLevel * 100) + "%   (↑/↓ keys)", mx, sy + 14, 13, C.dim);

    // Right: enemy + orders
    const rx = 500;
    text("ENEMY " + e.sc.name.toUpperCase(), rx, HUD_TOP + 24, 15, C.red, "left", "bold");
    text("Crew " + e.crew + (e.surrendered ? " (struck!)" : ""), rx + 180, HUD_TOP + 24, 13, e.surrendered ? C.gold : C.dim);
    text("Target ↓ (click)", rx, HUD_TOP + 40, 12, C.dim);
    areaBars(rx, HUD_TOP + 56, e.areas, true);

    // Shot type selector
    const sx = 658; let i = 0;
    text("SHOT", sx, HUD_TOP + 40, 12, C.dim);
    for (const k of Object.keys(D.SHOT_TYPES)) {
      const sel = b.shot === k;
      if (button(sx, HUD_TOP + 48 + i * 24, 145, 20, D.SHOT_TYPES[k].label, { size: 13, bg: sel ? "#2c5a3a" : C.panelLt }))
        b.shot = k;
      i++;
    }
    text(D.SHOT_TYPES[b.shot].desc, sx, HUD_TOP + 132, 12, C.dim, "left", "italic");

    // Board + pause buttons (own column, clear of the shot selector)
    const actX = 812;
    const closeEnough = dist(p, e) <= T.grappleRange && !e.sunk;
    if (button(actX, HUD_TOP + 48, 130, 34, "BOARD (B)", { bg: closeEnough ? "#7a3d2a" : "#3a2a22", hover: "#9a4d34", disabled: !closeEnough }))
      tryBoard();
    if (button(actX, HUD_TOP + 90, 130, 26, b.paused ? "▶ Resume" : "❚❚ Pause", { size: 13 }))
      b.paused = !b.paused;
    text(closeEnough ? "alongside!" : "close to grapple", actX + 65, HUD_TOP + 132, 11, closeEnough ? C.green : C.dim, "center", "italic");

    // Hotkeys
    if (consumePress(" ")) b.paused = !b.paused;
    if (consumePress("1")) b.shot = "round";
    if (consumePress("2")) b.shot = "chain";
    if (consumePress("3")) b.shot = "grape";
    if (consumePress("b") || consumePress("B")) tryBoard();

    if (b.paused) text("— PAUSED —", W / 2, HUD_TOP - 10, 18, C.hi, "center", "bold");
    if (b.flashT > 0) { b.flashT -= 0.02; text(b.flash, W / 2, HUD_TOP + 150, 15, C.danger, "center", "bold"); }
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
    text("⚓ " + nodeById(state.map.current).name, 40, 64, 30, C.hi, "left", "bold");
    text("Gold " + r.gold, W - 360, 50, 18, C.gold, "left", "bold");
    text("Supplies " + r.supplies, W - 360, 76, 16, C.text);
    text("Crew " + r.crew.length + "/" + D.SHIP_CLASSES[r.shipClass].crewCap, W - 200, 50, 18, C.text);

    // tabs
    const tabs = [["yard", "Shipwright"], ["tavern", "Tavern"], ["market", "Market"]];
    let tx = 40;
    for (const [k, label] of tabs) {
      if (button(tx, 110, 150, 38, label, { bg: P.tab === k ? C.wood : C.panelLt, hover: "#855c33" })) P.tab = k;
      tx += 162;
    }

    panel(40, 165, W - 80, 330);
    if (P.tab === "yard") renderYard();
    else if (P.tab === "tavern") renderTavern();
    else renderMarket();

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
    const can = r.gold >= D.PORT.recruitCost && !full;
    if (button(70, 440, 175, 40, "Sign on — " + D.PORT.recruitCost + " gold", { disabled: !can, bg: can ? "#2c5a3a" : undefined, hover: "#3f8a4f" })) {
      r.gold -= D.PORT.recruitCost; r.crew.push(c); P.recruit = makeCrew({}); save();
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
    const can5 = r.gold >= D.PORT.supplyCost * 5;
    if (button(70, 220, 240, 38, "Buy 5 supplies — " + D.PORT.supplyCost * 5 + " gold", { disabled: !can5, bg: can5 ? C.panelLt : undefined })) {
      if (can5) { r.gold -= D.PORT.supplyCost * 5; r.supplies += 5; save(); }
    }

    text("Arm your crew (boarding gear)", 70, 295, 20, C.text, "left", "bold");
    let x = 70;
    for (const wk of D.PORT.weaponStock) {
      const wp = D.WEAPONS[wk];
      panel(x, 315, 150, 120, C.panelLt);
      text(wp.label, x + 75, 345, 16, C.hi, "center", "bold");
      text("+" + wp.melee + " melee", x + 75, 370, 14, C.gold, "center");
      text(wp.cost + " gold", x + 75, 392, 14, C.text, "center");
      const can = r.gold >= wp.cost;
      if (button(x + 15, 402, 120, 26, "Equip a hand", { size: 12, disabled: !can })) {
        // Equip the least-armed crew member.
        if (can) {
          const target = r.crew.slice().sort((a, b2) => D.WEAPONS[a.weapon].melee - D.WEAPONS[b2.weapon].melee)[0];
          if (target) { target.weapon = wk; r.gold -= wp.cost; save(); }
        }
      }
      x += 165;
    }
    text("Equips your worst-armed hand. Better steel wins boarding fights.", 70, 460, 14, C.dim, "left", "italic");
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
  window.BLACKTIDE = { get state() { return state; }, D };   // for debugging
  requestAnimationFrame(frame);
})();
