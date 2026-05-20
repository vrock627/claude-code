(function () {
  const D = window.GAMEDATA;
  const T = D.TUNING;
  const SAVE_KEY = "lifeSimSave_v5";
  const CHAR_IDS = Object.keys(D.CHARACTERS);
  let state = null;

  const perChar = (mk) => { const o = {}; for (const id of CHAR_IDS) o[id] = mk(); return o; };
  function rollLibido(c) { const [lo, hi] = c.libidoRange; return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function freshBars(id) { return { affection: 0, romance: 0, libidoBase: rollLibido(D.CHARACTERS[id]), libidoTemp: 0, attrEvent: 0 }; }
  function statsFromPicks(picks) {
    const out = {}; for (const s of D.STATS) out[s] = 0;
    for (const cat of D.BG_CATEGORIES) {
      const opt = cat.opts.find((o) => o.id === (picks && picks[cat.id]));
      if (!opt) continue;
      for (const s of D.STATS) out[s] += opt.stats[s] || 0;
    }
    return out;
  }
  function freshState(picks) {
    const bars = {}; for (const id of CHAR_IDS) bars[id] = freshBars(id);
    return {
      bgPicks: Object.assign({}, picks), stats: statsFromPicks(picks),
      day: 1, phaseIndex: 0, money: T.startMoney, bars,
      job: "freelance", owned: { house: "studio", car: "none" }, lastRollover: null,
      metCount: perChar(() => 0), learned: perChar(() => []),
      milestones: perChar(() => ({ number: false, kiss: false, sex: false, secondSex: false, dates: 0 })),
      preg: perChar(() => null),
      inventory: {}, buffs: [], textedToday: perChar(() => false),
      party: null, partyRun: null, convo: null, date: null, pg: null,
      flags: {},
    };
  }

  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const phaseName = () => D.PHASES[state.phaseIndex];
  // Per-character voice lookup: voiceFor("krystalle","venues.cafe.beats.0.opts.1.said")
  // returns null when any segment is missing, so callers can fall back.
  function voiceFor(id, path) {
    const v = D.CHARACTERS[id] && D.CHARACTERS[id].voice; if (!v) return null;
    let n = v; for (const seg of String(path).split(".")) { if (n == null) return null; n = n[seg]; }
    return n == null ? null : n;
  }
  // Per-character gate override: gateFor("krystalle","homeRomance",45) → her
  // override if present, else fallback.
  function gateFor(id, key, fallback) {
    const g = D.CHARACTERS[id] && D.CHARACTERS[id].gates;
    return g && typeof g[key] === "number" ? g[key] : fallback;
  }
  // Pool helper: voice slots can be string OR array of strings. If array,
  // pick deterministically by `seed` so a re-render of the same screen
  // doesn't reshuffle. If no seed, pick random.
  function pick(v, seed) {
    if (v == null) return null;
    if (!Array.isArray(v)) return v;
    if (!v.length) return null;
    if (seed == null) return v[Math.floor(Math.random() * v.length)];
    return v[hashStr(String(seed)) % v.length];
  }
  // Stage system (Krystalle, today; other chars may opt in later).
  // Reads milestones + bars; pure function.
  function krystStage() {
    if (!state) return "stranger";
    const m = state.milestones.krystalle || {}, b = state.bars.krystalle || {};
    if (m.secondSex) return "affair";
    if (m.sex) return "lover";
    if (m.kiss || (b.romance || 0) >= 30) return "flirting";
    if (state.flags && state.flags.krystalleMet) return "friend";
    return "stranger";
  }
  function stageFor_(id) { return id === "krystalle" ? krystStage() : null; }
  const replaceN = (s, name) => String(s).replace(/\{n\}/g, name);
  const weekdayName = () => D.WEEKDAYS[((state.day - 1) % 7 + 7) % 7];
  const jobDef = () => D.JOBS[state.job] || D.JOBS.freelance;
  const houseDef = () => D.HOUSES[state.owned.house] || D.HOUSES.studio;
  const carDef = () => D.CARS[state.owned.car] || D.CARS.none;
  const canDrive = () => !!carDef().drive;
  function workSlotNow() {
    const j = jobDef(); if (!j || !j.schedule) return false;
    const slots = j.schedule[weekdayName()];
    return !!(slots && slots.indexOf(phaseName()) !== -1);
  }
  function homeRoomAllowed(roomKey) {
    return houseDef().rooms.indexOf(roomKey) !== -1;
  }
  // Apply a small affection nudge from her trait-read of the player's
  // house (positive only — a cheap house just doesn't impress).
  function houseImpressFor(id) {
    const ta = D.CHARACTERS[id].traitAffinity || {}, imp = houseDef().impress || {};
    let s = 0; for (const k of Object.keys(imp)) s += (ta[k] || 0) * imp[k];
    return Math.max(0, Math.round(s));
  }
  // Per-character read of the car. Returns {penalty, bonus} — penalty
  // is what a beater costs you with classy types; bonus is the inverse.
  function carRead(id) {
    const ta = D.CHARACTERS[id].traitAffinity || {}, car = carDef();
    let pen = 0, bon = 0;
    for (const k of Object.keys(car.dislike || {})) pen += (ta[k] || 0) * car.dislike[k];
    for (const k of Object.keys(car.impress || {})) bon += (ta[k] || 0) * car.impress[k];
    return { penalty: Math.max(0, pen), bonus: Math.max(0, bon) };
  }
  // Rent + lease at day rollover. If you can't cover both at your
  // current tiers, drop the car first (cheaper to lose), then the house,
  // to the best combo you CAN afford. Records a notice for the next
  // render so the player sees what got cut.
  function chargeRecurring() {
    const housesByTier = Object.entries(D.HOUSES).sort((a, b) => b[1].tier - a[1].tier);
    const carsByTier = Object.entries(D.CARS).sort((a, b) => b[1].tier - a[1].tier);
    const curHouse = state.owned.house, curCar = state.owned.car;
    let rent = houseDef().rent, lease = carDef().lease, total = rent + lease;
    if (state.money >= total) { state.money -= total; state.lastRollover = null; return; }
    // Try downgrading the car first (cheaper hit on her), keeping house.
    let bestHouse = curHouse, bestCar = curCar, bestCost = total;
    for (const [cid, cdef] of carsByTier) {
      if (cdef.tier > carDef().tier) continue;
      const cost = rent + cdef.lease;
      if (cost <= state.money) { bestCar = cid; bestCost = cost; break; }
    }
    if (bestCost > state.money) {
      // Still not enough — also walk house down (cheapest car always 0).
      for (const [hid, hdef] of housesByTier) {
        if (hdef.tier > houseDef().tier) continue;
        const cost = hdef.rent; // pair with no car
        if (cost <= state.money) { bestHouse = hid; bestCar = "none"; bestCost = cost; break; }
      }
    }
    if (bestCost > state.money) {
      // Floor: studio + none, deduct what we can (mirror bill tolerance).
      bestHouse = "studio"; bestCar = "none"; bestCost = D.HOUSES.studio.rent;
    }
    const note = { downHouse: bestHouse !== curHouse ? { from: curHouse, to: bestHouse } : null,
                   downCar: bestCar !== curCar ? { from: curCar, to: bestCar } : null };
    state.owned.house = bestHouse; state.owned.car = bestCar;
    state.money = Math.max(0, state.money - bestCost);
    state.lastRollover = note;
  }
  const round1 = (n) => Math.round(n * 10) / 10;
  const d20 = () => 1 + Math.floor(Math.random() * 20);
  const one = (a) => a[Math.floor(Math.random() * a.length)];
  function pickN(a, n) { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x.slice(0, n); }

  function effStat(s) { let v = state.stats[s]; for (const b of state.buffs) if (b.stat === s) v += b.amount; return Math.max(0, Math.floor(v)); }
  // Stable per-id hash — keeps the variance term deterministic so the
  // HUD doesn't flicker on every re-render.
  function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  function attraction(id) {
    const c = D.CHARACTERS[id];
    // STR + STY dominate for everyone (physical read).
    const phys = clamp((effStat("strength") + effStat("style")) * (T.attrPhysK / 2), 0, T.attrPhysCap);
    // Per-character interest term — who reads you well.
    let interest = 0;
    for (const s of D.STATS) interest += (c.attractProfile[s] || 0) * effStat(s);
    interest *= T.attrInterestK;
    // Deterministic spread so two characters look different even with the
    // same build (and the value is stable across re-renders).
    const span = T.attrVarianceSpan || 0;
    const spread = span ? ((hashStr(id) % (span + 1)) - Math.floor(span / 2)) : 0;
    const base = clamp(Math.round(phys + interest + spread), 0, T.attractBaseCap);
    return clamp(base + clamp(state.bars[id].attrEvent, 0, T.attractEventCap), 0, T.barCap);
  }
  function barVal(id, bar) {
    if (bar === "attraction") return attraction(id);
    if (bar === "libido") return clamp(state.bars[id].libidoBase + state.bars[id].libidoTemp, 0, T.barCap);
    return clamp(state.bars[id][bar], 0, T.barCap);
  }
  function adjustBar(id, bar, delta) {
    if (!delta) return;
    // Per-character libido throttle: keeps slow-burn characters slow even
    // when many small bumps would otherwise pile up. Negative deltas pass
    // through unchanged (decay still works at full rate).
    if (bar === "libido" && delta > 0) {
      const mul = (D.CHARACTERS[id] && D.CHARACTERS[id].libidoGainMul);
      if (typeof mul === "number") delta = Math.max(1, Math.round(delta * mul));
    }
    if (bar === "attraction") state.bars[id].attrEvent = clamp(state.bars[id].attrEvent + delta, 0, T.attractEventCap);
    else if (bar === "libido") state.bars[id].libidoTemp += delta;
    else state.bars[id][bar] = clamp(state.bars[id][bar] + delta, 0, T.barCap);
  }
  function composite(id) { const w = D.CHARACTERS[id].barWeights; let s = 0; for (const b of D.BARS) s += (w[b] || 0) * barVal(id, b); return Math.round(s); }
  function stageFor(v) { let s = D.STAGES[0].name; for (const t of D.STAGES) if (v >= t.min) s = t.name; return s; }
  function moodOf(id) { const c = composite(id); return c < 15 ? "cold" : c < 35 ? "neutral" : c < 60 ? "warm" : "hot"; }
  function rollTable(tbl) {
    let r = Math.random(), a = 0;
    for (const s of tbl) { a += s.p; if (r <= a) return s.min === s.max ? s.min : round1(s.min + Math.random() * (s.max - s.min)); }
    const l = tbl[tbl.length - 1]; return l.min === l.max ? l.min : round1(l.min + Math.random() * (l.max - l.min));
  }
  function tierOf(r, total, dc) { const m = total - dc; if (r === 20 || m >= 10) return "crit"; if (m >= 0) return "success"; if (r === 1 || m <= -8) return "fail"; return "partial"; }

  function isPartyNow() { return state.party && state.party.day === state.day && state.party.phaseIndex === state.phaseIndex; }
  function partyGuests() { return state.party && state.party.guests ? state.party.guests : []; }
  function presentAt(locId) {
    if (isPartyNow()) return locId === "party" ? partyGuests().slice() : [];
    return CHAR_IDS.filter((id) => D.CHARACTERS[id].schedule[phaseName()] === locId);
  }
  function scheduleParty() {
    const ni = D.PHASES.indexOf("Night");
    const n = D.PARTY.guestsMin + Math.floor(Math.random() * (D.PARTY.guestsMax - D.PARTY.guestsMin + 1));
    const guests = pickN(CHAR_IDS, Math.min(n, CHAR_IDS.length));
    state.party = state.phaseIndex < ni ? { day: state.day, phaseIndex: ni, guests } : { day: state.day + 1, phaseIndex: ni, guests };
  }
  function maybeParty() { if (state.party || state.partyRun) return false; if (Math.random() < T.partyInviteChance) { scheduleParty(); return true; } return false; }
  function advancePhase() {
    state.convo = null; state.date = null; state.pg = null; state.partyRun = null;
    state.buffs = state.buffs.map((b) => ({ ...b, phasesLeft: b.phasesLeft - 1 })).filter((b) => b.phasesLeft > 0);
    state.phaseIndex += 1;
    if (state.phaseIndex >= D.PHASES.length) {
      state.phaseIndex = 0; state.day += 1; chargeRecurring(); state.textedToday = perChar(() => false);
      for (const id of CHAR_IDS) {
        const c = D.CHARACTERS[id], b = state.bars[id];
        b.affection = clamp(b.affection - c.decay.affection, 0, T.barCap);
        b.romance = clamp(b.romance - c.decay.romance, 0, T.barCap);
        b.libidoBase = rollLibido(c); b.libidoTemp = 0;
      }
      if (state.party && state.party.day < state.day) state.party = null;
    }
    renderPhase();
  }

  const screen = () => document.getElementById("screen");
  function el(t, c, x) { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function button(label, fn, cls, dis) { const b = el("button", cls || "choice", label); if (dis) b.disabled = true; else b.addEventListener("click", fn); return b; }
  const clearScreen = () => (screen().innerHTML = "");

  function renderHud() {
    const hud = document.getElementById("hud"); const playing = !!state;
    hud.classList.toggle("hidden", !playing); document.getElementById("toolbar").classList.toggle("hidden", !playing);
    if (!playing) return; hud.innerHTML = "";
    const top = el("div", "hud-top");
    top.appendChild(el("span", "hud-time", `${weekdayName()} · Day ${state.day} · ${phaseName()}`));
    const right = el("div", "hud-right");
    right.appendChild(el("span", "money", `$${state.money}`)); right.appendChild(el("span", "chip", "📱"));
    top.appendChild(right); hud.appendChild(top);
    const life = el("div", "stat-chips");
    life.appendChild(el("span", "chip", `${houseDef().emoji} ${houseDef().name} ($${houseDef().rent}/d)`));
    life.appendChild(el("span", "chip", `${carDef().emoji} ${carDef().name}${carDef().lease ? ` ($${carDef().lease}/d)` : ""}`));
    life.appendChild(el("span", "chip", `${jobDef().emoji} ${jobDef().name}`));
    hud.appendChild(life);
    const sc = el("div", "stat-chips");
    for (const s of D.STATS) {
      const e = effStat(s), buffed = e !== Math.floor(state.stats[s]), frac = state.stats[s] - Math.floor(state.stats[s]);
      const chip = el("span", buffed ? "chip buffed" : "chip"); chip.textContent = `${D.STAT_SHORT[s]} ${e}${frac > 0 ? "·" : ""}`; sc.appendChild(chip);
    }
    hud.appendChild(sc);
    if (state.buffs.length) { const bw = el("div", "buffs"); for (const b of state.buffs) bw.appendChild(el("span", "buff", `${D.STAT_SHORT[b.stat]} ${b.amount > 0 ? "+" : ""}${b.amount}·${b.phasesLeft}p`)); hud.appendChild(bw); }
    const people = el("div", "people");
    for (const id of CHAR_IDS) {
      const c = D.CHARACTERS[id], comp = composite(id), m = state.milestones[id];
      const card = el("div", "person");
      const pg = state.preg[id];
      const marks = `${m.number ? " ☎" : ""}${m.dates ? ` 💞${m.dates}` : ""}${m.kiss ? " 💋" : ""}${pg ? (pg.status === "together" ? " 👶" : " 🤰") : ""}`;
      card.appendChild(el("div", "person-name", `${c.emoji} ${c.name}${marks}`));
      card.appendChild(el("div", "person-stage", `${stageFor(comp)} · Interest ${comp}`));
      const cs = clothStatus(id);
      if (cs) card.appendChild(el("div", "person-cloth", `👗 ${cs}`));
      const bars = el("div", "barset");
      for (const b of D.BARS) {
        const v = barVal(id, b), row = el("div", "barrow");
        row.appendChild(el("span", "barlbl", D.BAR_SHORT[b]));
        const tr = el("div", `bar mini b-${b}`); const fl = el("div", "fill"); fl.style.width = `${v}%`; tr.appendChild(fl);
        row.appendChild(tr); row.appendChild(el("span", "barnum", String(v))); bars.appendChild(row);
      }
      card.appendChild(bars);
      const known = state.learned[id].length;
      if (state.metCount[id] >= T.revealAfter) card.appendChild(el("div", "person-hint", c.hint + (known ? ` · ${known} learned` : "")));
      else card.appendChild(el("div", "person-hint dim", "Talk to her a few times to read her…"));
      people.appendChild(card);
    }
    hud.appendChild(people);
  }

  function renderTitle() {
    state = null; renderHud(); clearScreen();
    const w = el("div", "title");
    w.appendChild(el("h1", null, "Heartbeat City"));
    w.appendChild(el("p", "subtitle", "A tiny life-sim. Build yourself, read people, win someone over. No clock, no endings — just the long game."));
    const b = el("div", "title-buttons");
    b.appendChild(button("New Game", renderCreate, "primary"));
    const cont = button("Continue", () => { if (loadGame()) renderPhase(); }, "choice");
    if (!hasSave()) cont.disabled = true;
    b.appendChild(cont); w.appendChild(b); screen().appendChild(w);
  }
  let createDraft = null;
  function renderCreate() {
    createDraft = {}; renderCreateStep(0);
  }
  function renderCreateStep(stepIdx) {
    clearScreen();
    const cat = D.BG_CATEGORIES[stepIdx];
    const w = el("div", "create");
    w.appendChild(el("h2", null, `Who are you?  ·  ${stepIdx + 1}/${D.BG_CATEGORIES.length}`));
    w.appendChild(el("p", "subtitle", `${cat.name}. ${cat.blurb}`));
    // Running total preview so the player can see the stat shape forming.
    const running = statsFromPicks(createDraft);
    const tot = D.STATS.reduce((a, s) => a + running[s], 0);
    const preview = el("div", "stat-chips");
    for (const s of D.STATS) preview.appendChild(el("span", "chip", `${D.STAT_SHORT[s]} ${running[s]}`));
    preview.appendChild(el("span", "chip buffed", `Total ${tot}/18`));
    w.appendChild(preview);
    const grid = el("div", "bg-grid");
    for (const opt of cat.opts) {
      const card = el("div", "bg-card");
      card.appendChild(el("div", "bg-emoji", opt.emoji));
      card.appendChild(el("div", "bg-name", opt.name));
      card.appendChild(el("div", "bg-blurb", opt.blurb));
      const st = el("div", "bg-stats");
      for (const s of D.STATS) if (opt.stats[s]) st.appendChild(el("span", "chip", `${D.STAT_SHORT[s]} +${opt.stats[s]}`));
      card.appendChild(st);
      const isLast = stepIdx + 1 >= D.BG_CATEGORIES.length;
      card.appendChild(button(isLast ? "Begin" : "Choose", () => {
        createDraft[cat.id] = opt.id;
        if (isLast) { state = freshState(createDraft); saveGame(); renderPhase(); }
        else renderCreateStep(stepIdx + 1);
      }, "primary"));
      grid.appendChild(card);
    }
    w.appendChild(grid);
    const nav = el("div", "choices");
    if (stepIdx > 0) nav.appendChild(button("← Back", () => renderCreateStep(stepIdx - 1), "choice subtle"));
    nav.appendChild(button("Cancel", renderTitle, "choice subtle"));
    w.appendChild(nav);
    screen().appendChild(w);
  }

  function renderPhase() {
    saveGame(); renderHud(); clearScreen();
    const w = el("div", "phase");
    w.appendChild(el("h2", null, `${weekdayName()} · Day ${state.day} — ${phaseName()}`));
    if (state.lastRollover) {
      const r = state.lastRollover, bits = [];
      if (r.downCar) bits.push(`returned the ${D.CARS[r.downCar.from].name} — back to the ${D.CARS[r.downCar.to].name}`);
      if (r.downHouse) bits.push(`couldn't make rent on the ${D.HOUSES[r.downHouse.from].name} — moved into the ${D.HOUSES[r.downHouse.to].name}`);
      if (bits.length) w.appendChild(el("p", "char-line dim", `💸 Rent day: ${bits.join("; ")}.`));
      state.lastRollover = null;
    }
    if (workSlotNow()) {
      const j = jobDef();
      w.appendChild(el("p", "char-line", `🛠️ You're on shift — ${j.name}. Nothing else is happening this part of the day.`));
      if (isPartyNow()) w.appendChild(el("p", "char-line dim", "📨 (A party tonight, but your shift's running through it. You'll miss this one.)"));
      const o = el("div", "choices");
      o.appendChild(button(`Clock out  (+$${j.wage})`, () => {
        state.money += j.wage;
        if (isPartyNow()) state.party = null; // shift ate the party slot
        advancePhase();
      }, "primary"));
      w.appendChild(o); screen().appendChild(w); return;
    }
    w.appendChild(el("p", "subtitle", "Where to? One thing per part of the day."));
    const grid = el("div", "loc-grid");
    if (isPartyNow()) {
      const card = el("div", "loc-card party");
      card.appendChild(el("div", "loc-emoji", "🎉")); card.appendChild(el("div", "loc-name", "House Party"));
      card.appendChild(el("div", "loc-blurb", "Somebody's place. Loud, packed, going late."));
      card.appendChild(el("div", "loc-who", partyGuests().map((id) => `${D.CHARACTERS[id].emoji} ${D.CHARACTERS[id].name}`).join(", ")));
      card.appendChild(button("Go", renderParty, "primary"));
      grid.appendChild(card);
    }
    for (const [id, loc] of Object.entries(D.LOCATIONS)) {
      const here = presentAt(id), card = el("div", "loc-card");
      card.appendChild(el("div", "loc-emoji", loc.emoji)); card.appendChild(el("div", "loc-name", loc.name)); card.appendChild(el("div", "loc-blurb", loc.blurb));
      card.appendChild(el("div", "loc-who", here.length ? here.map((h) => `${D.CHARACTERS[h].emoji} ${D.CHARACTERS[h].name}`).join(", ") : loc.home ? "Rest, bag" : "No one you know"));
      card.appendChild(button("Go", () => renderLocation(id), "primary"));
      grid.appendChild(card);
    }
    w.appendChild(grid);
    const tools = el("div", "choices");
    tools.appendChild(button("📱 Phone", () => renderPhone(renderPhase), "choice subtle"));
    tools.appendChild(button("🏷️ Life", () => renderLife(renderPhase), "choice subtle"));
    tools.appendChild(button(`Open bag${invCount() ? ` (${invCount()})` : ""}`, () => renderBag(renderPhase), "choice subtle"));
    w.appendChild(tools); screen().appendChild(w);
  }
  const invCount = () => Object.values(state.inventory).reduce((a, b) => a + b, 0);

  function renderLocation(locId) {
    const loc = D.LOCATIONS[locId];
    if (loc.home) return renderHome();
    renderHud(); clearScreen();
    const w = el("div", "location");
    w.appendChild(el("h2", null, `${loc.emoji} ${loc.name}`));
    w.appendChild(el("p", "char-line", loc.arrive || loc.blurb));
    const here = presentAt(locId);
    if (here.length) w.appendChild(el("p", "subtitle", here.map((h) => `${D.CHARACTERS[h].name} is here.`).join(" ")));
    const opts = el("div", "choices");
    for (const id of here) opts.appendChild(button(`Talk to ${D.CHARACTERS[id].name}`, () => startConvo(id, locId, false), "primary"));
    if (loc.action) opts.appendChild(button(`${loc.action.label}  (train ${D.STAT_SHORT[loc.action.stat]})`, () => renderEffort(locId), "choice"));
    if (loc.work) opts.appendChild(button(`${loc.work.label}  (+$${loc.work.wage})`, () => renderWorkChoice(locId), "choice"));
    if (D.SHOPS[locId]) opts.appendChild(button("Browse the shop", () => renderShop(locId), "choice"));
    opts.appendChild(button(`Open bag${invCount() ? ` (${invCount()})` : ""}`, () => renderBag(() => renderLocation(locId)), "choice subtle"));
    opts.appendChild(button("Head out (skip)", advancePhase, "choice subtle"));
    w.appendChild(opts); screen().appendChild(w);
  }
  function renderEffort(locId) {
    renderHud(); clearScreen();
    const a = D.LOCATIONS[locId].action, w = el("div", "talk");
    w.appendChild(el("div", "talk-head", a.label));
    w.appendChild(el("p", "talk-prompt", `How hard do you push? (training ${D.STAT_LABEL[a.stat]})`));
    const o = el("div", "choices");
    o.appendChild(button(`${T.statModes.easy.label} — small but reliable`, () => doEnvironment(locId, "easy"), "choice"));
    o.appendChild(button(`${T.statModes.focused.label} — balanced`, () => doEnvironment(locId, "focused"), "choice"));
    o.appendChild(button(`${T.statModes.allout.label} — boom or bust`, () => doEnvironment(locId, "allout"), "choice"));
    o.appendChild(button("Back", () => renderLocation(locId), "choice subtle"));
    w.appendChild(o); screen().appendChild(w);
  }
  function doEnvironment(locId, mode) {
    const loc = D.LOCATIONS[locId], a = loc.action, gain = rollTable(T.statModes[mode].roll);
    state.stats[a.stat] = clamp(state.stats[a.stat] + gain, 0, T.statCap);
    const lines = [a.text];
    if (gain === 0) lines.push(`Nothing sticks today. ${D.STAT_SHORT[a.stat]} unchanged.`);
    else if (gain < 1) lines.push(`A little progress. ${D.STAT_SHORT[a.stat]} +${gain} (now ${round1(state.stats[a.stat])}).`);
    else lines.push(`That clicked. ${D.STAT_SHORT[a.stat]} +${gain} (now ${round1(state.stats[a.stat])}).`);
    if (loc.social && maybeParty()) lines.push("📨 Word of a house party tonight reaches you — and a couple of names on the list.");
    renderResult({ title: gain === 0 ? "Off day" : gain >= 2 ? "Breakthrough" : "Time well spent", lines, tone: gain === 0 ? "neutral" : "good" });
  }
  function renderWorkChoice(locId) {
    renderHud(); clearScreen();
    const wk = D.LOCATIONS[locId].work, w = el("div", "talk");
    w.appendChild(el("div", "talk-head", wk.label));
    w.appendChild(el("p", "talk-prompt", `Base pay $${wk.wage}. How do you work it?`));
    const o = el("div", "choices");
    o.appendChild(button(`${T.workModes.easy.label} — flat $${wk.wage}`, () => doWork(locId, "easy"), "choice"));
    o.appendChild(button(`${T.workModes.hustle.label} — risk it for big tips`, () => doWork(locId, "hustle"), "choice"));
    o.appendChild(button("Back", () => renderLocation(locId), "choice subtle"));
    w.appendChild(o); screen().appendChild(w);
  }
  function doWork(locId, mode) {
    const wk = D.LOCATIONS[locId].work; let pay = wk.wage, note = wk.text;
    if (mode === "hustle") { const r = d20(); if (r >= 14) { pay = Math.round(wk.wage * 1.5); note = "You work every table like it owes you money. Tips pour in."; } else if (r <= 6) { pay = Math.round(wk.wage * 0.7); note = "Dead crowd, stingy tips."; } else note = "Steady grind, normal night."; }
    state.money += pay;
    renderResult({ title: "Shift done", lines: [note, `+$${pay} → $${state.money}`], tone: "good" });
  }
  function renderHome() {
    renderHud(); clearScreen();
    const w = el("div", "location");
    w.appendChild(el("h2", null, "🏠 Home")); w.appendChild(el("p", "char-line", D.LOCATIONS.home.arrive));
    const o = el("div", "choices");
    o.appendChild(button("📱 Phone", () => renderPhone(renderHome), "primary"));
    o.appendChild(button(`Open bag${invCount() ? ` (${invCount()})` : ""}`, () => renderBag(renderHome), "choice"));
    o.appendChild(button("Rest (skip to next phase)", advancePhase, "choice subtle"));
    w.appendChild(o); screen().appendChild(w);
  }
  function renderPhone(back) {
    renderHud(); clearScreen();
    const w = el("div", "location");
    w.appendChild(el("h2", null, "📱 Phone"));
    const contacts = CHAR_IDS.filter((id) => state.milestones[id].number);
    w.appendChild(el("p", "subtitle", contacts.length ? "Text for a small daily nudge, peek a schedule, set up a date — or review what you've learned." : "No numbers yet. Get one in person first."));
    const list = el("div", "choices");
    for (const id of contacts) {
      const c = D.CHARACTERS[id], card = el("div", "person");
      card.appendChild(el("div", "person-name", `${c.emoji} ${c.name}`));
      card.appendChild(el("div", "person-stage", "Today — " + D.PHASES.map((p) => `${p}: ${D.LOCATIONS[c.schedule[p]].name}`).join(" · ")));
      const row = el("div", "choices");
      if (state.textedToday[id]) row.appendChild(button("Texted today", null, "choice", true));
      else row.appendChild(button(`Text ${c.name}`, () => doText(id, back), "choice"));
      if (composite(id) >= T.dateMinInterest) row.appendChild(button("Ask her out", () => renderDatePicker(id), "choice"));
      else row.appendChild(button("Ask her out (warm her up more)", null, "choice", true));
      if (state.learned[id].length) row.appendChild(button(`What you know (${state.learned[id].length})`, () => renderJournal(id, back), "choice subtle"));
      card.appendChild(row); list.appendChild(card);
    }
    w.appendChild(list);
    w.appendChild(button("Back", back, "choice subtle"));
    screen().appendChild(w);
  }
  function renderJournal(id, back) {
    renderHud(); clearScreen();
    const c = D.CHARACTERS[id], w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `What you know about ${c.name}`));
    for (const f of state.learned[id]) w.appendChild(el("p", "result-line", "• " + f));
    w.appendChild(button("Back", () => renderPhone(back), "choice subtle"));
    screen().appendChild(w);
  }
  function doText(id, back) {
    const c = D.CHARACTERS[id], r = d20(), cha = effStat("charisma"), total = r + cha;
    const ok = total >= T.textDC, gain = ok ? T.textReward : total >= T.textDC - 5 ? 1 : 0;
    adjustBar(id, "affection", gain); state.textedToday[id] = true;
    renderResult({ title: "Sent", roll: { d20: r, stat: `CHA ${cha}`, vibe: 0, vibeNote: "", total, dc: T.textDC },
      lines: [ok ? `${c.name} texts back fast, and keeps it going.` : gain ? `${c.name} replies, eventually.` : "Left on read. Ouch.", `Affection +${gain}`],
      tone: ok ? "good" : gain ? "neutral" : "bad", then: () => renderPhone(back) });
  }

  function renderShop(locId) {
    renderHud(); clearScreen();
    const w = el("div", "location");
    w.appendChild(el("h2", null, `🛒 ${D.LOCATIONS[locId].name} — Shop`));
    w.appendChild(el("p", "subtitle", `You have $${state.money}.`));
    const list = el("div", "choices");
    for (const itemId of D.SHOPS[locId]) {
      const it = D.ITEMS[itemId], card = el("div", "shop-item");
      card.appendChild(el("div", "person-name", `${it.emoji} ${it.name} — $${it.price}`));
      card.appendChild(el("div", "shop-desc", it.desc));
      if (state.money < it.price) card.appendChild(button(`Can't afford ($${it.price})`, null, "choice", true));
      else card.appendChild(button(`Buy ($${it.price})`, () => buyItem(locId, itemId), "choice"));
      list.appendChild(card);
    }
    w.appendChild(list);
    w.appendChild(button("Done", () => renderLocation(locId), "choice subtle"));
    screen().appendChild(w);
  }
  function buyItem(locId, itemId) {
    const it = D.ITEMS[itemId]; if (state.money < it.price) return; state.money -= it.price;
    let note;
    if (it.type === "permStat") { state.stats[it.stat] = clamp(state.stats[it.stat] + it.amount, 0, T.statCap); note = `+${it.amount} ${D.STAT_SHORT[it.stat]} (permanent).`; }
    else { state.inventory[itemId] = (state.inventory[itemId] || 0) + 1; note = it.type === "gift" ? "Saved for the right moment." : "In your bag."; }
    renderResult({ title: `Bought ${it.name}`, lines: [note, `$${state.money} left.`], tone: "good", then: () => renderShop(locId) });
  }
  function renderBag(back) {
    renderHud(); clearScreen();
    const w = el("div", "location");
    w.appendChild(el("h2", null, "🎒 Bag")); w.appendChild(el("p", "subtitle", `$${state.money}`));
    const ids = Object.keys(state.inventory).filter((k) => state.inventory[k] > 0);
    if (!ids.length) w.appendChild(el("p", "result-line", "Empty. Shops: gym, café, library, park, mall."));
    const list = el("div", "choices");
    for (const id of ids) {
      const it = D.ITEMS[id], card = el("div", "shop-item");
      card.appendChild(el("div", "person-name", `${it.emoji} ${it.name} ×${state.inventory[id]}`));
      card.appendChild(el("div", "shop-desc", it.desc));
      if (it.type === "tempStat") card.appendChild(button("Use now", () => useTemp(id, back), "choice"));
      else if (it.type === "gift") card.appendChild(button("Give during a conversation", null, "choice", true));
      list.appendChild(card);
    }
    w.appendChild(list); w.appendChild(button("Back", back, "choice subtle")); screen().appendChild(w);
  }
  function useTemp(id, back) {
    const it = D.ITEMS[id]; state.inventory[id] -= 1;
    state.buffs.push({ stat: it.stat, amount: it.amount, phasesLeft: it.phases });
    renderResult({ title: `Used ${it.name}`, lines: [`+${it.amount} ${D.STAT_SHORT[it.stat]} for ${it.phases} phase(s).`], tone: "good", then: back });
  }

  // Format a JOBS schedule into a compact weekly string.
  function jobScheduleLine(j) {
    if (!j.schedule || !Object.keys(j.schedule).length) return "No shifts.";
    return D.WEEKDAYS.filter((d) => j.schedule[d] && j.schedule[d].length)
      .map((d) => `${d} ${j.schedule[d].map((p) => p[0]).join("/")}`).join(" · ");
  }
  function renderLife(back) {
    renderHud(); clearScreen();
    const w = el("div", "location");
    w.appendChild(el("h2", null, "🏷️ Life"));
    w.appendChild(el("p", "subtitle", `$${state.money}. Career, home, ride — change them here. Rent and lease are charged at each day rollover.`));
    // Career
    w.appendChild(el("div", "talk-head", "💼 Career"));
    const onShift = workSlotNow();
    if (onShift) w.appendChild(el("p", "char-line dim", "Can't switch mid-shift — clock out first."));
    const jobList = el("div", "choices");
    for (const [jid, j] of Object.entries(D.JOBS)) {
      const card = el("div", "shop-item");
      const here = jid === state.job;
      card.appendChild(el("div", "person-name", `${j.emoji} ${j.name}${here ? "  · current" : ""}  · $${j.wage}/shift`));
      card.appendChild(el("div", "shop-desc", `${j.blurb}  —  ${jobScheduleLine(j)}`));
      if (here) card.appendChild(button("Current", null, "choice", true));
      else card.appendChild(button("Switch", () => { state.job = jid; saveGame(); renderLife(back); }, "choice", onShift));
      jobList.appendChild(card);
    }
    w.appendChild(jobList);
    // Home
    w.appendChild(el("div", "talk-head", "🏠 Home"));
    const houseList = el("div", "choices");
    for (const [hid, h] of Object.entries(D.HOUSES)) {
      const card = el("div", "shop-item");
      const here = hid === state.owned.house;
      const perks = []; if (h.rooms.indexOf("yard") !== -1) perks.push("yard"); if (h.hotTub) perks.push("hot tub");
      card.appendChild(el("div", "person-name", `${h.emoji} ${h.name}${here ? "  · current" : ""}  · $${h.rent}/day`));
      card.appendChild(el("div", "shop-desc", `${h.blurb}${perks.length ? "  —  " + perks.join(", ") : ""}`));
      if (here) card.appendChild(button("Current", null, "choice", true));
      else if (state.money < h.rent) card.appendChild(button(`Can't afford first day ($${h.rent})`, null, "choice", true));
      else card.appendChild(button(`Move in  (−$${h.rent})`, () => { state.money -= h.rent; state.owned.house = hid; saveGame(); renderLife(back); }, "choice"));
      houseList.appendChild(card);
    }
    w.appendChild(houseList);
    // Car
    w.appendChild(el("div", "talk-head", "🚗 Car"));
    const carList = el("div", "choices");
    for (const [cid, c] of Object.entries(D.CARS)) {
      const card = el("div", "shop-item");
      const here = cid === state.owned.car;
      const tags = []; if (c.drive) tags.push("drives"); else tags.push("walking");
      card.appendChild(el("div", "person-name", `${c.emoji} ${c.name}${here ? "  · current" : ""}  · ${c.lease ? "$" + c.lease + "/day" : "free"}`));
      card.appendChild(el("div", "shop-desc", `${c.blurb}  —  ${tags.join(", ")}`));
      if (here) card.appendChild(button("Current", null, "choice", true));
      else if (state.money < c.lease) card.appendChild(button(`Can't afford first day ($${c.lease})`, null, "choice", true));
      else card.appendChild(button(c.lease ? `Lease  (−$${c.lease})` : "Return the car", () => { state.money -= c.lease; state.owned.car = cid; saveGame(); renderLife(back); }, "choice"));
      carList.appendChild(card);
    }
    w.appendChild(carList);
    w.appendChild(button("Back", back, "choice subtle"));
    screen().appendChild(w);
  }

  // ---------- conversation ----------
  function vibeFor(c, style, party) {
    let v = 0; const notes = [];
    if (style === c.likedStyle) { v += T.likedStyleBonus; notes.push("her energy"); }
    else if (style === c.dislikedStyle) { v -= T.dislikedStylePenalty; notes.push("not her style"); }
    if (party) { v += T.partyVibe; notes.push("party buzz"); if (style === "thoughtful") { v -= T.partyLoud; notes.push("too loud to go deep"); } }
    return { v, note: notes.join(", ") || "neutral read" };
  }
  function startConvo(id, locId, party) {
    const pg = state.preg[id];
    if (pg && !pg.talked && state.day - pg.sinceDay >= T.pregTalkAfterDays)
      return renderPregnancyTalk(id, !!party);
    // First meeting: one-shot, per-character. Sets the {id}Met flag so
    // subsequent conversations use the normal opens.
    const c = D.CHARACTERS[id];
    const metKey = id + "Met";
    if (c.firstMeeting && !(state.flags && state.flags[metKey])) {
      state.convo = { id, locId, beat: 0, momentum: 0, party: !!party, firstMeeting: true };
      return renderFirstMeeting(id, locId, !!party);
    }
    state.convo = { id, locId, beat: 0, momentum: 0, party: !!party };
    renderConvoBeat();
  }
  function renderFirstMeeting(id, locId, party) {
    renderHud(); clearScreen();
    const c = D.CHARACTERS[id], FM = c.firstMeeting;
    const beatIdx = state.convo.beat;
    const w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `${c.emoji} ${c.name} · first meeting`));
    if (beatIdx === 0 && FM.intro) w.appendChild(el("p", "char-line", subN(pick(FM.intro, "fmIntro"), c.name)));
    const beat = FM.beats[beatIdx];
    if (!beat) return finishFirstMeeting(id, party);
    w.appendChild(el("p", "talk-prompt", pick(beat.q, "fmQ" + beatIdx)));
    const o = el("div", "choices");
    beat.opts.forEach((opt, i) => o.appendChild(button(opt.text, () => {
      const line = pick(opt.line, "fmLine" + beatIdx + i);
      // Small bar nudges from the chosen trait (affection only — friend tier).
      const baseAff = 4 + (opt.trait === "sincere" ? 2 : opt.trait === "playful" ? 1 : 0);
      adjustBar(id, "affection", baseAff);
      renderResult({
        title: "First meeting",
        lines: [subN(line, c.name), `Affection +${baseAff}`],
        tone: "good",
        then: () => { state.convo.beat += 1; renderFirstMeeting(id, locId, party); },
        thenLabel: state.convo.beat + 1 >= FM.beats.length ? "After…" : "Continue",
      });
    }, "choice")));
    w.appendChild(o); screen().appendChild(w);
  }
  function finishFirstMeeting(id, party) {
    const flags = state.flags || (state.flags = {});
    flags[id + "Met"] = true;
    // Number milestone is set on first meeting so she shows up in contacts.
    state.milestones[id].number = true;
    const c = D.CHARACTERS[id], locId = state.convo.locId;
    state.convo = null;
    renderResult({
      title: `${c.name} — exchanged numbers`,
      lines: [`${c.name} types her number into your phone before she goes. "Don't be a stranger."`, "(She's in your contacts now.)"],
      tone: "good",
      then: () => { party ? partyAfter() : renderLocation(locId); },
      thenLabel: "Back",
    });
  }
  function renderPregnancyTalk(id, party) {
    const c = D.CHARACTERS[id], P = D.INTIMACY.pregnancy;
    const ta = c.traitAffinity;
    const reactKey = ((ta.classy || 0) + (ta.independent || 0)) > (ta.sincere || 0) ? "cool" : "warm";
    renderHud(); clearScreen();
    const w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `${c.emoji} ${c.name}`));
    w.appendChild(el("p", "char-line", subN(P.wait, c.name)));
    w.appendChild(el("p", "char-line", subN(P.react[reactKey], c.name)));
    w.appendChild(el("p", "talk-prompt", subN(P.say, c.name)));
    const o = el("div", "choices");
    for (const opt of P.opts) o.appendChild(button(opt.label, () => {
      adjustBar(id, "romance", opt.fx.rom || 0); adjustBar(id, "affection", opt.fx.aff || 0);
      state.preg[id].talked = true; state.preg[id].status = opt.status;
      state.metCount[id] += 1;
      renderResult({ title: "That conversation", lines: [subN(opt.line, c.name), `Romance ${opt.fx.rom >= 0 ? "+" : ""}${opt.fx.rom || 0} · Affection ${opt.fx.aff >= 0 ? "+" : ""}${opt.fx.aff || 0}`], tone: opt.kind === "wobble" ? "bad" : "good", then: party ? partyAfter : advancePhase });
    }, opt.kind === "stay" ? "choice move" : "choice"));
    w.appendChild(o); screen().appendChild(w);
  }
  function renderConvoBeat() {
    renderHud(); clearScreen();
    const cv = state.convo, c = D.CHARACTERS[cv.id], mood = moodOf(cv.id);
    const w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `${c.emoji} ${c.name}`));
    // Stage-keyed opens (Krystalle today; others fall back to legacy shape).
    const stage = cv.id === "krystalle" ? krystStage() : null;
    const openPool = stage ? (stageOpens(cv.id, stage) || c.opens[mood]) : c.opens[mood];
    w.appendChild(el("p", "char-line", one(openPool)));
    w.appendChild(el("p", "talk-prompt", "You say —"));
    const o = el("div", "choices");
    for (const s of pickN(D.SAYS, 3)) o.appendChild(button(s.say, () => resolveBeat(s), "choice say"));
    o.appendChild(button(`💋 ${D.MOVE.say}`, resolveMove, "choice move"));
    if (cv.beat === 0) o.appendChild(button("(Step back — not now)", () => { const l = cv.locId, p = cv.party; state.convo = null; p ? renderParty() : renderLocation(l); }, "choice subtle"));
    w.appendChild(o); screen().appendChild(w);
  }
  function maybeReveal(id, tier, probe) {
    if (!(tier === "crit" || (tier === "success" && probe))) return null;
    const left = D.CHARACTERS[id].reveals.filter((r) => !state.learned[id].includes(r));
    if (!left.length) return null;
    const fact = left[0]; state.learned[id].push(fact);
    return fact;
  }
  function resolveBeat(s) {
    const cv = state.convo, c = D.CHARACTERS[cv.id], mood = moodOf(cv.id);
    const roll = d20(), sv = effStat(s.stat), { v, note } = vibeFor(c, s.style, cv.party);
    const total = roll + sv + v, dc = Math.round(T.baseDC + composite(cv.id) * T.dcPerInterest), tier = tierOf(roll, total, dc);
    let bd = T.beatBar[tier];
    if (s.stat === c.likedStat && bd > 0) bd += T.likedStatBonus;
    adjustBar(cv.id, s.bar, bd);
    if (bd > 0 && s.bar !== "affection") adjustBar(cv.id, "affection", T.beatAffSpill);
    cv.momentum += T.beatMomentum[tier];
    const reveal = maybeReveal(cv.id, tier, s.probe);
    const last = cv.beat + 1 >= 2;
    const lines = [one(D.LINES[mood][tier])];
    if (reveal) lines.push(`She lets something slip — ${reveal}`);
    lines.push(`${D.BAR_LABEL[s.bar]} ${bd >= 0 ? "+" : ""}${bd}${bd > 0 && s.bar !== "affection" ? `, Affection +${T.beatAffSpill}` : ""}  ·  momentum ${cv.momentum >= 0 ? "+" : ""}${cv.momentum}`);
    renderResult({
      title: tier === "crit" ? "That lands hard" : tier === "success" ? "Good beat" : tier === "partial" ? "Lukewarm" : "Misfire",
      roll: { d20: roll, stat: `${D.STAT_SHORT[s.stat]} ${sv}`, vibe: v, vibeNote: note, total, dc }, lines,
      tone: tier === "fail" ? "bad" : tier === "partial" ? "neutral" : "good",
      then: () => { if (last) renderCapstone(); else { cv.beat += 1; renderConvoBeat(); } },
      thenLabel: last ? "Where to take it" : "Keep talking",
    });
  }
  function resolveMove() {
    const cv = state.convo, c = D.CHARACTERS[cv.id], comp = composite(cv.id);
    const roll = d20(), cha = effStat("charisma"), { v, note } = vibeFor(c, D.MOVE.style, cv.party);
    const total = roll + cha + v, dc = Math.round(T.moveBaseDC + (comp < 60 ? (60 - comp) * T.movePerInterestMissing : 0));
    const ok = roll !== 1 && (roll === 20 || total >= dc);
    let lines, tone, title;
    if (ok) {
      adjustBar(cv.id, "romance", T.moveReward.romance); adjustBar(cv.id, "attraction", 3);
      const hot = barVal(cv.id, "romance") >= T.kissMinRomance && !state.milestones[cv.id].kiss;
      if (hot) { state.milestones[cv.id].kiss = true; adjustBar(cv.id, "attraction", 4); }
      title = "She meets you there";
      lines = [hot ? `It tips over. ${c.name} closes the last inch and kisses you back.` : `${c.name} doesn't pull away. The whole register of this just changed.`, `Romance +${T.moveReward.romance}${hot ? " · first kiss 💋" : ""}`];
      tone = "good";
    } else {
      adjustBar(cv.id, "romance", T.moveFail.romance); adjustBar(cv.id, "affection", T.moveFail.affection);
      title = "Too much, too soon";
      lines = [`${c.name} leans back, gentle but firm. "Hey — slow down."`, `Romance ${T.moveFail.romance} · Affection ${T.moveFail.affection}`];
      tone = "bad";
    }
    renderResult({ title, roll: { d20: roll, stat: `CHA ${cha}`, vibe: v, vibeNote: note, total, dc }, lines, tone, then: renderCapstone, thenLabel: "Where to take it" });
  }
  function fitOf(c) { return clamp(Math.floor((effStat(c.likedStat) - 6) / 2), -2, 5); }
  function renderCapstone() {
    renderHud(); clearScreen();
    const cv = state.convo, c = D.CHARACTERS[cv.id];
    const comp = composite(cv.id), rom = barVal(cv.id, "romance"), m = state.milestones[cv.id];
    const haveGift = Object.keys(state.inventory).some((k) => state.inventory[k] > 0 && D.ITEMS[k].type === "gift");
    const w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `${c.emoji} ${c.name}`));
    w.appendChild(el("p", "char-line", `There's a beat where it could go any direction. ${c.name} waits to see which one you pick.`));
    const o = el("div", "choices");
    o.appendChild(button("Give her something you brought", renderGiftPicker, "choice", !haveGift));
    if (!m.number) { const ok = comp >= T.numberMinInterest; o.appendChild(button(ok ? `\"Give me your number.\"  (DC ${T.numberDC})` : `Ask for her number  (needs ${T.numberMinInterest} interest)`, () => resolvePursue("number"), "choice", !ok)); }
    else { const ok = comp >= T.dateMinInterest; o.appendChild(button(ok ? "\"Let me take you out. Properly.\"" : `Ask her on a date  (needs ${T.dateMinInterest} interest)`, () => renderDatePicker(cv.id), "choice", !ok)); }
    const kok = rom >= T.kissMinRomance || comp >= T.kissMinInterest;
    o.appendChild(button(kok ? `Kiss her  (DC ${T.kissDC})` : `Kiss her  (needs ${T.kissMinRomance} romance)`, () => resolvePursue("kiss"), "choice", !kok));
    o.appendChild(button("\"This was good. Let's not ruin it.\" (end warmly)", () => { adjustBar(cv.id, "affection", 1); renderResult({ title: "Good talk", lines: [`${c.name} half-smiles as you go. Affection +1.`], tone: "good", then: endConvo }); }, "choice subtle"));
    w.appendChild(o); screen().appendChild(w);
  }
  function renderGiftPicker() {
    renderHud(); clearScreen();
    const cv = state.convo, c = D.CHARACTERS[cv.id], w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `Give ${c.name} something`));
    const o = el("div", "choices");
    for (const id of Object.keys(state.inventory).filter((k) => state.inventory[k] > 0 && D.ITEMS[k].type === "gift")) {
      const it = D.ITEMS[id]; o.appendChild(button(`${it.emoji} ${it.name} ×${state.inventory[id]}`, () => giveGift(id), "choice"));
    }
    o.appendChild(button("Back", renderCapstone, "choice subtle"));
    w.appendChild(o); screen().appendChild(w);
  }
  function giveGift(itemId) {
    const cv = state.convo, c = D.CHARACTERS[cv.id], it = D.ITEMS[itemId];
    state.inventory[itemId] -= 1;
    const fav = c.favoriteGift === itemId, val = Math.round(it.value * (fav ? T.favoriteGiftMult : 1));
    adjustBar(cv.id, "affection", val); adjustBar(cv.id, "romance", Math.round(val * T.giftRomanceShare));
    renderResult({ title: fav ? `${c.name} lights up` : `${c.name} appreciates it`,
      lines: [fav ? `"You remembered." She means it — that's exactly her.` : "A kind, well-received gesture.", `Affection +${val} · Romance +${Math.round(val * T.giftRomanceShare)}`],
      tone: "good", then: renderCapstone, thenLabel: "Back to her" });
  }
  function resolvePursue(kind) {
    const cv = state.convo, c = D.CHARACTERS[cv.id];
    const comp = composite(cv.id), rom = barVal(cv.id, "romance"), atr = barVal(cv.id, "attraction");
    const cha = effStat("charisma"), fit = fitOf(c), roll = d20();
    let total, dc, ok, title, lines, tone;
    if (kind === "number") {
      total = roll + cha + Math.floor(comp / 8) + cv.momentum + fit; dc = T.numberDC; ok = roll !== 1 && (roll === 20 || total >= dc);
      if (ok) { state.milestones[cv.id].number = true; adjustBar(cv.id, "affection", T.numberReward.affection); title = "Got the number"; lines = [`${c.name} takes your phone, types it in herself. "Use it."`, `Affection +${T.numberReward.affection}`]; tone = "good"; }
      else { adjustBar(cv.id, "affection", T.numberFail.affection); title = "Deflected"; lines = [`${c.name}: "Ask me again when you actually know me."`, `Affection ${T.numberFail.affection}`]; tone = "bad"; }
    } else {
      total = roll + cha + Math.floor(rom / 8) + Math.floor(atr / 10) + cv.momentum; dc = T.kissDC; ok = roll !== 1 && (roll === 20 || total >= dc);
      if (ok) { state.milestones[cv.id].kiss = true; adjustBar(cv.id, "romance", T.kissReward.romance); adjustBar(cv.id, "attraction", T.kissReward.attractionEvent); title = "She leans in"; lines = ["Everything slows down. It lands, and it lands well.", `Romance +${T.kissReward.romance} · Attraction +${T.kissReward.attractionEvent}`]; tone = "good"; }
      else { adjustBar(cv.id, "romance", T.kissFail.romance); adjustBar(cv.id, "affection", T.kissFail.affection); title = "She turns her cheek"; lines = ["You misread it. The air goes brittle and small.", `Romance ${T.kissFail.romance} · Affection ${T.kissFail.affection}`]; tone = "bad"; }
    }
    renderResult({ title, roll: { d20: roll, stat: `CHA ${cha}`, extra: `+ situ ${total - roll - cha}`, total, dc }, lines, tone, then: endConvo, thenLabel: "Continue" });
  }
  function endConvo() {
    const cv = state.convo; if (!cv) return advancePhase();
    state.metCount[cv.id] += 1;
    const revealedHint = state.metCount[cv.id] === T.revealAfter;
    const c = D.CHARACTERS[cv.id], party = cv.party;
    const invite = !party && D.LOCATIONS[cv.locId] && D.LOCATIONS[cv.locId].social && maybeParty();
    state.convo = null;
    const cont = party ? partyAfter : advancePhase;
    if (revealedHint || invite) renderResult({ title: "Later…", lines: [revealedHint ? `You're starting to read her: ${c.hint}` : null, invite ? "📨 You hear about a house party tonight — and who's likely to be there." : null].filter(Boolean), tone: "good", then: cont });
    else cont();
  }

  // ---------- dates ----------
  function renderDatePicker(id) {
    state.convo = null; renderHud(); clearScreen();
    const c = D.CHARACTERS[id], w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `Take ${c.name} where?`));
    w.appendChild(el("p", "subtitle", "The place sets the tone. What you do there does the rest."));
    const o = el("div", "choices");
    for (const [lid, loc] of Object.entries(D.LOCATIONS)) {
      if (!loc.dateSpot || !D.DATE_SCENES[lid]) continue;
      const tag = loc.dateCost ? `~$${loc.dateCost}` : "free";
      o.appendChild(button(`${loc.emoji} ${loc.name}  (${tag})`, () => startDate(id, lid), "choice"));
    }
    for (const [lid, loc] of Object.entries(D.LOCATIONS)) {
      if (!loc.overlookSpot && !loc.beachSpot) continue;
      const tag = loc.dateCost ? `~$${loc.dateCost}` : "free";
      if (!canDrive()) o.appendChild(button(`${loc.emoji} ${loc.name}  (${tag}) — 🚗 needs a car`, null, "choice", true));
      else o.appendChild(button(`${loc.emoji} ${loc.name}  (${tag})`, () => startDate(id, lid), "choice move"));
    }
    o.appendChild(button("Not now", advancePhase, "choice subtle"));
    w.appendChild(o); screen().appendChild(w);
  }
  function startDate(id, loc) {
    if (!state.date) state.date = { id, venuesDone: 0, spent: 0, totRom: 0, totAff: 0, bestQ: -9, used: [] };
    state.date.venue = loc;
    if (loc === "home") return startHome();
    if (loc === "overlook") return startOverlook();
    if (loc === "beach") return startBeach();
    state.date.beat = 0; state.date.picks = [];
    renderDateBeat();
  }
  function renderDateBeat() {
    const dt = state.date, c = D.CHARACTERS[dt.id];
    // Hub-mode date flow (Krystalle, today). Branches before anything else.
    if (c.dateFlow === "hub") return renderConversationHub();
    renderHud(); clearScreen();
    const scene = D.DATE_SCENES[dt.venue];
    // Anxiety beat — fires once mid-date when she crosses the threshold.
    if (maybeAnxietyBeat(dt.id, "date")) return;
    const w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `🍷 ${D.LOCATIONS[dt.venue].name} · with ${c.name}`));
    if (dt.beat === 0) {
      const vIntro = pick(voiceFor(dt.id, `venues.${dt.venue}.intro`), `vIntro.${dt.venue}`);
      w.appendChild(el("p", "char-line", vIntro || scene.intro));
    }
    const b = scene.beats[dt.beat];
    const vQ = pick(voiceFor(dt.id, `venues.${dt.venue}.beats.${dt.beat}.q`), `vQ.${dt.venue}.${dt.beat}`);
    w.appendChild(el("p", "talk-prompt", vQ || b.q));
    const o = el("div", "choices");
    b.opts.forEach((opt, i) => o.appendChild(button(opt.text, () => {
      dt.picks.push(opt);
      const vSaid = pick(voiceFor(dt.id, `venues.${dt.venue}.beats.${dt.beat}.opts.${i}.said`), `vSaid.${dt.venue}.${dt.beat}.${i}.${Math.random()}`);
      const vLine = pick(voiceFor(dt.id, `venues.${dt.venue}.beats.${dt.beat}.opts.${i}.line`), `vLine.${dt.venue}.${dt.beat}.${i}.${Math.random()}`);
      const advance = () => { dt.beat += 1; dt.beat >= scene.beats.length ? afterVenueBeats() : renderDateBeat(); };
      if (vSaid || vLine) return renderVoiceInterstitial(c.name, vSaid, vLine, advance);
      advance();
    }, "choice")));
    w.appendChild(o); screen().appendChild(w);
  }

  // ----- Conversation hub (dateFlow === "hub") -----
  // Player picks a category → action → result → loops back. Per-date
  // action budget; DR per repeat category; sex-attempt DC escalates with
  // cheating count. Voice content lives at K.voice.hub.{category}...
  function ensureHubState() {
    const dt = state.date;
    if (!dt.hub) dt.hub = { actions: 0, counts: { compliment: 0, question: 0, day: 0, move: 0 }, picks: [] };
    return dt.hub;
  }
  function renderConversationHub() {
    const dt = state.date, c = D.CHARACTERS[dt.id];
    // Anxiety beat: hub respects the same threshold check.
    if (maybeAnxietyBeat(dt.id, "date")) return;
    const hub = ensureHubState();
    if (hub.actions >= (T.hubActionsMax || 6)) return endHubDate();
    renderHud(); clearScreen();
    const w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `${c.emoji} ${c.name} · ${D.LOCATIONS[dt.venue].name}`));
    if (hub.actions === 0) {
      const vIntro = pick(voiceFor(dt.id, `hub.venues.${dt.venue}.intro`), `hubIntro.${dt.venue}`);
      if (vIntro) w.appendChild(el("p", "char-line", subN(vIntro, c.name)));
    }
    const stage = krystStage();
    // Stage-keyed open line — replaces the per-mood open with stage+mood.
    const openPool = stageOpens(dt.id, stage);
    if (openPool) w.appendChild(el("p", "char-line", subN(pick(openPool, `hubOpen.${stage}.${hub.actions}`), c.name)));
    w.appendChild(el("p", "talk-prompt", hub.actions === 0 ? "Where do you want to take this?" : "What now?"));
    const o = el("div", "choices");
    for (const cat of D.HUB.categories) {
      const lbl = `${D.HUB.emoji[cat]} ${D.HUB.label[cat]}`;
      const n = hub.counts[cat] || 0;
      const tag = (n > 0 && cat !== "end") ? ` (×${n})` : "";
      o.appendChild(button(lbl + tag, () => renderHubCategory(cat), cat === "end" ? "choice subtle" : "choice"));
    }
    // Budget readout, subtle.
    w.appendChild(o);
    const meta = el("p", "char-line dim", `Actions ${hub.actions}/${T.hubActionsMax || 6} · she's reading ${stage}`);
    w.appendChild(meta);
    screen().appendChild(w);
  }
  function stageOpens(id, stage) {
    const c = D.CHARACTERS[id]; if (!c.opens) return null;
    // Stage-keyed shape: opens[stage][mood]. Falls back to legacy
    // opens[mood] for characters that haven't opted in.
    const mood = moodOf(id);
    const stageBlock = c.opens[stage];
    if (stageBlock && typeof stageBlock === "object" && !Array.isArray(stageBlock)) {
      return stageBlock[mood] || stageBlock.neutral || stageBlock.warm || null;
    }
    return c.opens[mood] || null;
  }
  function renderHubCategory(category) {
    const dt = state.date, c = D.CHARACTERS[dt.id];
    if (category === "end") return endHubDate();
    const hub = ensureHubState();
    const stage = krystStage();
    renderHud(); clearScreen();
    const w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `${c.emoji} ${c.name} · ${D.HUB.label[category]}`));
    // Optional pre-action narration for the category — sets mood.
    const preKey = category === "move" && (stage === "lover" || stage === "affair") ? `hub.cheatPre.${stage}` : `hub.pre.${category}`;
    const pre = pick(voiceFor(dt.id, preKey), `hubPre.${category}.${stage}.${hub.actions}`);
    if (pre) w.appendChild(el("p", "char-line", subN(pre, c.name)));
    w.appendChild(el("p", "talk-prompt", "Pick one —"));
    const o = el("div", "choices");
    for (const action of D.HUB.actions[category]) {
      const gateStage = action.gateStage;
      const locked = gateStage && D.HUB.stageOrder.indexOf(stage) < D.HUB.stageOrder.indexOf(gateStage);
      const lbl = action.label + (locked ? ` — not yet (need ${gateStage})` : "");
      if (locked) o.appendChild(button(lbl, null, "choice", true));
      else o.appendChild(button(action.label, () => resolveHubAction(category, action), action.isKiss || action.sexFlavor ? "choice move" : "choice"));
    }
    o.appendChild(button("Back to the table", renderConversationHub, "choice subtle"));
    w.appendChild(o); screen().appendChild(w);
  }
  function resolveHubAction(category, action) {
    const dt = state.date, id = dt.id, c = D.CHARACTERS[id];
    const hub = ensureHubState();
    const stage = krystStage();
    const n = hub.counts[category] || 0;
    const drDc = n * (T.hubDrDc || 2);
    const drRew = Math.max(0, 1 - (T.hubDrRewardStep || 0.3) * n);
    // Cheating-DC escalation: applies only to Move at lover/affair stage,
    // and only when the action is sex-flavored or a kiss-leading move.
    let cheatBump = 0;
    if (category === "move" && (stage === "affair")) cheatBump += (T.cheatBaseBump || 3);
    if (category === "move" && (stage === "lover" || stage === "affair")) {
      const sexCount = Math.min((state.flags.krystalleSexCount || 0), (T.cheatPerSexCap || 4));
      cheatBump += sexCount * (T.cheatPerSexBump || 1.5);
    }
    const baseDc = action.dc || (T.baseDC + Math.round(composite(id) * T.dcPerInterest));
    const dc = Math.round(baseDc + drDc + cheatBump);
    // Resolve: traitAffinity * mag + d20 + likedStat read.
    const roll = d20(), sv = effStat(c.likedStat);
    const traitV = (c.traitAffinity[action.trait] || 0) * (action.mag || 1);
    const total = roll + sv + traitV;
    const ok = roll !== 1 && (roll === 20 || total >= dc);
    const rewardMul = ok ? drRew : 0.4;       // fail still bumps a touch
    // Apply fx scaled by reward multiplier.
    const fx = action.baseFx || {};
    if (fx.rom) adjustBar(id, "romance",    Math.round((ok ? fx.rom : -Math.abs(fx.rom) * 0.3) * (ok ? rewardMul : 1)));
    if (fx.aff) adjustBar(id, "affection",  Math.round((ok ? fx.aff : -Math.abs(fx.aff) * 0.3) * (ok ? rewardMul : 1)));
    if (fx.lib) adjustBar(id, "libido",     ok ? Math.round(fx.lib * rewardMul) : 0);
    if (fx.atr) adjustBar(id, "attraction", ok ? Math.round(fx.atr * rewardMul) : 0);
    // Kiss milestone.
    if (ok && action.isKiss && !state.milestones[id].kiss) {
      state.milestones[id].kiss = true; adjustBar(id, "attraction", 4);
    }
    hub.counts[category] = n + 1;
    hub.actions += 1;
    hub.picks.push({ category, id: action.id, ok });
    // Voice lookup priority for the narration:
    //   1) DR pool if n >= 2 ("you're repeating yourself")
    //   2) cheating-affair pool if stage==="affair" && category==="move"
    //   3) standard hub action pool by id
    const repeat = n >= 2;
    const seedBase = `hub.${category}.${action.id}.${state.day}.${hub.actions}`;
    let said = null, line = null;
    if (repeat) {
      said = pick(voiceFor(id, `hub.repeat.${category}.said`), seedBase + ".saidR");
      line = pick(voiceFor(id, `hub.repeat.${category}.line`), seedBase + ".lineR");
    }
    if (!line && stage === "affair" && category === "move") {
      said = said || pick(voiceFor(id, `hub.cheatMove.${action.id}.said`), seedBase + ".saidA");
      line = pick(voiceFor(id, `hub.cheatMove.${action.id}.line`), seedBase + ".lineA");
    }
    if (!line) {
      said = said || pick(voiceFor(id, `hub.${category}.${action.id}.said`), seedBase + ".said");
      line = pick(voiceFor(id, `hub.${category}.${action.id}.line`), seedBase + ".line");
    }
    const title = ok ? (action.isKiss ? "She meets you there" : "She's right there with you")
                     : "Misread";
    const lines = [];
    if (said) lines.push(subN(said, c.name));
    if (line) lines.push(subN(line, c.name));
    else lines.push(ok ? `${c.name} leans in. That landed.` : `${c.name} eases back, gentle but firm. "…hey. Slow down.\"`);
    if (drDc) lines.push(`(Repeat ×${n + 1} · DC +${drDc}${cheatBump ? ` · cheat +${Math.round(cheatBump)}` : ""} → DC ${dc})`);
    else if (cheatBump) lines.push(`(DC ${dc} — she's wrestling with this one.)`);
    lines.push(`Rolled ${roll} + ${sv + traitV} = ${total} vs DC ${dc}.`);
    renderResult({
      title,
      lines,
      tone: ok ? "good" : "bad",
      then: renderConversationHub,
      thenLabel: "Back to the table",
    });
  }
  function endHubDate() {
    const dt = state.date, c = D.CHARACTERS[dt.id];
    const scene = D.DATE_SCENES[dt.venue];
    // Run the bill if the venue has one (re-use shared flow).
    if (scene && scene.bill) return renderBill();
    // Otherwise jump to the end-of-night decision.
    return offerContinue(0.4);
  }
  // Light interstitial between a player choice and the next beat — shows
  // her response (said) and the narrator's read (line) on one Continue.
  function renderVoiceInterstitial(name, said, line, next) {
    renderHud(); clearScreen();
    const w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `${name}`));
    if (said) w.appendChild(el("p", "char-line", said));
    if (line) w.appendChild(el("p", "result-line", line));
    const o = el("div", "choices");
    o.appendChild(button("Continue", next, "primary"));
    w.appendChild(o); screen().appendChild(w);
  }
  // One-time mid-arc anxiety beat. Returns true if it rendered (caller
  // should bail). Krystalle-only via her marriage.anxietyAt threshold.
  function maybeAnxietyBeat(id, context) {
    const c = D.CHARACTERS[id]; if (!c || !c.marriage || !c.marriage.active || !c.anxietyBeat) return false;
    const flags = state.flags || (state.flags = {});
    const fk = id + "_anxietyDone";
    if (flags[fk]) return false;
    if (composite(id) < (c.marriage.anxietyAt || 50)) return false;
    if (context === "date") {
      const dt = state.date; if (!dt) return false;
      if (dt.beat < 1) return false; // not on the very first beat
    }
    renderAnxietyBeat(id, context);
    return true;
  }
  function renderAnxietyBeat(id, context) {
    renderHud(); clearScreen();
    const c = D.CHARACTERS[id], A = c.anxietyBeat, w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `${c.emoji} ${c.name}`));
    w.appendChild(el("p", "talk-prompt", A.q));
    const o = el("div", "choices");
    A.opts.forEach((opt, i) => o.appendChild(button(opt.said, () => {
      const flags = state.flags || (state.flags = {});
      flags[id + "_anxietyDone"] = true;
      if (opt.clears) flags[id + "_anxietyCleared"] = true;
      adjustBar(id, "affection", opt.aff || 0); adjustBar(id, "romance", opt.rom || 0);
      const resumeAfter = () => {
        if (context === "date") renderDateBeat();
        else if (context === "party") partyAfter();
        else advancePhase();
      };
      renderResult({
        title: opt.clears ? "Something lands" : (opt.aff < 0 ? "Cooler than it should be" : "Recovered, mostly"),
        lines: [opt.line, `Affection ${opt.aff >= 0 ? "+" : ""}${opt.aff || 0} · Romance ${opt.rom >= 0 ? "+" : ""}${opt.rom || 0}`],
        tone: opt.clears ? "good" : (opt.aff < 0 ? "bad" : "neutral"),
        then: resumeAfter, thenLabel: "Continue",
      });
    }, opt.clears ? "choice move" : "choice")));
    w.appendChild(o); screen().appendChild(w);
  }
  function afterVenueBeats() {
    const dt = state.date, scene = D.DATE_SCENES[dt.venue];
    if (scene.bill) return renderBill();
    resolveVenue(0, null);
  }
  function renderBill() {
    renderHud(); clearScreen();
    const dt = state.date, scene = D.DATE_SCENES[dt.venue], cost = D.LOCATIONS[dt.venue].dateCost;
    const w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `The bill — ${D.LOCATIONS[dt.venue].name}`));
    const billIntro = voiceFor(dt.id, `venues.${dt.venue}.bill.intro`);
    w.appendChild(el("p", "char-line", billIntro || `It comes to about $${cost}. She watches to see what you do — everyone always does.`));
    const o = el("div", "choices");
    let anyAffordable = false;
    for (const bid of scene.bill.options) {
      const bopt = D.BILL[bid], due = Math.round(cost * bopt.costMul);
      const label = `${bopt.text}${due ? `  (−$${due})` : "  ($0)"}`;
      if (due > state.money) o.appendChild(button(`${label} — can't afford`, null, "choice", true));
      else { anyAffordable = true; o.appendChild(button(label, () => resolveVenue(due, bopt, bid), "choice")); }
    }
    if (!anyAffordable)
      o.appendChild(button("Come up short — she quietly covers it (ouch)", () => resolveVenue(0, { trait: "independent", mag: 1, cheap: true }, "cheap"), "choice subtle"));
    w.appendChild(o); screen().appendChild(w);
  }
  function resolveVenue(due, bopt, billKey) {
    const dt = state.date, c = D.CHARACTERS[dt.id];
    state.money -= due; dt.spent += due;
    if (bopt) dt.picks.push({ trait: bopt.trait, mag: bopt.mag });
    // Stash her voice line for the chosen bill option (if any), surfaced
    // into the venue result lines below.
    if (billKey) dt._billVoice = voiceFor(dt.id, `venues.${dt.venue}.bill.lines.${billKey}`);
    let score = 0, mag = 0;
    for (const p of dt.picks) { score += (c.traitAffinity[p.trait] || 0) * p.mag; mag += p.mag; }
    let q = mag ? score / mag : 0;
    if (bopt && bopt.cheap) { const pen = (c.traitAffinity.independent || 0) >= 2 ? Math.round(T.cheapBillPenalty / 2) : T.cheapBillPenalty; adjustBar(dt.id, "affection", -pen); q -= 0.4; }
    // Car read — once per venue. Beater + classy = real bite. Luxury reads positive.
    const cr = carRead(dt.id);
    let carLine = null;
    if (cr.penalty > 0) {
      q -= cr.penalty * T.carDislikeQ;
      const hit = Math.min(4, Math.round(cr.penalty));
      adjustBar(dt.id, "affection", -hit); dt.totAff -= hit;
      carLine = `· the ${carDef().name} did not help.`;
    } else if (cr.bonus > 0) {
      q += cr.bonus * T.carDislikeQ * 0.5;
      const bump = Math.min(3, Math.round(cr.bonus));
      adjustBar(dt.id, "attraction", bump);
      carLine = `· she noticed the ${carDef().name}.`;
    }
    const rom = Math.round(T.dateRomance + q * 4), aff = Math.round(T.dateAffection + q * 3);
    adjustBar(dt.id, "romance", rom); adjustBar(dt.id, "affection", aff);
    if (q > 0.5) adjustBar(dt.id, "attraction", T.dateAttractionEvent);
    dt.totRom += rom; dt.totAff += aff; dt.venuesDone += 1; dt.used.push(dt.venue); dt.bestQ = Math.max(dt.bestQ, q);
    const vn = D.LOCATIONS[dt.venue].name;
    const billVoice = dt._billVoice; dt._billVoice = null;
    renderResult({
      title: q > 1 ? `${vn}: a great stretch` : q > 0 ? `${vn}: going well` : q > -0.5 ? `${vn}: just okay` : `${vn}: stiff`,
      lines: [
        billVoice || (q > 0.6 ? `${c.name} is fully in this. You can feel it.` : q < -0.3 ? `${c.name} is being polite, which is its own kind of answer.` : `${c.name} seems content to see where this goes.`),
        `Romance ${rom >= 0 ? "+" : ""}${rom} · Affection ${aff >= 0 ? "+" : ""}${aff}${bopt && bopt.cheap ? " · the cheap move landed badly" : ""}${carLine ? "  " + carLine : ""}`,
        dt.spent ? `Spent so far: $${dt.spent}.` : "No bill here — just the night."],
      tone: q > 0 ? "good" : q > -0.5 ? "neutral" : "bad", then: () => offerContinue(q), thenLabel: "And then…",
    });
  }
  function offerContinue(lastQ) {
    const dt = state.date, c = D.CHARACTERS[dt.id], rom = barVal(dt.id, "romance");
    const canMore = dt.venuesDone < T.maxDateVenues && lastQ >= T.dateContinueMinQ;
    const venues = Object.entries(D.LOCATIONS).filter(([lid, loc]) => D.DATE_SCENES[lid] && loc.dateSpot && !dt.used.includes(lid));
    const homeOK = D.HOME && !dt.used.includes("home") && rom >= gateFor(dt.id, "homeRomance", T.homeContinueMinRomance);
    const overlookOK = D.OVERLOOK && !dt.used.includes("overlook");
    const beachOK = D.BEACH && !dt.used.includes("beach");
    if (!canMore || (!venues.length && !homeOK && !overlookOK && !beachOK)) return renderDateEnd();
    renderHud(); clearScreen();
    const w = el("div", "talk");
    w.appendChild(el("div", "talk-head", "The night's still young"));
    w.appendChild(el("p", "char-line", lastQ > 0.6 ? `${c.name}, close to your ear: "I'm not ready for this to be over."` : `${c.name} glances at the door, then back at you. Open to more.`));
    const o = el("div", "choices");
    for (const [lid, loc] of venues) o.appendChild(button(`\"Come on — ${loc.name}.\"  (${loc.dateCost ? "~$" + loc.dateCost : "free"})`, () => startDate(dt.id, lid), "choice"));
    if (overlookOK) {
      if (canDrive()) o.appendChild(button(`\"Drive up to the overlook with me.\"  (${D.LOCATIONS.overlook.dateCost ? "~$" + D.LOCATIONS.overlook.dateCost : "free"})`, () => startDate(dt.id, "overlook"), "choice move"));
      else o.appendChild(button("\"Drive up to the overlook with me.\" — 🚗 needs a car", null, "choice", true));
    }
    if (beachOK) {
      if (canDrive()) o.appendChild(button(`\"Let's go down to the beach.\"  (${D.LOCATIONS.beach.dateCost ? "~$" + D.LOCATIONS.beach.dateCost : "free"})`, () => startDate(dt.id, "beach"), "choice move"));
      else o.appendChild(button("\"Let's go down to the beach.\" — 🚗 needs a car", null, "choice", true));
    }
    if (homeOK) o.appendChild(button(`\"…my place?\"  (${D.LOCATIONS.home.dateCost ? "~$" + D.LOCATIONS.home.dateCost : "free"})`, () => startDate(dt.id, "home"), "choice move"));
    o.appendChild(button("Wind it down here", renderDateEnd, "choice subtle"));
    w.appendChild(o); screen().appendChild(w);
  }
  function renderDateEnd() {
    renderHud(); clearScreen();
    const dt = state.date, c = D.CHARACTERS[dt.id], w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `End of the night · ${c.name}`));
    w.appendChild(el("p", "char-line", "You're at the door. The night's whole arc is in how you land this."));
    const o = el("div", "choices");
    for (const e of D.DATE_END) o.appendChild(button(e.say, () => finalizeDate(e), "choice"));
    w.appendChild(o); screen().appendChild(w);
  }
  function finalizeDate(endChoice) {
    const dt = state.date, id = dt.id, c = D.CHARACTERS[id];
    let endLine = "", er = 0, ea = 0;
    if (endChoice.kind === "gracious") { ea = 5; endLine = `${c.name}: "Goodnight." She lingers a second longer than she has to.`; }
    else if (endChoice.kind === "forward") { er = 3; ea = 3; endLine = `${c.name}: "I'm holding you to that."`; }
    else { // eager
      if (barVal(id, "romance") >= 50) { er = 10; adjustBar(id, "attraction", 3); endLine = `${c.name} doesn't answer in words. She doesn't have to.`; }
      else { er = -2; ea = -3; endLine = `${c.name} smiles, kind but cool. "…Goodnight." A little too eager.`; }
    }
    adjustBar(id, "romance", er); adjustBar(id, "affection", ea);
    if (dt.bestQ > 0.5) adjustBar(id, "attraction", T.dateAttractionEvent);
    state.milestones[id].dates += 1;
    const venues = dt.used.map((v) => D.LOCATIONS[v].name).join(" → ");
    state.date = null;
    renderResult({
      title: dt.bestQ > 1 ? "An unforgettable night" : dt.bestQ > 0 ? "A good night" : "That was a slog",
      lines: [endLine, `${venues}.`, `Total: Romance ${dt.totRom + er >= 0 ? "+" : ""}${dt.totRom + er} · Affection ${dt.totAff + ea >= 0 ? "+" : ""}${dt.totAff + ea} · $${dt.spent} spent.`, (dt.used.includes("home") || dt.used.includes("overlook") || dt.used.includes("beach")) ? "Some of the night you keep to yourself." : null].filter(Boolean),
      tone: dt.bestQ > 0 ? "good" : "neutral", then: () => { state.metCount[id] += 1; advancePhase(); },
    });
  }

  // ---------- home / overlook date: deep, explorable ----------
  const subN = (s, name) => String(s).replace(/\{n\}/g, name);
  function placeDef() { const p = state.date && state.date.place; return p === "overlook" ? D.OVERLOOK : p === "beach" ? D.BEACH : D.HOME; }
  function placeIcon() { const p = state.date && state.date.place; return p === "overlook" ? "🌃" : p === "beach" ? "🏖️" : "🏠"; }
  function placeName() { const p = state.date && state.date.place; return p === "overlook" ? "Overlook" : p === "beach" ? "Beach" : "Home"; }
  function bedroomUnlocked() {
    const dt = state.date, g = placeDef().bedroomGate;
    if (!g) return true;
    return dt.home.inti >= g.inti && barVal(dt.id, "romance") >= g.rom;
  }
  function startHome() { startPlace("home"); }
  function startOverlook() { startPlace("overlook"); }
  function startBeach() { startPlace("beach"); }
  function startPlace(place) {
    const dt = state.date, c = D.CHARACTERS[dt.id];
    const firstEntry = !dt.used.includes(place);
    dt.place = place;
    dt.home = { inti: 0, loosen: false, swim: null, un: {}, attire: null };
    if (firstEntry) {
      dt.used.push(place);
      const cost = (D.LOCATIONS[place] && D.LOCATIONS[place].dateCost) || 0;
      if (cost) { const due = Math.min(cost, state.money); state.money -= due; dt.spent += due; }
    }
    // First-entry reads of the place (house impress on home, car read anywhere).
    const sideLines = [];
    if (firstEntry) {
      if (place === "home") {
        const imp = houseImpressFor(dt.id);
        if (imp > 0) { adjustBar(dt.id, "affection", imp); dt.totAff += imp; sideLines.push(`(She clocks the place — affection +${imp}.)`); }
      }
      const cr = carRead(dt.id);
      if (cr.penalty > 0) {
        const hit = Math.min(4, Math.round(cr.penalty));
        adjustBar(dt.id, "affection", -hit); dt.totAff -= hit;
        sideLines.push(`(The ${carDef().name} did not do you any favors — affection −${hit}.)`);
      } else if (cr.bonus > 0) {
        const bump = Math.min(4, Math.round(cr.bonus));
        adjustBar(dt.id, "attraction", bump);
        sideLines.push(`(She glances at the ${carDef().name} — attraction +${bump}.)`);
      }
    }
    renderHud(); clearScreen();
    const w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `${placeIcon()} ${placeName()} · with ${c.name}`));
    const vIntro = voiceFor(dt.id, `places.${place}.intro`);
    w.appendChild(el("p", "char-line", subN(vIntro || placeDef().intro, c.name)));
    // Earned-moment override: when she's at the intimacy composite gate
    // and the anxiety beat resolved well, surface specialEntry once on
    // home entry. Stops the "hardest to bed" character feeling like a wall.
    const flags = state.flags || (state.flags = {});
    if (place === "home" && firstEntry && c.specialEntry && c.gates && composite(dt.id) >= c.gates.intimacyComposite && flags[dt.id + "_anxietyCleared"] && !flags[dt.id + "_specialEntryDone"]) {
      flags[dt.id + "_specialEntryDone"] = true;
      w.appendChild(el("p", "char-line", subN(c.specialEntry, c.name)));
    }
    for (const l of sideLines) w.appendChild(el("p", "char-line dim", l));
    w.appendChild(button(place === "overlook" ? "Take it in" : place === "beach" ? "Down to the sand" : "Show her in", renderHomeRooms, "primary"));
    screen().appendChild(w);
  }
  function renderHomeRooms() {
    renderHud(); clearScreen();
    const dt = state.date, c = D.CHARACTERS[dt.id], w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `${placeIcon()} ${placeName()} · with ${c.name}`));
    w.appendChild(el("p", "talk-prompt", `Interest ${composite(dt.id)} · the night's yours. Where to?`));
    const sl = homeStateLine();
    if (sl) w.appendChild(el("p", "char-line dim", sl));
    const o = el("div", "choices");
    const homeIsOwned = dt.place === "home";
    placeDef().rooms.forEach((room, i) => {
      // Owned-house tier gates which HOME rooms exist at all.
      if (homeIsOwned && !homeRoomAllowed(room.key)) return;
      if (room.key === "bedroom" && !bedroomUnlocked())
        o.appendChild(button(`${room.name} 🔒`, () => renderResult({ title: "Not tonight", lines: [subN(room.gateFail, c.name)], tone: "neutral", then: renderHomeRooms, thenLabel: "Back" }), "choice subtle"));
      else o.appendChild(button(room.name, () => renderHomeMenu(i, []), "choice"));
    });
    o.appendChild(button("Wind the night down together", renderDateEnd, "choice subtle"));
    w.appendChild(o); screen().appendChild(w);
  }
  const homeChildren = (n) => n.actions || n.sub || [];
  function homeNodeAt(roomIdx, path) {
    let n = placeDef().rooms[roomIdx];
    for (const idx of path) n = homeChildren(n)[idx];
    return n;
  }
  function gateMissing(g) {
    if (!g) return false;
    const dt = state.date, id = dt.id;
    return (g.inti && dt.home.inti < g.inti) || (g.rom && barVal(id, "romance") < g.rom) || (g.lib && barVal(id, "libido") < g.lib);
  }
  function renderHomeMenu(roomIdx, path) {
    renderHud(); clearScreen();
    const dt = state.date, c = D.CHARACTERS[dt.id];
    const room = placeDef().rooms[roomIdx], node = homeNodeAt(roomIdx, path);
    const w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `${placeIcon()} ${room.name} · with ${c.name}`));
    let enter = node.enter || (path.length === 0 ? room.enter : null);
    // Voice override: per-room enter (path 0) or per-action enter (label
    // lookup, when descending into a node with its own enter line).
    if (path.length === 0) {
      const v = voiceFor(dt.id, `places.${dt.place}.rooms.${room.key}.enter`);
      if (v) enter = v;
    } else if (node.label) {
      const v = voiceFor(dt.id, `places.${dt.place}.rooms.${room.key}.actions.${node.label}`);
      if (v) enter = v;
    }
    if (enter) w.appendChild(el("p", "char-line", subN(enter, c.name)));
    const sl = homeStateLine();
    if (sl) w.appendChild(el("p", "char-line dim", sl));
    const o = el("div", "choices");
    homeChildren(node).forEach((child, i) => {
      if (child.ustep && !undressVisible(child)) return;
      // Hot-tub: only owned houses with the perk get it.
      if (child.chance && dt.place === "home" && !houseDef().hotTub) return;
      if (child.rooms) return o.appendChild(button(child.label || "Go somewhere else", renderHomeRooms, "choice subtle"));
      if (child.back) return o.appendChild(button(child.label || "Back", () => renderHomeMenu(roomIdx, path.slice(0, -1)), "choice subtle"));
      if (gateMissing(child.gate)) return o.appendChild(button(`${child.label} — she's not there yet`, null, "choice", true));
      if (child.hercall) return o.appendChild(button(child.label, () => homeHerCall(child, roomIdx, path), "choice move"));
      const hot = child.roll && child.roll.win && (child.roll.win.kiss || child.roll.win.sex);
      if (child.sub && child.roll) return o.appendChild(button(child.label, () => homeResolveInto(child, roomIdx, path, i), hot ? "choice move" : "choice"));
      if (child.sub) return o.appendChild(button(child.label, () => renderHomeMenu(roomIdx, path.concat(i)), "choice"));
      o.appendChild(button(child.label, () => homeResolve(child, roomIdx, path), hot ? "choice move" : "choice"));
    });
    w.appendChild(o); screen().appendChild(w);
  }
  function homeAccrue(fx) {
    const dt = state.date, id = dt.id;
    if (fx.rom) adjustBar(id, "romance", fx.rom);
    if (fx.aff) adjustBar(id, "affection", fx.aff);
    if (fx.lib) adjustBar(id, "libido", fx.lib);
    if (fx.atr) adjustBar(id, "attraction", fx.atr);
    if (fx.inti) dt.home.inti += fx.inti;
    if (fx.loosen) dt.home.loosen = true;
    if (fx.un) dt.home.un[fx.un] = true;
    if (fx.attire) dt.home.attire = fx.attire;
    if (fx.kiss && !state.milestones[id].kiss) { state.milestones[id].kiss = true; adjustBar(id, "attraction", 3); }
    dt.totRom += fx.rom || 0; dt.totAff += fx.aff || 0;
    dt.bestQ = Math.max(dt.bestQ, (fx.rom || 0) / 4 + (fx.inti || 0) * 0.4);
  }
  function homeRoll(id, dc) {
    const dt = state.date, mood = moodOf(id);
    const flav = mood === "hot" ? 3 : mood === "warm" ? 1 : mood === "cold" ? -3 : 0;
    const gauge = Math.floor(composite(id) / 7) + Math.floor(barVal(id, "romance") / 9) + Math.floor(barVal(id, "libido") / 9) + (dt.home.loosen ? 2 : 0) + (dt.home.attire ? 2 : 0) + flav;
    const roll = d20(), total = roll + gauge;
    return { ok: roll !== 1 && (roll === 20 || total >= dc), roll, gauge, total, dc };
  }
  // A node can ask for a flat stat check (e.g. INT for constellations)
  // instead of the usual read of her — node.roll.stat names the stat.
  function nodeRoll(node, id) {
    if (node.roll.stat) {
      const sv = effStat(node.roll.stat), roll = d20(), dc = node.roll.dc, total = roll + sv;
      return { ok: roll !== 1 && (roll === 20 || total >= dc), roll, gauge: sv, total, dc, statLbl: D.STAT_SHORT[node.roll.stat] || node.roll.stat };
    }
    return homeRoll(id, node.roll.dc);
  }
  function homeResolveNode(node, back) {
    const dt = state.date, id = dt.id, c = D.CHARACTERS[id];
    // Voice override on per-action narration: only on win, only when she
    // has a line for this label at the current place's current room.
    const room = placeDef().rooms.find((r) => containsAction(r, node));
    const vLine = node.label && room ? voiceFor(id, `places.${dt.place}.rooms.${room.key}.actions.${node.label}`) : null;
    if (node.roll) {
      const r = nodeRoll(node, id), br = r.ok ? node.roll.win : node.roll.lose;
      const roll = { d20: r.roll, stat: r.statLbl ? `${r.statLbl} ${r.gauge}` : `read ${r.gauge}`, vibe: 0, vibeNote: "", total: r.total, dc: r.dc };
      if (!r.ok && br.hard) return homeBail(br, roll);
      if (r.ok && br.sex) return renderSexChoice(back, typeof br.sex === "string" ? br.sex : null);
      homeAccrue(br.fx || {});
      const lines = r.ok && vLine ? [vLine] : weaveAttire(br.lines, br.fx).map((l) => subN(l, c.name));
      return renderResult({ title: r.ok ? "She's right there" : "Not quite there", roll, lines: lines.map((l) => subN(l, c.name)), tone: r.ok ? "good" : "bad", then: back, thenLabel: "Back" });
    }
    homeAccrue(node.fx || {});
    const lines = vLine ? [vLine] : weaveAttire(node.lines, node.fx).map((l) => subN(l, c.name));
    renderResult({ title: "…", lines: lines.map((l) => subN(l, c.name)), tone: "good", then: back, thenLabel: "Back" });
  }
  function containsAction(node, target) {
    const ch = node.actions || node.sub; if (!ch) return false;
    for (const c of ch) { if (c === target) return true; if (containsAction(c, target)) return true; }
    return false;
  }
  function homeResolve(child, roomIdx, path) {
    if (child.chance) return homeSwim(roomIdx, path);
    homeResolveNode(child, () => renderHomeMenu(roomIdx, path));
  }
  // "Whatever you're comfortable with": she picks safe vs spicy from her
  // mood + personality, and (spicy) decides which article goes herself.
  function homeHerCall(child, roomIdx, path) {
    const dt = state.date, id = dt.id, c = D.CHARACTERS[id], ta = c.traitAffinity || {};
    const md = moodOf(id), mf = md === "hot" ? 16 : md === "warm" ? 7 : md === "cold" ? -14 : 0;
    const score = composite(id) + barVal(id, "romance") * 0.5 + barVal(id, "libido") * 0.5 + (dt.home.inti || 0) * 2
      + (ta.adventurous || 0) * 8 + (ta.independent || 0) * 5 - (ta.classy || 0) * 6 - (ta.sincere || 0) * 3 + mf;
    const spicy = score >= 78;
    const br = spicy ? child.hercall.spicy : child.hercall.safe;
    const fx = Object.assign({}, br.fx || {});
    if (spicy) {
      const un = dt.home.un || {};
      const next = ["bra", "shirt", "pants", "panties"].find((k) => !un[k]);
      if (next && !(next === "panties" && barVal(id, "romance") < 48)) fx.un = next;
    }
    homeAccrue(fx);
    renderResult({ title: spicy ? "She decides — and she's not shy about it" : "She keeps it exactly where she wants it", lines: weaveAttire(br.lines, fx).map((l) => subN(l, c.name)), tone: "good", then: () => renderHomeMenu(roomIdx, path), thenLabel: "Back" });
  }
  const SWIM_ENTER = { inTub: "The water's hot enough to hurt for a second, then exactly right. The night goes very quiet around the two of you.", getOut: "Steam pouring off both of you into the cold dark. There's a way to do this part." };
  function swimNamed(name) { return placeDef().swim[name] || []; }
  function gotoFire(roomIdx) {
    const rooms = placeDef().rooms, yi = rooms.findIndex((r) => r.key === "yard");
    if (yi < 0) return renderHomeMenu(roomIdx, []);
    const fi = rooms[yi].actions.findIndex((a) => /fire/i.test(a.label));
    if (fi < 0) return renderHomeMenu(yi, []);
    renderHomeMenu(yi, [fi]);
  }
  function homeSwim(roomIdx, path) {
    const dt = state.date, c = D.CHARACTERS[dt.id], sw = placeDef().swim;
    const back = () => renderHomeMenu(roomIdx, path);
    if (dt.home.swim === null) {
      const ta = c.traitAffinity;
      let p = 0.45 + ((ta.classy || 0) - (ta.adventurous || 0)) * 0.07;
      p = Math.max(0.15, Math.min(0.8, p));
      dt.home.swim = Math.random() < p ? "suit" : "none";
    }
    if (dt.home.swim === "suit") {
      homeAccrue(sw.hasSuit.fx);
      const vSuit = voiceFor(dt.id, `places.${dt.place}.swim.hasSuit`);
      return renderResult({ title: "Into the tub", lines: [vSuit || sw.hasSuit.lines[0]].map((l) => subN(l, c.name)), tone: "good", then: () => swimList(sw.hasSuit.swimNext || "inTub", roomIdx), thenLabel: "…in the water" });
    }
    const vAsk = voiceFor(dt.id, `places.${dt.place}.swim.ask`);
    swimNodes(sw.noSuit, vAsk || sw.ask, back, roomIdx, "The hot tub");
  }
  function swimList(name, roomIdx) {
    swimNodes(swimNamed(name), SWIM_ENTER[name] || null, () => renderHomeMenu(roomIdx, []), roomIdx, name === "getOut" ? "Drying off" : "In the tub");
  }
  function swimNodes(nodes, enterLine, parentBack, roomIdx, head) {
    renderHud(); clearScreen();
    const c = D.CHARACTERS[state.date.id], w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `♨️ ${head || "The hot tub"} · with ${c.name}`));
    if (enterLine) w.appendChild(el("p", "char-line", subN(enterLine, c.name)));
    const sl = homeStateLine();
    if (sl) w.appendChild(el("p", "char-line dim", sl));
    const o = el("div", "choices");
    let sawBack = false;
    const self = () => swimNodes(nodes, enterLine, parentBack, roomIdx, head);
    nodes.forEach((n) => {
      if (n.back) { sawBack = true; return o.appendChild(button(n.label || "Back up", parentBack, "choice subtle")); }
      if (n.rooms) return o.appendChild(button(n.label || "Head inside", renderHomeRooms, "choice subtle"));
      if (n.backTub) return o.appendChild(button(n.label || "Back into the water", () => swimList("inTub", roomIdx), "choice"));
      if (n.goOut) return o.appendChild(button(n.label || "Climb out", () => swimList("getOut", roomIdx), "choice"));
      if (n.toFire) return o.appendChild(button(n.label || "Over to the fire", () => gotoFire(roomIdx), "choice"));
      if (gateMissing(n.gate)) return o.appendChild(button(`${n.label} — she's not there yet`, null, "choice", true));
      const hot = n.roll && n.roll.win && (n.roll.win.kiss || n.roll.win.sex);
      o.appendChild(button(n.label, () => swimPick(n, self, parentBack, roomIdx, head), hot ? "choice move" : "choice"));
    });
    if (!sawBack && parentBack) o.appendChild(button("Back", parentBack, "choice subtle"));
    w.appendChild(o); screen().appendChild(w);
  }
  function swimPick(n, selfBack, parentBack, roomIdx, head) {
    const dt = state.date, c = D.CHARACTERS[dt.id];
    const descend = (sub) => swimNodes(sub, n.enter, selfBack, roomIdx, head);
    // Voice override for hot-tub actions — swim nodes live under
    // placeDef().swim and aren't in a room; key them under the "swim" key.
    const vLine = n.label ? voiceFor(dt.id, `places.${dt.place}.swim.inTub.${n.label}`)
                          || voiceFor(dt.id, `places.${dt.place}.swim.getOut.${n.label}`)
                          || voiceFor(dt.id, `places.${dt.place}.swim.noSuit.${n.label}`) : null;
    if (n.roll) {
      const r = homeRoll(dt.id, n.roll.dc), br = r.ok ? n.roll.win : n.roll.lose;
      const roll = { d20: r.roll, stat: `read ${r.gauge}`, vibe: 0, vibeNote: "", total: r.total, dc: r.dc };
      if (!r.ok && br.hard) return homeBail(br, roll);
      if (r.ok && br.sex) return renderSexChoice(selfBack, typeof br.sex === "string" ? br.sex : null);
      homeAccrue(br.fx || {});
      const nextOnWin = r.ok && n.roll.swimNext ? () => swimList(n.roll.swimNext, roomIdx) : (r.ok && n.sub ? () => descend(n.sub) : selfBack);
      const lines = r.ok && vLine ? [vLine] : weaveAttire(br.lines, br.fx).map((l) => subN(l, c.name));
      return renderResult({ title: r.ok ? "She's right there" : "Not quite there", roll, lines: lines.map((l) => subN(l, c.name)), tone: r.ok ? "good" : "bad", then: r.ok ? nextOnWin : selfBack, thenLabel: r.ok && (n.roll.swimNext || n.sub) ? "…then" : "Back" });
    }
    if (n.swimNext) { homeAccrue(n.fx || {}); return renderResult({ title: "…", lines: (vLine ? [vLine] : (n.lines || ["You both get in."])).map((l) => subN(l, c.name)), tone: "good", then: () => swimList(n.swimNext, roomIdx), thenLabel: "…in the water" }); }
    if (n.sub) return descend(n.sub);
    homeAccrue(n.fx || {});
    const lines = vLine ? [vLine] : weaveAttire(n.lines, n.fx).map((l) => subN(l, c.name));
    renderResult({ title: "…", lines: lines.map((l) => subN(l, c.name)), tone: "good", then: selfBack, thenLabel: "Back" });
  }
  function homeBail(br, roll) {
    const dt = state.date, id = dt.id, c = D.CHARACTERS[id];
    homeAccrue(br.fx || {});
    state.milestones[id].dates += 1;
    const venues = dt.used.map((v) => D.LOCATIONS[v].name).join(" → ");
    const tot = `Total: Romance ${dt.totRom >= 0 ? "+" : ""}${dt.totRom} · Affection ${dt.totAff >= 0 ? "+" : ""}${dt.totAff} · $${dt.spent} spent.`;
    state.date = null;
    renderResult({
      title: "The night ends early", roll,
      lines: br.lines.map((l) => subN(l, c.name)).concat([`${venues}.`, tot, "She calls a car. The door closes softer than the mood did."]),
      tone: "bad", then: () => { state.metCount[id] += 1; advancePhase(); },
    });
  }
  // What she's wearing right now — a single consistent tracker that
  // carries across every room/activity for the rest of the night.
  function attireState() {
    const h = state.date && state.date.home; if (!h) return "dressed";
    if (h.attire === "bare" || h.un.panties) return "bare";
    if (h.attire === "towel") return "towel";
    if (h.un.pants || (h.un.bra && h.un.shirt)) return "stripped";
    if (h.un.shirt) return "topless";
    if (h.attire === "underwear") return "underwear";
    if (h.attire === "suit") return "suit";
    return "dressed";
  }
  // Short clothing label for the HUD card — only when there's something
  // to say (active date with her, or a party strip dare in play).
  function clothStatus(id) {
    if (state.date && state.date.id === id && state.date.home) {
      const m = { bare: "naked", towel: "in just a towel", underwear: "down to underwear", suit: "in a swimsuit", topless: "topless", stripped: "half-undressed" };
      return m[attireState()] || null;
    }
    if (state.partyRun && typeof stripLvl === "function") {
      const l = stripLvl(id);
      if (l) return l >= 3 ? "down to nothing" : l === 2 ? "down to almost nothing" : "a layer down";
    }
    return null;
  }
  // Undress steps are state-aware: removed garments and the whole branch
  // (once she's bare, or post-swim) stop being offered. Fixes "still able
  // to undress her when she's already naked"; lets the chain be flat.
  function undressVisible(child) {
    const h = state.date && state.date.home; if (!h) return true;
    const a = attireState(), un = h.un || {};
    const post = a === "towel" || a === "underwear" || a === "suit" || a === "bare";
    switch (child.ustep) {
      case "begin": return a !== "bare";
      case "jacket": return !post && !un.jacket;
      case "camera": return a === "bare";
      case "shirt": return !post && !un.shirt;
      case "bra": return !post && !un.bra;
      case "chest": return !post && (un.bra || un.shirt);
      case "pants": return !post && !un.pants;
      case "panties": return !post && !un.panties;
      case "hercall": return !post;
      case "rest": return !!un.panties || (!post && un.shirt && un.bra && un.pants);
      case "bareall": return a === "bare";
      default: return true;
    }
  }
  function homeStateLine() {
    switch (attireState()) {
      case "bare": return "Neither of you bothered with clothes after the tub. Nobody's bringing it up — it's just how the rest of the night is now.";
      case "towel": return "She's still in just a towel from the tub, hair damp, entirely aware of it, and not fixing it.";
      case "underwear": return "She never got back into the dress after the water — down to her underwear and unbothered about it.";
      case "suit": return "She's still in the swimsuit, half-dried, the dress abandoned wherever she left it.";
      case "topless": return "Her top came off a while ago and stayed off; she's spent the rest of this topless and stopped thinking about it.";
      case "stripped": return "Most of what she had on is somewhere on the floor by now, and she's carrying on like that's just the state of things — because it is.";
      default: return null;
    }
  }
  // A short trailing clause woven into other activities so a partial
  // state of dress stays consistent (e.g. dancing topless).
  function attireClause() {
    switch (attireState()) {
      case "bare": return "— and she's doing all of this with nothing on, like the tub settled the dress code for good.";
      case "towel": return "— she does the whole thing in just the towel, holding it shut with one careless hand.";
      case "underwear": return "— still just in her underwear from the water, and past caring who'd care.";
      case "suit": return "— still in the half-dry swimsuit, leaving wet shapes on everything.";
      case "topless": return "— and she does it topless, like the shirt was never part of the plan.";
      case "stripped": return "— wearing almost nothing from before and entirely unbothered about it.";
      default: return null;
    }
  }
  // Append the attire clause to an activity's narration when she's not
  // fully dressed and this beat didn't itself change what she's wearing.
  function weaveAttire(lines, fx) {
    if (fx && (fx.un || fx.attire)) return lines;
    const cl = attireClause();
    if (!cl || !lines || !lines.length) return lines;
    const out = lines.slice();
    out[out.length - 1] = out[out.length - 1] + " " + cl;
    return out;
  }
  function homeResolveInto(child, roomIdx, path, i) {
    const dt = state.date, id = dt.id, c = D.CHARACTERS[id];
    const r = nodeRoll(child, id), br = r.ok ? child.roll.win : child.roll.lose;
    const roll = { d20: r.roll, stat: r.statLbl ? `${r.statLbl} ${r.gauge}` : `read ${r.gauge}`, vibe: 0, vibeNote: "", total: r.total, dc: r.dc };
    if (!r.ok && br.hard) return homeBail(br, roll);
    homeAccrue(br.fx || {});
    if (r.ok) return renderResult({ title: "She's with you", roll, lines: (br.lines || []).map((l) => subN(l, c.name)), tone: "good", then: () => renderHomeMenu(roomIdx, path.concat(i)), thenLabel: "…go on" });
    renderResult({ title: "Not quite there", roll, lines: br.lines.map((l) => subN(l, c.name)), tone: "bad", then: () => renderHomeMenu(roomIdx, path), thenLabel: "Back" });
  }
  // variant: a string (e.g. "shoot") selects placeDef()[variant+"Sex"] and
  // a matching D.INTIMACY[variant] beat set, so the scene + choices reflect
  // the situation (the phone) rather than the default place prose.
  function sexBlock(variant) { return (variant && placeDef()[variant + "Sex"]) || placeDef().sex; }
  function renderSexChoice(back, variant) {
    const dt = state.date, c = D.CHARACTERS[dt.id], sx = sexBlock(variant);
    renderHud(); clearScreen();
    const w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `Just the two of you · ${c.name}`));
    const vAsk = voiceFor(dt.id, `places.${dt.place}.sexAsk`);
    w.appendChild(el("p", "char-line", subN(vAsk || sx.ask, c.name)));
    const have = (state.inventory.condom || 0) > 0;
    const o = el("div", "choices");
    o.appendChild(button(have ? `Use a condom  (have ${state.inventory.condom})` : "Use a condom — none in your bag", have ? () => sexResolve("condom", back, variant) : null, "choice", !have));
    o.appendChild(button("Go without — read her", () => sexResolve("raw", back, variant), "choice move"));
    o.appendChild(button("Slow it back down — not tonight", () => sexResolve("back", back, variant), "choice subtle"));
    w.appendChild(o); screen().appendChild(w);
  }
  function sexResolve(kind, back, variant) {
    const dt = state.date, id = dt.id, c = D.CHARACTERS[id], sx = sexBlock(variant);
    if (kind === "back") {
      homeAccrue(sx.back.fx);
      const vBack = voiceFor(id, `places.${dt.place}.sexBack`);
      return renderResult({ title: "Not tonight, the rest", lines: (vBack ? [vBack] : sx.back.lines).map((l) => subN(l, c.name)), tone: "good", then: back, thenLabel: "Back" });
    }
    if (kind === "condom") {
      state.inventory.condom -= 1; homeAccrue(sx.condom.fx);
      const vCon = voiceFor(id, `places.${dt.place}.sexCondom`);
      return renderIntimacy(id, vCon ? [vCon] : sx.condom.lines, renderDateEnd, false, variant);
    }
    const ta = c.traitAffinity;
    const mod = Math.floor(barVal(id, "libido") / 12) + ((ta.adventurous || 0) > 0 ? 2 : 0) - ((ta.classy || 0) > 0 ? 2 : 0) - ((ta.sincere || 0) > 0 ? 1 : 0);
    const r = homeRoll(id, sx.raw.dc - mod);
    const roll = { d20: r.roll, stat: `read ${r.gauge} · her ${mod >= 0 ? "+" : ""}${mod}`, vibe: 0, vibeNote: "", total: r.total, dc: r.dc };
    if (!r.ok) {
      const vLose = voiceFor(id, `places.${dt.place}.sexRawLose`);
      const loseBlock = vLose ? Object.assign({}, sx.raw.lose, { lines: [vLose] }) : sx.raw.lose;
      return homeBail(loseBlock, roll);
    }
    homeAccrue(sx.raw.win.fx);
    const vWin = voiceFor(id, `places.${dt.place}.sexRawWin`);
    renderIntimacy(id, vWin ? [vWin] : sx.raw.win.lines, renderDateEnd, true, variant);
  }
  // ---- shared, non-graphic intimacy beats (home date + party slip-away) ----
  function intimFx(id, fx) {
    if (fx.rom) adjustBar(id, "romance", fx.rom);
    if (fx.aff) adjustBar(id, "affection", fx.aff);
    if (fx.lib) adjustBar(id, "libido", fx.lib);
    if (fx.atr) adjustBar(id, "attraction", fx.atr);
    if (!state.milestones[id].kiss) state.milestones[id].kiss = true;
    if (state.date && state.date.home) {
      const dt = state.date;
      dt.totRom += fx.rom || 0; dt.totAff += fx.aff || 0;
      if (fx.inti) dt.home.inti += fx.inti;
      dt.bestQ = Math.max(dt.bestQ, (fx.rom || 0) / 4 + (fx.inti ? fx.inti * 0.4 : 0) + 1);
    }
  }
  function renderIntimacy(id, introLines, afterFn, raw, beatsKey) {
    state.intim = { id, beat: 0, rounds: 0, after: afterFn, log: (introLines || []).slice(), closeTone: "good", raw: !!raw, finishDone: false, beatsKey: beatsKey || null };
    renderIntimacyBeat();
  }
  function renderIntimacyBeat() {
    const im = state.intim, c = D.CHARACTERS[im.id], F = D.INTIMACY.finish;
    const beats = (im.beatsKey && D.INTIMACY[im.beatsKey] && D.INTIMACY[im.beatsKey].beats) || D.INTIMACY.beats;
    // Map source-order beat index → her voice phase name.
    const PHASES = ["open", "leading", "intensity", "finish"];
    renderHud(); clearScreen();
    const w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `The rest of the night · ${c.name}`));
    for (const l of im.log.slice(-3)) w.appendChild(el("p", "char-line", subN(l, c.name)));
    const o = el("div", "choices");
    if (im.beat < beats.length) {
      const node = beats[im.beat], phase = PHASES[im.beat];
      w.appendChild(el("p", "talk-prompt", node.q));
      node.opts.forEach((opt, i) => o.appendChild(button(opt.label, () => {
        intimFx(im.id, opt.fx);
        const vSaid = phase ? voiceFor(im.id, `intimacy.${phase}.${i}.said`) : null;
        const vLine = phase ? voiceFor(im.id, `intimacy.${phase}.${i}.line`) : null;
        if (vSaid) im.log.push(vSaid);
        im.log.push(vLine || opt.line);
        im.beat += 1; renderIntimacyBeat();
      }, "choice")));
    } else if (im.raw && !im.finishDone) {
      w.appendChild(el("p", "talk-prompt", F.q));
      o.appendChild(button(F.pull.label, () => {
        intimFx(im.id, F.pull.fx);
        const vPull = pick(voiceFor(im.id, "intimacy.pull"), `intim.pull.${im.id}.${state.day}`);
        im.log.push(vPull || F.pull.line); im.finishDone = true;
        // Optional follow-up: "where?" sub-beat for characters who opt in.
        if (c.hasFinishWhere && F.where) return renderFinishWhere();
        renderIntimacyBeat();
      }, "choice"));
      o.appendChild(button(F.inside.label, () => {
        intimFx(im.id, F.inside.fx);
        const vIn = pick(voiceFor(im.id, "intimacy.inside"), `intim.inside.${im.id}.${state.day}`);
        im.log.push(vIn || F.inside.line); im.finishDone = true;
        if (!state.preg[im.id] && Math.random() < T.pregChanceRaw)
          state.preg[im.id] = { sinceDay: state.day, talked: false, status: null };
        renderIntimacyBeat();
      }, "choice move"));
    } else {
      const ctx = im.beatsKey && D.INTIMACY[im.beatsKey] && D.INTIMACY[im.beatsKey].close;
      const node = ctx || D.INTIMACY.close;
      w.appendChild(el("p", "talk-prompt", node.q));
      node.opts.forEach((opt, i) => {
        if (opt.again && (im.rounds || 0) >= 3) return; // sanity cap on round N
        o.appendChild(button(opt.label, () => {
          intimFx(im.id, opt.fx);
          // Only override the default INTIMACY.close — not the variant
          // close blocks (party/floor/shoot) which have their own copy.
          const vClose = !ctx ? voiceFor(im.id, `intimacy.close.${i}`) : null;
          if (vClose && vClose.said) im.log.push(vClose.said);
          im.log.push((vClose && vClose.line) || opt.line);
          im.closeTone = opt.tone || "good";
          if (opt.again) { im.rounds = (im.rounds || 0) + 1; im.beat = 0; im.finishDone = false; renderIntimacyBeat(); }
          else finishIntimacy();
        }, opt.again ? "choice move" : "choice"));
      });
    }
    w.appendChild(o); screen().appendChild(w);
  }
  function renderFinishWhere() {
    const im = state.intim, c = D.CHARACTERS[im.id], W = D.INTIMACY.finish.where;
    renderHud(); clearScreen();
    const w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `The rest of the night · ${c.name}`));
    for (const l of im.log.slice(-2)) w.appendChild(el("p", "char-line", subN(l, c.name)));
    const vQ = pick(voiceFor(im.id, "intimacy.finishWhere.q"), `fwQ.${im.id}.${state.day}`);
    w.appendChild(el("p", "talk-prompt", vQ || W.q));
    const o = el("div", "choices");
    for (const opt of W.opts) {
      o.appendChild(button(opt.label, () => resolveFinishWhere(opt), opt.id === "ask" ? "choice subtle" : "choice"));
    }
    w.appendChild(o); screen().appendChild(w);
  }
  function resolveFinishWhere(opt) {
    const im = state.intim, c = D.CHARACTERS[im.id];
    // "Ask her" → she picks one of the others based on stage+mood. For
    // Krystalle: lover prefers stomach/chest; affair prefers chest/face/mouth.
    let chosen = opt;
    if (opt.id === "ask") {
      const stage = im.id === "krystalle" ? krystStage() : null;
      const pool = stage === "affair" ? ["chest", "face", "mouth"]
                 : stage === "lover"  ? ["stomach", "chest"]
                 : ["stomach"];
      const choice = pool[Math.floor(Math.random() * pool.length)];
      chosen = D.INTIMACY.finish.where.opts.find((o) => o.id === choice) || opt;
      const askFx = opt.fx || {};
      if (askFx.aff) adjustBar(im.id, "affection", askFx.aff);
      if (askFx.rom) adjustBar(im.id, "romance", askFx.rom);
      const vAsk = pick(voiceFor(im.id, "intimacy.finishWhere.ask"), `fwAsk.${im.id}.${state.day}`);
      if (vAsk) im.log.push(vAsk);
    }
    const fx = chosen.fx || {};
    if (fx.rom) adjustBar(im.id, "romance", fx.rom);
    if (fx.lib) adjustBar(im.id, "libido", fx.lib);
    if (fx.atr) adjustBar(im.id, "attraction", fx.atr);
    if (fx.aff) adjustBar(im.id, "affection", fx.aff);
    const vLine = pick(voiceFor(im.id, `intimacy.finishWhere.${chosen.id}`), `fwLine.${im.id}.${chosen.id}.${state.day}`);
    if (vLine) im.log.push(vLine);
    else im.log.push(`You finish on her ${chosen.id === "stomach" ? "stomach" : chosen.id === "chest" ? "chest" : chosen.id === "face" ? "face" : "lips"}. She breathes through it, eyes on yours.`);
    renderIntimacyBeat();
  }
  function finishIntimacy() {
    const im = state.intim, c = D.CHARACTERS[im.id], after = im.after, tone = im.closeTone;
    // Sex-milestone bookkeeping: first time → sex true; second time → secondSex.
    const m = state.milestones[im.id];
    if (!m.sex) { m.sex = true; }
    else if (!m.secondSex) { m.secondSex = true; }
    state.flags = state.flags || {};
    state.flags[im.id + "SexCount"] = (state.flags[im.id + "SexCount"] || 0) + 1;
    state.intim = null;
    renderResult({ title: "…and the rest of the night", lines: im.log.slice(-3).map((l) => subN(l, c.name)), tone, then: after || advancePhase, thenLabel: "…after" });
  }

  // ---------- party ----------
  function flowIndex() {
    const pr = state.partyRun; if (!pr) return 0;
    const elapsed = (D.PARTY.rounds - pr.rounds) + Math.floor(pr.drinks * (T.partyDrinkFlow || 1)) + (pr.heat || 0);
    let idx = 0; D.PARTY.flows.forEach((f, i) => { if (f.at <= elapsed) idx = i; });
    return idx;
  }
  const spicyAt = () => T.partySpicyAt || 1;
  function bumpHeat(n) { if (state.partyRun) state.partyRun.heat = (state.partyRun.heat || 0) + (n || T.partyEventHeat || 1); }
  function recept(id) { return composite(id); }
  function partyRoomDef() { const pr = state.partyRun; return D.PARTY.rooms.find((r) => r.key === (pr && pr.room)) || D.PARTY.rooms[0]; }
  function gameLen() { return state.pg && state.pg.game === "truthdare" ? (D.PARTY.tdRounds || 6) : (D.PARTY.gameRounds || 3); }
  // Per-person party clothing: 0 dressed → 3 naked. Persists for the whole
  // party (lives on partyRun, so it resets when the party ends).
  function stripMap() { const pr = state.partyRun; if (!pr.strip) pr.strip = {}; return pr.strip; }
  function stripLvl(key) { return Math.min(3, stripMap()[key] || 0); }
  function stripAdd(key, n) { const m = stripMap(); m[key] = Math.min(3, (m[key] || 0) + (n || 1)); return m[key]; }
  function stripWord(lvl) { return lvl >= 3 ? "down to nothing" : lvl === 2 ? "down to almost nothing" : "a layer down"; }
  function clothLine(key, name) {
    const l = stripLvl(key); if (!l) return null;
    return `${name} is still ${stripWord(l)} from earlier — and long past minding.`;
  }
  function partyAttireLine() {
    const pr = state.partyRun; if (!pr) return null;
    const bits = [];
    if (stripLvl("you")) bits.push(`you're ${stripWord(stripLvl("you"))}`);
    for (const id of partyGuests()) if (stripLvl(id)) bits.push(`${D.CHARACTERS[id].name}'s ${stripWord(stripLvl(id))}`);
    if (!bits.length) return null;
    return `Dress code's a memory — ${bits.join(", ")}, and nobody's fixing it.`;
  }
  function renderParty() {
    if (!state.partyRun) state.partyRun = { rounds: D.PARTY.rounds, eventDone: false, drinks: 0, room: "main", heat: 0, strip: {} };
    const pr = state.partyRun;
    if (pr.room == null) pr.room = "main";
    renderHud(); clearScreen();
    const w = el("div", "location");
    w.appendChild(el("h2", null, "🎉 House Party"));
    if (!pr.eventDone) {
      w.appendChild(el("p", "char-line", "You shoulder through the door into heat and noise. Someone presses a drink into your hand before you've even got your bearings — this one's loud early."));
      const o = el("div", "choices");
      o.appendChild(button("Take it (CHA/STY up, INT down)", () => { pr.eventDone = true; pr.drinks++; state.buffs.push({ stat: "charisma", amount: 4, phasesLeft: 1 }, { stat: "style", amount: 3, phasesLeft: 1 }, { stat: "intelligence", amount: -3, phasesLeft: 1 }); renderParty(); }, "primary"));
      o.appendChild(button("Wave it off, stay sharp", () => { pr.eventDone = true; renderParty(); }, "choice"));
      w.appendChild(o); screen().appendChild(w); return;
    }
    const fi = flowIndex(), flow = D.PARTY.flows[fi], room = partyRoomDef();
    w.appendChild(el("p", "char-line", `${flow.desc} ${pr.rounds} thing${pr.rounds === 1 ? "" : "s"} before you'd call it a night.`));
    w.appendChild(el("p", "talk-prompt", `📍 ${room.name} — ${room.desc}`));
    const guests = partyGuests();
    w.appendChild(el("p", "subtitle", "Around: " + guests.map((g) => D.CHARACTERS[g].name).join(", ")));
    const al = partyAttireLine();
    if (al) w.appendChild(el("p", "char-line dim", al));
    const o = el("div", "choices");
    const k = room.key;
    for (const id of guests) o.appendChild(button(`Talk to ${D.CHARACTERS[id].name}`, () => startConvo(id, "party", true), "primary"));
    if (k === "main") o.appendChild(button("Get pulled into a game", startRandomGame, "choice"));
    if (k === "main" || k === "yard") for (const id of guests) o.appendChild(button(`Dance with ${D.CHARACTERS[id].name}`, () => renderDanceModes(id), "choice"));
    if (k === "kitchen") for (const id of guests) o.appendChild(button(`Body shots with ${D.CHARACTERS[id].name}`, () => renderBodyShot(id), fi >= spicyAt() ? "choice move" : "choice"));
    if ((k === "main" || k === "kitchen") && guests.length && fi >= 1) for (const id of guests) o.appendChild(button(`See who ${D.CHARACTERS[id].name}'s talking to`, () => renderNpc(id), "choice"));
    if (k === "main") for (const id of guests) if (fi >= D.PARTY.privateGateFlow && recept(id) >= D.PARTY.privateGateInterest) o.appendChild(button(`Slip away somewhere quiet with ${D.CHARACTERS[id].name}`, () => renderHookup(id, "slip"), "choice move"));
    if (k === "yard" || k === "upstairs") for (const id of guests) if (fi >= D.PARTY.privateGateFlow && recept(id) >= D.PARTY.privateGateInterest) o.appendChild(button(`Find a room with ${D.CHARACTERS[id].name}`, () => renderHookup(id, "room"), "choice move"));
    for (const id of guests) o.appendChild(button(`Bring ${D.CHARACTERS[id].name} a drink`, () => partyBuyHer(id), "choice"));
    o.appendChild(button(`Grab another drink${pr.drinks >= T.overDrinkAt - 1 ? " (you're wobbling)" : ""}`, partyDrink, "choice"));
    o.appendChild(button("Move to another room", renderPartyRooms, "choice subtle"));
    o.appendChild(button("Call it a night (leave)", endParty, "choice subtle"));
    w.appendChild(o); screen().appendChild(w);
  }
  function renderPartyRooms() {
    renderHud(); clearScreen();
    const pr = state.partyRun, fi = flowIndex(), w = el("div", "talk");
    w.appendChild(el("div", "talk-head", "🚪 Where to?"));
    w.appendChild(el("p", "char-line", "The party's bigger than one room. You shoulder off through the crush."));
    const o = el("div", "choices");
    for (const room of D.PARTY.rooms) {
      if (room.key === pr.room) { o.appendChild(button(`${room.name} — you're here`, null, "choice", true)); continue; }
      if (room.gateFlow && fi < room.gateFlow) { o.appendChild(button(`${room.name} — quiet still, no reason to be up there yet`, null, "choice", true)); continue; }
      o.appendChild(button(`${room.name} — ${room.desc}`, () => { pr.room = room.key; renderParty(); }, room.key === "upstairs" ? "choice move" : "choice"));
    }
    o.appendChild(button("Stay where you are", renderParty, "choice subtle"));
    w.appendChild(o); screen().appendChild(w);
  }
  function partyAfter() {
    if (!state.partyRun) return advancePhase();
    state.partyRun.rounds -= 1;
    if (state.partyRun.rounds <= 0) { state.partyRun = null; renderResult({ title: "The party winds down", lines: ["You spill out into the cold, ears ringing, the night already turning into a story."], tone: "neutral", then: advancePhase }); }
    else renderParty();
  }
  function endParty() { state.partyRun = null; renderResult({ title: "You head out", lines: ["You leave while it's still good. Smart."], tone: "neutral", then: advancePhase }); }
  function partyDrink() {
    const pr = state.partyRun; pr.drinks += 1;
    if (pr.drinks >= T.overDrinkAt) { state.buffs.push({ stat: "intelligence", amount: -3, phasesLeft: 1 }, { stat: "charisma", amount: -2, phasesLeft: 1 }); renderResult({ title: "One too many", lines: ["The room tilts pleasantly, then less pleasantly. That was a mistake.", "INT and CHA down for a bit."], tone: "bad", then: partyAfter }); }
    else { state.buffs.push({ stat: "charisma", amount: 3, phasesLeft: 1 }, { stat: "style", amount: 2, phasesLeft: 1 }); renderResult({ title: "Another round", lines: ["Warmer, looser, braver. CHA/STY up briefly."], tone: "good", then: partyAfter }); }
  }
  function partyBuyHer(id) {
    const c = D.CHARACTERS[id];
    adjustBar(id, "libido", T.partyDrinkLibido); adjustBar(id, "romance", 4); adjustBar(id, "affection", 2);
    const vLine = voiceFor(id, "party.drinkBring");
    renderResult({ title: `${c.name} clinks your glass`, lines: [vLine || `"You read my mind." She drinks, watching you over the rim.`, `Libido +${T.partyDrinkLibido} · Romance +4 · Affection +2`], tone: "good", then: partyAfter });
  }
  function renderDanceModes(id) {
    renderHud(); clearScreen();
    const c = D.CHARACTERS[id], fi = flowIndex(), rc = recept(id), w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `Dance with ${c.name}`));
    w.appendChild(el("p", "char-line", `She steps into the space, eyebrow up. "Well? Show me."`));
    const cl = clothLine(id, c.name);
    if (cl) w.appendChild(el("p", "char-line dim", cl));
    const o = el("div", "choices");
    let handsyOpen = false;
    for (const mode of D.PARTY.dance) {
      const locked = fi < mode.gateFlow || rc < mode.gateRecept;
      if (mode.id === "handsy" && !locked) handsyOpen = true;
      if (locked) o.appendChild(button(`${mode.label} — ${mode.gateFlow > fi ? "not that kind of party yet" : "she's not there with you yet"}`, null, "choice", true));
      else o.appendChild(button(`${mode.label} — ${mode.desc}`, () => partyDance(id, mode), mode.id === "handsy" ? "choice move" : "choice"));
    }
    if (handsyOpen && stripLvl("you") >= 3 && stripLvl(id) >= 3)
      o.appendChild(button(`🔥 …nothing left in the way — go all the way, right here`, () => renderFloorSex(id), "choice move"));
    o.appendChild(button("Back", renderParty, "choice subtle"));
    w.appendChild(o); screen().appendChild(w);
  }
  function partyDance(id, mode) {
    const c = D.CHARACTERS[id];
    const vWin = voiceFor(id, `party.danceLine.${mode.id}`);
    const vFail = voiceFor(id, "party.danceFailLine");
    if (!mode.risk) {
      adjustBar(id, "romance", mode.rom); adjustBar(id, "libido", mode.lib);
      renderResult({ title: "On the floor", lines: [vWin || `${c.name} matches you, laughing, easy. No stakes, all fun.`, `Romance +${mode.rom}${mode.lib ? ` · Libido +${mode.lib}` : ""}`], tone: "good", then: partyAfter });
      return;
    }
    const roll = d20(), gauge = Math.floor(recept(id) / 6) + Math.floor(barVal(id, "libido") / 12);
    const total = roll + gauge + T.partyVibe, ok = roll !== 1 && (roll === 20 || total >= 13);
    if (ok) {
      adjustBar(id, "romance", mode.rom); adjustBar(id, "libido", mode.lib); adjustBar(id, "attraction", 2);
      if (mode.id === "handsy") bumpHeat();
      renderResult({ title: mode.id === "handsy" ? "She pulls you closer" : "She's right there with you", roll: { d20: roll, stat: `read ${gauge}`, vibe: T.partyVibe, vibeNote: "party buzz", total, dc: 13 },
        lines: [vWin || (mode.id === "handsy" ? `${c.name}'s hands find your collar. The room stops mattering.` : `${c.name} moves in close, breath warm, completely unbothered by who's watching.`), `Romance +${mode.rom} · Libido +${mode.lib}`], tone: "good", then: partyAfter });
    } else {
      adjustBar(id, "romance", T.danceFail.romance); adjustBar(id, "affection", T.danceFail.affection);
      renderResult({ title: "She steps back", roll: { d20: roll, stat: `read ${gauge}`, vibe: T.partyVibe, vibeNote: "party buzz", total, dc: 13 },
        lines: [vFail || `${c.name} catches your hands and sets them back. "Easy. Not like that, not here."`, `Romance ${T.danceFail.romance} · Affection ${T.danceFail.affection}`], tone: "bad", then: partyAfter });
    }
  }
  function hookupScene(id, mode) {
    const c = D.CHARACTERS[id];
    if (mode === "room") return { ask: D.PARTY.hookup.ask, esc: D.PARTY.hookup.esc, win: D.PARTY.hookup.win, headOut: "Back out into the noise — eventually" };
    return { ask: `You catch ${c.name}'s eye and tilt your head toward the quiet of the hallway. She holds the look a second — then follows. The noise drops behind a door pulled most of the way shut.`, esc: D.PARTY.privateScene.esc, win: D.PARTY.privateScene.win, headOut: "Back to the noise — eventually" };
  }
  function renderHookup(id, mode) {
    const c = D.CHARACTERS[id], sc = hookupScene(id, mode);
    renderHud(); clearScreen();
    const w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `Just the two of you · ${c.name}`));
    w.appendChild(el("p", "char-line", subN(sc.ask, c.name)));
    const o = el("div", "choices");
    sc.esc.forEach((e) => o.appendChild(button(e.label, () => resolveHookup(id, e, sc), "choice")));
    o.appendChild(button("Actually — not here, not now", () => { adjustBar(id, "affection", 1); renderResult({ title: "Pulled back", lines: [`You ease off. ${c.name} exhales, half relieved, and squeezes your hand on the way back in. Affection +1.`], tone: "good", then: partyAfter }); }, "choice subtle"));
    w.appendChild(o); screen().appendChild(w);
  }
  function resolveHookup(id, esc, sc) {
    const c = D.CHARACTERS[id], roll = d20();
    const gauge = Math.floor(recept(id) / 6) + Math.floor(barVal(id, "libido") / 8) + Math.floor(barVal(id, "romance") / 12);
    const dc = 13, total = roll + gauge + esc.mod + T.partyVibe;
    const ok = roll !== 1 && (roll === 20 || total >= dc);
    const rollBox = { d20: roll, stat: `read ${gauge}`, vibe: T.partyVibe, vibeNote: "party heat", total, dc };
    if (ok) {
      adjustBar(id, "romance", T.privateReward.romance); adjustBar(id, "libido", T.privateReward.libido); adjustBar(id, "attraction", T.privateReward.attractionEvent);
      bumpHeat();
      const vLine = esc.label ? voiceFor(id, `party.privateEsc.${esc.label}`) : null;
      renderResult({ title: "She's all the way in", roll: rollBox, lines: [subN(vLine || esc.line, c.name)], tone: "good", then: () => renderPartyProtection(id, sc), thenLabel: "…and then" });
    } else {
      adjustBar(id, "romance", T.privateFail.romance); adjustBar(id, "affection", T.privateFail.affection);
      state.party.guests = state.party.guests.filter((g) => g !== id);
      renderResult({ title: "Misread", roll: rollBox,
        lines: [`${c.name} stops you, gentle but unmistakable. "Hey — no. Not this." She slips back into the noise without looking back, and you don't see her again tonight.`, `Romance ${T.privateFail.romance} · Affection ${T.privateFail.affection}`], tone: "bad", then: partyAfter });
    }
  }
  function partyApplyFx(id, fx) {
    if (!fx) return;
    if (fx.rom) adjustBar(id, "romance", fx.rom);
    if (fx.aff) adjustBar(id, "affection", fx.aff);
    if (fx.lib) adjustBar(id, "libido", fx.lib);
    if (fx.atr) adjustBar(id, "attraction", fx.atr);
    if (fx.kiss && !state.milestones[id].kiss) { state.milestones[id].kiss = true; adjustBar(id, "attraction", 3); }
  }
  function renderPartyProtection(id, sc, protKey) {
    protKey = protKey || "party";
    const c = D.CHARACTERS[id], P = D.INTIMACY[protKey] || D.INTIMACY.party;
    const bk = (P.beats || P.close) ? protKey : null;
    const after = () => privateAfter(id, sc);
    renderHud(); clearScreen();
    const w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `Just the two of you · ${c.name}`));
    w.appendChild(el("p", "char-line", subN(P.ask, c.name)));
    const have = (state.inventory.condom || 0) > 0;
    const o = el("div", "choices");
    o.appendChild(button(have ? `Use a condom  (have ${state.inventory.condom})` : "Use a condom — none in your bag", have ? () => { state.inventory.condom -= 1; partyApplyFx(id, P.condom.fx); renderIntimacy(id, P.condom.lines, after, false, bk); } : null, "choice", !have));
    o.appendChild(button("Go without — read the moment", () => { partyApplyFx(id, P.raw.fx); renderIntimacy(id, P.raw.lines, after, true, bk); }, "choice move"));
    o.appendChild(button("Slow it back down — just this", () => { partyApplyFx(id, P.back.fx); renderResult({ title: "Just this, then", lines: P.back.lines.map((l) => subN(l, c.name)), tone: "good", then: partyAfter, thenLabel: "Back" }); }, "choice subtle"));
    w.appendChild(o); screen().appendChild(w);
  }
  function privateAfter(id, sc) {
    const c = D.CHARACTERS[id];
    renderResult({ title: (sc && sc.headOut) || "Back to the noise — eventually", lines: [`You drift back in separately, like that fools anyone. ${c.name} catches your eye across the room once and very deliberately looks away.`], tone: "good", then: partyAfter });
  }
  function renderFloorSex(id) {
    const c = D.CHARACTERS[id], FS = D.PARTY.floorSex;
    const sc = { win: FS.win, headOut: FS.headOut };
    const vAsk = voiceFor(id, "party.floorAsk");
    const vWin = voiceFor(id, "party.floorWin");
    renderHud(); clearScreen();
    const w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `On the floor · ${c.name}`));
    w.appendChild(el("p", "char-line", subN(vAsk || FS.ask, c.name)));
    const o = el("div", "choices");
    o.appendChild(button("Yes — right here, right now", () => {
      adjustBar(id, "romance", T.privateReward.romance); adjustBar(id, "libido", T.privateReward.libido + 4); adjustBar(id, "attraction", T.privateReward.attractionEvent); bumpHeat(2);
      renderResult({ title: "Nobody's looking anyway", lines: (Array.isArray(vWin) ? vWin : FS.win).map((l) => subN(l, c.name)), tone: "good", then: () => renderPartyProtection(id, sc, "floor"), thenLabel: "…and then" });
    }, "choice move"));
    o.appendChild(button("Pull her somewhere with a door first", () => renderHookup(id, "room"), "choice"));
    o.appendChild(button("Not in front of everyone — back off", () => { adjustBar(id, "affection", 1); renderResult({ title: "Pulled back", lines: [`You laugh it off and find your clothes; ${c.name} does too, unbothered, already plotting. Affection +1.`], tone: "good", then: partyAfter }); }, "choice subtle"));
    w.appendChild(o); screen().appendChild(w);
  }
  function renderBodyShot(id) {
    const c = D.CHARACTERS[id], B = D.PARTY.bodyShot;
    const vAsk = voiceFor(id, "party.bodyShot.ask");
    renderHud(); clearScreen();
    const w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `🍋 Body shots · ${c.name}`));
    w.appendChild(el("p", "char-line", subN(vAsk || B.ask, c.name)));
    const o = el("div", "choices");
    o.appendChild(button("You take it off her", () => resolveBodyShot(id, "her"), "choice move"));
    o.appendChild(button("Let her take it off you", () => resolveBodyShot(id, "you"), "choice move"));
    o.appendChild(button("Wave it off, just watch", () => { adjustBar(id, "romance", 2); renderResult({ title: "Pass", lines: [`You pass; ${c.name} raises an eyebrow but lets it go. Romance +2.`], tone: "neutral", then: partyAfter }); }, "choice subtle"));
    w.appendChild(o); screen().appendChild(w);
  }
  function resolveBodyShot(id, who) {
    const c = D.CHARACTERS[id], B = D.PARTY.bodyShot, roll = d20();
    const gauge = Math.floor(recept(id) / 7) + Math.floor(barVal(id, "libido") / 10);
    const total = roll + gauge + T.partyVibe, ok = roll !== 1 && (roll === 20 || total >= B.dc);
    const rollBox = { d20: roll, stat: `read ${gauge}`, vibe: T.partyVibe, vibeNote: "kitchen heat", total, dc: B.dc };
    const vWho = voiceFor(id, who === "you" ? "party.bodyShot.whoYou" : "party.bodyShot.whoHer");
    const vWin = voiceFor(id, "party.bodyShot.win");
    const vLose = voiceFor(id, "party.bodyShot.lose");
    if (ok) {
      adjustBar(id, "romance", B.romance); adjustBar(id, "libido", B.libido); adjustBar(id, "attraction", B.attractionEvent);
      if (!state.milestones[id].kiss) state.milestones[id].kiss = true;
      bumpHeat();
      renderResult({ title: "The kitchen loses it", roll: rollBox, lines: [subN(vWho || B.who[who], c.name), subN(vWin || B.win, c.name), `Romance +${B.romance} · Libido +${B.libido}`], tone: "good", then: partyAfter });
    } else {
      adjustBar(id, "romance", 1); adjustBar(id, "affection", 1);
      renderResult({ title: "A mess, the fun kind", roll: rollBox, lines: [subN(vWho || B.who[who], c.name), subN(vLose || B.lose, c.name), "Romance +1 · Affection +1"], tone: "neutral", then: partyAfter });
    }
  }
  function renderNpc(id) {
    const c = D.CHARACTERS[id], npc = one(D.PARTY.npcs);
    const vPool = voiceFor(id, "party.npcBeats");
    const pool = Array.isArray(vPool) && vPool.length ? vPool : D.PARTY.npcBeats;
    const beat = one(pool).replace(/\{n\}/g, c.name).replace(/\{g\}/g, npc);
    const F = T.npcFlirt, rc = recept(id);
    renderHud(); clearScreen();
    const w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `Across the room · ${c.name}`));
    w.appendChild(el("p", "char-line", beat));
    const o = el("div", "choices");
    o.appendChild(button("Walk over, hand at the small of her back", () => {
      if (rc >= 35) { adjustBar(id, "romance", F.cutIn.romance); adjustBar(id, "libido", F.cutIn.libido); bumpHeat();
        renderResult({ title: "Claimed", lines: [`You slide in beside her like you belong there; ${c.name} leans into the hand without breaking her sentence, and ${npc} reads the room and evaporates. Romance +${F.cutIn.romance} · Libido +${F.cutIn.libido}.`], tone: "good", then: partyAfter }); }
      else { adjustBar(id, "romance", F.sulk.romance); adjustBar(id, "affection", F.sulk.affection);
        renderResult({ title: "She had it handled", lines: [`She steps out from under your hand with a flat look. "I was fine." ${npc} smirks. You overplayed it. Romance ${F.sulk.romance} · Affection ${F.sulk.affection}.`], tone: "bad", then: partyAfter }); }
    }, "choice move"));
    o.appendChild(button("Catch her eye, let her come to you", () => { adjustBar(id, "romance", F.stayCool.romance); adjustBar(id, "attraction", F.stayCool.attractionEvent);
      renderResult({ title: "She extracts herself", lines: [`You hold the look and don't move. Thirty seconds later ${c.name} has peeled off ${npc} entirely and crossed the room to you, unhurried, point made. Romance +${F.stayCool.romance} · Attraction +${F.stayCool.attractionEvent}.`], tone: "good", then: partyAfter }); }, "choice"));
    o.appendChild(button("Give them space — trust her", () => { adjustBar(id, "affection", F.letHer.affection); adjustBar(id, "romance", F.letHer.romance);
      renderResult({ title: "Trust", lines: [`You leave it alone. She finds you twenty minutes later. "Thanks for not being weird about that." She means it — but a little of the night went somewhere you weren't. Affection +${F.letHer.affection} · Romance ${F.letHer.romance}.`], tone: "neutral", then: partyAfter }); }, "choice"));
    o.appendChild(button("Stew about it from across the room", () => { adjustBar(id, "romance", F.sulk.romance); adjustBar(id, "affection", F.sulk.affection);
      renderResult({ title: "Bad look", lines: [`You watch, jaw tight, and she clocks it from across the room — which is worse than ${npc} ever was. Romance ${F.sulk.romance} · Affection ${F.sulk.affection}.`], tone: "bad", then: partyAfter }); }, "choice subtle"));
    w.appendChild(o); screen().appendChild(w);
  }

  // ----- party games (random, multi-round, everyone narrated) -----
  function startRandomGame() {
    const g = one(D.PARTY.games);
    state.pg = { game: g, round: 0, partner: null, made: 0, opp: 0 };
    nextGameRound();
  }
  function partyTier(id) {
    const fi = flowIndex();
    if (fi < spicyAt()) return "plain";
    if (fi < 2) return "spicy";
    const hot = (state.partyRun && state.partyRun.drinks >= 2) || (id && (composite(id) >= 50 || barVal(id, "libido") >= 60));
    return hot ? "scorch" : "spicy";
  }
  function tierPool(tier, plain, spicy, scorch) {
    return tier === "scorch" ? scorch : tier === "spicy" ? spicy : plain;
  }
  function guestNarration(spicyOK) {
    const guests = partyGuests();
    return guests.map((id) => {
      const c = D.CHARACTERS[id];
      let tier = spicyOK ? partyTier(id) : "plain";
      if (tier !== "plain" && Math.random() < 0.4) tier = "plain"; // keep variety
      const vKey = tier === "scorch" ? "scorchingGuestBeats" : tier === "spicy" ? "spicyGuestBeats" : "guestBeats";
      const vPool = voiceFor(id, `party.${vKey}`);
      const pool = Array.isArray(vPool) && vPool.length ? vPool
                  : tierPool(tier, D.PARTY.guestBeats, D.PARTY.spicyGuestBeats, D.PARTY.scorchingGuestBeats);
      return one(pool).replace(/\{n\}/g, c.name);
    });
  }
  function nextGameRound() {
    const pg = state.pg;
    if (pg.round >= gameLen()) { renderResult({ title: "Game over", lines: ["The circle breaks up, someone refills cups, the night rolls on."], tone: "neutral", then: partyAfter }); return; }
    pg.round += 1;
    if (pg.game === "truthdare") return roundTruthDare();
    if (pg.game === "spin") return roundSpin();
    return roundPong();
  }
  function gameShell(head, narrLines, prompt, buttons) {
    renderHud(); clearScreen();
    const w = el("div", "talk");
    w.appendChild(el("div", "talk-head", head));
    for (const l of narrLines) w.appendChild(el("p", "result-line", l));
    if (prompt) w.appendChild(el("p", "char-line", prompt));
    const o = el("div", "choices");
    for (const [label, fn, cls] of buttons) o.appendChild(button(label, fn, cls || "choice"));
    w.appendChild(o); screen().appendChild(w);
  }
  function roundTruthDare() {
    const pg = state.pg, fi = flowIndex(), spicyOK = fi >= spicyAt();
    const guests = partyGuests();
    const upYou = Math.random() < 0.5 || !guests.length;
    const narr = guestNarration(spicyOK);
    if (upYou) {
      const tier = spicyOK ? partyTier(null) : "plain";
      const tdButtons = [["Truth", () => tdYou("truth", tier)], ["Dare (on you)", () => tdYou("dare", tier)]];
      if (guests.length) tdButtons.push(["Hand out a dare — your call", () => renderMakeDare(tier)]);
      gameShell(`🎲 Truth or Dare · round ${pg.round}/${gameLen()}`, narr, tier === "scorch" ? "The bottle stops on you. The circle goes feral." : "The bottle stops on you. The circle leans in.", tdButtons);
    } else {
      const who = one(guests), c = D.CHARACTERS[who];
      const tier = spicyOK ? partyTier(who) : "plain";
      const others = narr.filter((l) => l.indexOf(c.name) !== 0);
      if (tier !== "plain" && Math.random() < 0.34) return roundGuestStrip(who, tier, others);
      const vKey = tier === "scorch" ? "scorchingGuestBeats" : tier === "spicy" ? "spicyGuestBeats" : "guestBeats";
      const vPool = voiceFor(who, `party.${vKey}`);
      const pool = Array.isArray(vPool) && vPool.length ? vPool
                  : tierPool(tier, D.PARTY.guestBeats, D.PARTY.spicyGuestBeats, D.PARTY.scorchingGuestBeats);
      const beat = one(pool).replace(/\{n\}/g, c.name);
      const big = tier === "scorch";
      gameShell(`🎲 Truth or Dare · round ${pg.round}/${gameLen()}`, others, `${beat}${tier !== "plain" ? " She catches your eye doing it." : ""}  ·  What do you do?`, [
        ["Cheer her on, loudest in the room", () => { adjustBar(who, "romance", big ? 7 : tier === "spicy" ? 5 : 3); adjustBar(who, "libido", big ? 7 : tier === "spicy" ? 4 : 1); afterGameRound(`You're the loudest one clapping. ${c.name} plays the whole bit straight to you and makes very sure you know it. Romance +${big ? 7 : tier === "spicy" ? 5 : 3}${tier !== "plain" ? ` · Libido +${big ? 7 : 4}` : ""}.`); }],
        ["Stay unreadable", () => { adjustBar(who, "romance", 1); afterGameRound(`You give her absolutely nothing. ${c.name} pushes the bit twice as hard just to crack your face — and clocks, annoyed, that it didn't work. Romance +1.`); }],
      ]);
    }
  }
  function tdYou(kind, tier) {
    const guests = partyGuests(), focus = guests.length ? one(guests) : null;
    const pool = kind === "truth"
      ? tierPool(tier, D.PARTY.truths, D.PARTY.spicyTruths, D.PARTY.scorchingTruths)
      : tierPool(tier, D.PARTY.dares, D.PARTY.spicyDares, D.PARTY.scorchingDares);
    const prompt = one(pool);
    let buttons;
    if (kind === "truth")
      buttons = [["Answer honestly", () => tdYouResolve(focus, "sincere", true)], ["Spin it into a joke", () => tdYouResolve(focus, "playful", false)], ["Dodge it", () => tdYouResolve(focus, "independent", false)]];
    else {
      const doIt = tier !== "plain" && guests.length
        ? ["Do the dare for real — pick the target", () => renderDareFollow(tier)]
        : ["Do the dare for real", () => tdYouResolve(focus, "adventurous", true)];
      buttons = [doIt, ["Tame version — half-do it", () => tdYouResolve(focus, "classy", false)], ["Chicken out", () => tdYouResolve(focus, "__chk", false)]];
      if (tier !== "plain" && guests.length) {
        buttons.unshift([`👕 Make it a strip dare — lose a layer`, () => playerStrip(tier)]);
        buttons.unshift([`💋 ${D.PARTY.kissDare}`, renderPartyKissPick]);
      }
    }
    gameShell(`🎲 Your ${kind}${tier === "scorch" ? " (no mercy)" : ""}`, [], `The dare: "${prompt}"`, buttons);
  }
  function renderMakeDare(tier) {
    const guests = partyGuests();
    gameShell("🎯 Your dare to give — who's it on?", [], "The bottle's yours; the dare is too. Who are you putting on the spot?",
      guests.map((id) => [`${D.CHARACTERS[id].emoji} ${D.CHARACTERS[id].name}`, () => renderMakeDarePick(id, tier)])
        .concat([["Never mind — pass it on", () => afterGameRound("You wave it off and let someone else take the turn. The circle groans.", "neutral")]]));
  }
  function renderMakeDarePick(id, tier) {
    const c = D.CHARACTERS[id], MD = D.PARTY.makeDares;
    const pool = (MD.plain || []).slice();
    if (tier !== "plain") pool.push(...(MD.spicy || []));
    if (tier === "scorch") pool.push(...(MD.scorch || []));
    const picks = pickN(pool, Math.min(4, pool.length));
    gameShell(`🎯 Dare ${c.name} to —`, [], `She folds her arms, already half-grinning. "Go on then. Try me."`,
      picks.map((d) => [`"${c.name}, ${d}."`, () => resolveMadeDare(id, d, tier)])
        .concat([["Back", () => renderMakeDare(tier)]]));
  }
  function resolveMadeDare(id, dareText, tier) {
    const c = D.CHARACTERS[id], big = tier === "scorch";
    const roll = d20(), gauge = Math.floor(composite(id) / 8) + Math.floor(barVal(id, "libido") / 9);
    const dc = big ? 14 : 12, ok = roll !== 1 && (roll === 20 || roll + gauge + T.partyVibe >= dc);
    const box = { d20: roll, stat: `read ${gauge}`, vibe: T.partyVibe, vibeNote: "your dare", total: roll + gauge + T.partyVibe, dc };
    if (ok) {
      const rm = big ? 13 : 9, lb = big ? 12 : 7;
      adjustBar(id, "romance", rm); adjustBar(id, "libido", lb); adjustBar(id, "attraction", big ? 3 : 1); bumpHeat();
      if (/cloth|layer/i.test(dareText)) stripAdd(id);
      afterGameRound(`"${c.name}, ${dareText}." She holds your eyes the whole time she does it — no flinch, all the way, played straight back at you. The circle detonates. Romance +${rm} · Libido +${lb}.`, "good", box);
    } else {
      adjustBar(id, "romance", -3); adjustBar(id, "affection", -3);
      afterGameRound(`"${c.name}, ${dareText}." She tips her head, considers it, and says "…nah" with a smile that costs you anyway. The circle "oooh"s; she sips her drink. Romance −3 · Affection −3.`, "bad", box);
    }
  }
  function renderDareFollow(tier) {
    const guests = partyGuests();
    gameShell(`🔥 Your dare — your call`, [], "Whole circle's watching. Who's it on?",
      guests.map((id) => [`${D.CHARACTERS[id].emoji} ${D.CHARACTERS[id].name}`, () => resolveDareTarget(id, tier)])
        .concat([["Bottle it (forfeit)", () => afterGameRound("You stall and the circle boos you into next round. (Forfeit.)", "neutral")]]));
  }
  function resolveDareTarget(id, tier) {
    const c = D.CHARACTERS[id], big = tier === "scorch";
    const roll = d20(), gauge = Math.floor(composite(id) / 8) + Math.floor(barVal(id, "libido") / 9);
    const ok = roll !== 1 && (roll === 20 || roll + gauge + T.partyVibe >= (big ? 14 : 12));
    if (ok) {
      const rm = big ? 14 : 9, lb = big ? 12 : 7;
      adjustBar(id, "romance", rm); adjustBar(id, "libido", lb); adjustBar(id, "attraction", big ? 3 : 1); bumpHeat();
      afterGameRound(`${c.name} doesn't flinch — she leans all the way into it and plays it back at you twice as hard. The circle absolutely loses it. Romance +${rm} · Libido +${lb}.`, "good", { d20: roll, stat: `read ${gauge}`, vibe: T.partyVibe, vibeNote: "party heat", total: roll + gauge + T.partyVibe, dc: big ? 14 : 12 });
    } else {
      adjustBar(id, "romance", -4); adjustBar(id, "affection", -3);
      afterGameRound(`${c.name} calls your bluff with a flat "…no," and the circle's "ooooh" curdles into a wince. Romance −4 · Affection −3.`, "bad", { d20: roll, stat: `read ${gauge}`, vibe: T.partyVibe, vibeNote: "party heat", total: roll + gauge + T.partyVibe, dc: big ? 14 : 12 });
    }
  }
  function renderPartyKissPick() {
    const guests = partyGuests();
    gameShell("💋 Your dare — your call", [], "The whole circle's watching, counting down. Who do you kiss?",
      guests.map((id) => [`${D.CHARACTERS[id].emoji} Kiss ${D.CHARACTERS[id].name}`, () => spinKiss(id)])
        .concat([["Can't choose — forfeit", () => afterGameRound("You stall too long and the moment dies; the circle boos you into the next round. (Forfeit.)", "neutral")]]));
  }
  function stripRoll(id, dc) {
    const roll = d20(), gauge = Math.floor(composite(id) / 8) + Math.floor(barVal(id, "libido") / 9);
    const total = roll + gauge + T.partyVibe;
    return { ok: roll !== 1 && (roll === 20 || total >= dc), box: { d20: roll, stat: `read ${gauge}`, vibe: T.partyVibe, vibeNote: "the room", total, dc } };
  }
  function playerStrip(tier) {
    const guests = partyGuests(), focus = guests.length ? one(guests) : null, c = focus ? D.CHARACTERS[focus] : null;
    stripAdd("you"); bumpHeat();
    const roll = d20(), good = roll !== 1 && (roll === 20 || roll + effStat("charisma") + T.partyVibe >= 12);
    const box = { d20: roll, stat: `CHA ${effStat("charisma")}`, vibe: T.partyVibe, vibeNote: "the circle", total: roll + effStat("charisma") + T.partyVibe, dc: 12 };
    if (focus) { adjustBar(focus, "romance", good ? T.stripDare.romance : 3); adjustBar(focus, "libido", good ? T.stripDare.libido : 3); if (good) adjustBar(focus, "attraction", 2); }
    const base = subN(good ? D.PARTY.strip.you.ok : D.PARTY.strip.you.shy, c ? c.name : "she");
    afterGameRound(base + (focus ? ` Romance +${good ? T.stripDare.romance : 3} · Libido +${good ? T.stripDare.libido : 3}.` : ""), good ? "good" : "neutral", box);
  }
  function roundGuestStrip(who, tier, others) {
    const pg = state.pg, c = D.CHARACTERS[who], big = tier === "scorch";
    gameShell(`🎲 Truth or Dare · round ${pg.round}/${gameLen()}`, others,
      `${c.name} draws the strip dare — circle's choice, one layer. "${one(D.PARTY.stripDares)}"  ·  What do you do?`, [
      ["Watch like it's nothing", () => {
        const r = stripRoll(who, big ? 14 : 12);
        if (r.ok) { adjustBar(who, "romance", T.stripDare.romance); adjustBar(who, "libido", T.stripDare.libido); adjustBar(who, "attraction", 2); stripAdd(who); bumpHeat();
          afterGameRound(subN(D.PARTY.strip.her.win, c.name) + ` Romance +${T.stripDare.romance} · Libido +${T.stripDare.libido}.`, "good", r.box); }
        else afterGameRound(subN(D.PARTY.strip.her.lose, c.name), "neutral", r.box);
      }],
      ["Hoot with the circle", () => { adjustBar(who, "romance", T.stripFail.romance); adjustBar(who, "affection", T.stripFail.affection); afterGameRound(`You join the catcalling and ${c.name} clocks it, mid-dare, and it costs you. Romance ${T.stripFail.romance} · Affection ${T.stripFail.affection}.`, "bad"); }],
    ]);
  }
  function spinStrip(id) {
    const c = D.CHARACTERS[id], r = stripRoll(id, 13);
    if (r.ok) { adjustBar(id, "romance", T.stripDare.romance); adjustBar(id, "libido", T.stripDare.libido); adjustBar(id, "attraction", 2); stripAdd(id); bumpHeat();
      afterGameRound(subN(D.PARTY.strip.her.win, c.name) + ` Romance +${T.stripDare.romance} · Libido +${T.stripDare.libido}.`, "good", r.box); }
    else afterGameRound(subN(D.PARTY.strip.her.lose, c.name), "neutral", r.box);
  }
  function tdYouResolve(focusId, trait, bold) {
    if (!focusId) { afterGameRound("You answer to the room in general. Mild chaos, no casualties."); return; }
    const c = D.CHARACTERS[focusId];
    let rd, af = 0, txt;
    if (trait === "__chk") { rd = -4; txt = `${c.name}: "Boo. Weak." Romance ${rd}.`; }
    else {
      const aff0 = c.traitAffinity[trait] || 0, roll = d20(), good = roll + (bold ? effStat("charisma") : 0) + T.partyVibe >= 12;
      rd = (good ? 6 : 2) + aff0 * 2; af = good ? 3 : 1;
      txt = `${aff0 > 0 ? `${c.name} clearly liked that.` : aff0 < 0 ? `${c.name} wasn't impressed.` : `${c.name} smirks.`} Romance ${rd >= 0 ? "+" : ""}${rd}${af ? ` · Affection +${af}` : ""}.`;
    }
    adjustBar(focusId, "romance", rd); if (af) adjustBar(focusId, "affection", af);
    afterGameRound(txt);
  }
  function roundSpin() {
    const pg = state.pg, guests = partyGuests(), fiNow = flowIndex(), narr = guestNarration(fiNow >= spicyAt());
    const circle = guests.slice(); const youIn = Math.random() < 0.6;
    const target = one(circle);
    if (youIn && target) {
      const c = D.CHARACTERS[target], fi = flowIndex();
      const buttons = [["Lean in for it", () => spinKiss(target)], ["Peck on the cheek", () => { adjustBar(target, "romance", 4); afterGameRound(`A peck. ${c.name} grins. Safe. Romance +4.`); }], ["Laugh it off", () => { adjustBar(target, "affection", 2); afterGameRound(`You ham it up; ${c.name} cracks up. Affection +2.`); }]];
      if (fi >= spicyAt()) buttons.splice(1, 0, [`👕 Make it a dare — she loses a layer`, () => spinStrip(target)]);
      gameShell(`🍾 Spin the Bottle · round ${pg.round}/${gameLen()}`, narr, `It slows… and points at ${c.name}.${fi >= spicyAt() ? " The room goes \"ooooh.\"" : ""}`, buttons);
    } else {
      const a = one(circle), b = one(circle.filter((x) => x !== a) || circle);
      const an = D.CHARACTERS[a].name, bn = b ? D.CHARACTERS[b].name : "the snack table";
      if (b) { adjustBar(a, "romance", 1); }
      gameShell(`🍾 Spin the Bottle · round ${pg.round}/${gameLen()}`, narr.concat([`The bottle picks ${an} and ${bn}. The circle howls; you're just a spectator this round.`]), null, [["Watch it play out", () => afterGameRound(`${an} and ${bn} sort it out, to much applause.`)]]);
    }
  }
  function spinKiss(id) {
    const c = D.CHARACTERS[id], roll = d20();
    const r = Math.floor(composite(id) / 8) + Math.floor(barVal(id, "romance") / 8);
    const ok = roll !== 1 && (roll === 20 || roll + r + T.partyVibe >= 14);
    if (ok) {
      adjustBar(id, "romance", 12); adjustBar(id, "libido", 6); bumpHeat();
      if (!state.milestones[id].kiss) { state.milestones[id].kiss = true; adjustBar(id, "attraction", 4); }
      afterGameRound(`${c.name} kisses you back like she means it. The room loses its mind. Romance +12 · Libido +6.`, "good", { d20: roll, stat: `read ${r}`, vibe: T.partyVibe, vibeNote: "party buzz", total: roll + r + T.partyVibe, dc: 14 });
    } else {
      adjustBar(id, "romance", -6); adjustBar(id, "affection", -4);
      afterGameRound(`${c.name} turns her head at the last second. Awkward laughter. Romance −6 · Affection −4.`, "bad", { d20: roll, stat: `read ${r}`, vibe: T.partyVibe, vibeNote: "party buzz", total: roll + r + T.partyVibe, dc: 14 });
    }
  }
  function roundPong() {
    const pg = state.pg, guests = partyGuests();
    if (!pg.partner) {
      gameShell(`🏓 Beer Pong · pick a partner`, guestNarration(false), "Two cups left on your side. Who's with you?",
        guests.map((id) => [`${D.CHARACTERS[id].emoji} ${D.CHARACTERS[id].name}`, () => { pg.partner = id; throwPong(); }]).concat([["Just play solo", () => { pg.partner = guests[0] || null; throwPong(); }]]));
      return;
    }
    throwPong();
  }
  function throwPong() {
    const pg = state.pg, c = D.CHARACTERS[pg.partner];
    gameShell(`🏓 Beer Pong w/ ${c ? c.name : "the table"} · cup ${pg.round}/${gameLen()}`, guestNarration(false), `You: ${pg.made} · Them: ${pg.opp}. Your shot:`, [
      ["Careful aim (INT)", () => pongShot("int")], ["Trick shot (STY, swingy)", () => pongShot("sty")], [c ? `Hand it to ${c.name}` : "Let it ride", () => pongShot("her")],
    ]);
  }
  function pongShot(kind) {
    const pg = state.pg, c = D.CHARACTERS[pg.partner];
    let hit;
    if (kind === "int") hit = d20() + effStat("intelligence") >= 14;
    else if (kind === "sty") hit = d20() + effStat("style") >= (Math.random() < 0.5 ? 10 : 20);
    else hit = Math.random() < 0.55;
    if (hit) pg.made++; if (Math.random() < 0.45) pg.opp++;
    if (pg.round < gameLen()) { afterGameRound(hit ? `Splash. ${c ? c.name + " whoops and high-fives you." : "Nice."}` : `Rimmed out. ${c ? c.name + ": \"Next one.\"" : ""}`, hit ? "good" : "neutral"); return; }
    const won = pg.made >= pg.opp, rd = won ? 9 : 2, af = won ? 4 : 1;
    if (pg.partner) { adjustBar(pg.partner, "romance", rd); adjustBar(pg.partner, "affection", af); if (won) adjustBar(pg.partner, "attraction", 2); }
    afterGameRound(won ? `You take it. ${c ? c.name + " jumps on you, the table roaring." : "Winners."} Romance +${rd} · Affection +${af}.` : `Beaten this round. ${c ? c.name + ": \"Rematch. You owe me.\"" : ""} Romance +${rd}.`, won ? "good" : "neutral");
  }
  function afterGameRound(line, tone, roll) {
    renderResult({ title: `Round ${state.pg.round}`, roll: roll || null, lines: [line], tone: tone || "good", then: nextGameRound, thenLabel: state.pg.round >= gameLen() ? "Wrap up" : "Next round" });
  }

  function renderResult(p) {
    saveGame(); renderHud(); clearScreen();
    const w = el("div", `result tone-${p.tone}`);
    w.appendChild(el("h2", null, p.title));
    if (p.roll) {
      const r = p.roll, box = el("div", "rollbox");
      const sign = !r.vibe ? "" : r.vibe > 0 ? `+ ${r.vibe}` : `− ${Math.abs(r.vibe)}`;
      box.appendChild(el("div", "roll-line", `🎲 d20 ${r.d20}  +  ${r.stat}  ${sign ? sign + ` (${r.vibeNote})  ` : ""}${r.extra ? r.extra + "  " : ""}=  ${r.total}`));
      box.appendChild(el("div", "roll-line dim", `vs  DC ${r.dc}`));
      w.appendChild(box);
    }
    for (const ln of p.lines) w.appendChild(el("p", "result-line", ln));
    w.appendChild(button(p.thenLabel || "Continue", p.then || advancePhase, "primary"));
    screen().appendChild(w);
  }

  function saveGame() { try { if (state) localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {} }
  function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
  function loadGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY); if (!raw) return false;
      const p = JSON.parse(raw); if (!p || !p.bgPicks) return false;
      // Every category pick must resolve under the current data.
      for (const cat of D.BG_CATEGORIES) {
        const pickId = p.bgPicks[cat.id];
        if (!pickId || !cat.opts.some((o) => o.id === pickId)) return false;
      }
      const base = freshState(p.bgPicks);
      state = Object.assign(base, p);
      state.bgPicks = Object.assign({}, p.bgPicks);
      state.stats = Object.assign({}, base.stats, p.stats);
      state.bars = {}; for (const id of CHAR_IDS) state.bars[id] = Object.assign(freshBars(id), p.bars && p.bars[id]);
      state.metCount = Object.assign(perChar(() => 0), p.metCount);
      state.learned = Object.assign(perChar(() => []), p.learned);
      state.milestones = Object.assign(perChar(() => ({ number: false, kiss: false, sex: false, secondSex: false, dates: 0 })), p.milestones || {});
      // Per-char milestones may be partial from older saves — top up missing keys.
      for (const id of CHAR_IDS) {
        state.milestones[id] = Object.assign({ number: false, kiss: false, sex: false, secondSex: false, dates: 0 }, state.milestones[id] || {});
      }
      state.flags = (p.flags && typeof p.flags === "object") ? p.flags : {};
      state.preg = Object.assign(perChar(() => null), p.preg || {});
      state.inventory = p.inventory || {};
      state.buffs = Array.isArray(p.buffs) ? p.buffs : [];
      state.textedToday = Object.assign(perChar(() => false), p.textedToday);
      state.owned = Object.assign({ house: "studio", car: "none" }, p.owned || {});
      if (!D.HOUSES[state.owned.house]) state.owned.house = "studio";
      if (!D.CARS[state.owned.car]) state.owned.car = "none";
      state.job = D.JOBS[p.job] ? p.job : "freelance";
      state.lastRollover = null;
      state.convo = null; state.date = null; state.pg = null; state.partyRun = null;
      return true;
    } catch (e) { return false; }
  }
  function flash(id, t) { const b = document.getElementById(id); const o = b.textContent; b.textContent = t; setTimeout(() => (b.textContent = o), 1100); }
  function init() {
    document.getElementById("save-btn").addEventListener("click", () => { saveGame(); flash("save-btn", "Saved ✓"); });
    document.getElementById("load-btn").addEventListener("click", () => { if (loadGame()) { renderPhase(); flash("load-btn", "Loaded ✓"); } else flash("load-btn", "No save"); });
    document.getElementById("reset-btn").addEventListener("click", () => { if (!window.confirm("Start over? This clears your save.")) return; try { localStorage.removeItem(SAVE_KEY); } catch (e) {} renderTitle(); });
    renderTitle();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
