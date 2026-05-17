(function () {
  const D = window.GAMEDATA;
  const T = D.TUNING;
  const SAVE_KEY = "lifeSimSave_v3";
  const CHAR_IDS = Object.keys(D.CHARACTERS);
  let state = null;

  // ---------- state ----------
  const perChar = (mk) => { const o = {}; for (const id of CHAR_IDS) o[id] = mk(); return o; };
  function rollLibido(c) { const [lo, hi] = c.libidoRange; return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function freshBars(id) { return { affection: 0, romance: 0, libidoBase: rollLibido(D.CHARACTERS[id]), libidoTemp: 0, attrEvent: 0 }; }
  function freshState(bgId) {
    const bars = {};
    for (const id of CHAR_IDS) bars[id] = freshBars(id);
    return {
      background: bgId,
      stats: Object.assign({}, D.BACKGROUNDS[bgId].stats),
      day: 1, phaseIndex: 0, money: T.startMoney,
      bars,
      metCount: perChar(() => 0),
      milestones: perChar(() => ({ number: false, kiss: false, dates: 0 })),
      inventory: {}, buffs: [],
      textedToday: perChar(() => false),
      party: null, partyRun: null,
      convo: null, date: null, pg: null,
    };
  }

  // ---------- math ----------
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const phaseName = () => D.PHASES[state.phaseIndex];
  const round1 = (n) => Math.round(n * 10) / 10;
  const d20 = () => 1 + Math.floor(Math.random() * 20);

  function effStat(s) {
    let v = state.stats[s];
    for (const b of state.buffs) if (b.stat === s) v += b.amount;
    return Math.max(0, Math.floor(v));
  }
  function attraction(id) {
    const c = D.CHARACTERS[id];
    let base = 0;
    for (const s of D.STATS) base += (c.attractProfile[s] || 0) * effStat(s);
    base = clamp(Math.round(base * T.attractK), 0, T.attractBaseCap);
    return clamp(base + clamp(state.bars[id].attrEvent, 0, T.attractEventCap), 0, T.barCap);
  }
  function barVal(id, bar) {
    if (bar === "attraction") return attraction(id);
    if (bar === "libido") return clamp(state.bars[id].libidoBase + state.bars[id].libidoTemp, 0, T.barCap);
    return clamp(state.bars[id][bar], 0, T.barCap);
  }
  function adjustBar(id, bar, delta) {
    if (!delta) return;
    if (bar === "attraction") state.bars[id].attrEvent = clamp(state.bars[id].attrEvent + delta, 0, T.attractEventCap);
    else if (bar === "libido") state.bars[id].libidoTemp += delta;
    else state.bars[id][bar] = clamp(state.bars[id][bar] + delta, 0, T.barCap);
  }
  function composite(id) {
    const w = D.CHARACTERS[id].barWeights;
    let s = 0;
    for (const b of D.BARS) s += (w[b] || 0) * barVal(id, b);
    return Math.round(s);
  }
  function stageFor(v) { let s = D.STAGES[0].name; for (const t of D.STAGES) if (v >= t.min) s = t.name; return s; }
  function moodOf(id) { const c = composite(id); return c < 15 ? "cold" : c < 35 ? "neutral" : c < 60 ? "warm" : "hot"; }
  function rollTable(tbl) {
    let r = Math.random(), a = 0;
    for (const s of tbl) { a += s.p; if (r <= a) return s.min === s.max ? s.min : round1(s.min + Math.random() * (s.max - s.min)); }
    const l = tbl[tbl.length - 1];
    return l.min === l.max ? l.min : round1(l.min + Math.random() * (l.max - l.min));
  }

  function isPartyNow() { return state.party && state.party.day === state.day && state.party.phaseIndex === state.phaseIndex; }
  function presentAt(locId) {
    if (isPartyNow()) return locId === "party" ? CHAR_IDS.slice() : [];
    return CHAR_IDS.filter((id) => D.CHARACTERS[id].schedule[phaseName()] === locId);
  }
  function scheduleParty() {
    const ni = D.PHASES.indexOf("Night");
    state.party = state.phaseIndex < ni ? { day: state.day, phaseIndex: ni } : { day: state.day + 1, phaseIndex: ni };
  }
  function maybeParty() {
    if (state.party || state.partyRun) return false;
    if (Math.random() < T.partyInviteChance) { scheduleParty(); return true; }
    return false;
  }
  function advancePhase() {
    state.convo = null; state.date = null; state.pg = null; state.partyRun = null;
    state.buffs = state.buffs.map((b) => ({ ...b, phasesLeft: b.phasesLeft - 1 })).filter((b) => b.phasesLeft > 0);
    state.phaseIndex += 1;
    if (state.phaseIndex >= D.PHASES.length) {
      state.phaseIndex = 0; state.day += 1; state.money += T.dailyAllowance;
      state.textedToday = perChar(() => false);
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

  // ---------- DOM ----------
  const screen = () => document.getElementById("screen");
  function el(t, c, x) { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function button(label, fn, cls, dis) { const b = el("button", cls || "choice", label); if (dis) b.disabled = true; else b.addEventListener("click", fn); return b; }
  const clearScreen = () => (screen().innerHTML = "");
  function pickN(arr, n) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); }
  const one = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const line = (s, n) => s.replace(/\{n\}/g, n);

  // ---------- HUD ----------
  function renderHud() {
    const hud = document.getElementById("hud");
    const playing = !!state;
    hud.classList.toggle("hidden", !playing);
    document.getElementById("toolbar").classList.toggle("hidden", !playing);
    if (!playing) return;
    hud.innerHTML = "";
    const top = el("div", "hud-top");
    top.appendChild(el("span", "hud-time", `Day ${state.day} · ${phaseName()}`));
    const right = el("div", "hud-right");
    right.appendChild(el("span", "money", `$${state.money}`));
    right.appendChild(el("span", "chip", "📱"));
    top.appendChild(right);
    hud.appendChild(top);
    const sc = el("div", "stat-chips");
    for (const s of D.STATS) {
      const e = effStat(s), buffed = e !== Math.floor(state.stats[s]);
      const frac = state.stats[s] - Math.floor(state.stats[s]);
      const chip = el("span", buffed ? "chip buffed" : "chip");
      chip.textContent = `${D.STAT_SHORT[s]} ${e}${frac > 0 ? "·" : ""}`;
      sc.appendChild(chip);
    }
    hud.appendChild(sc);
    if (state.buffs.length) {
      const bw = el("div", "buffs");
      for (const b of state.buffs) bw.appendChild(el("span", "buff", `${D.STAT_SHORT[b.stat]} ${b.amount > 0 ? "+" : ""}${b.amount}·${b.phasesLeft}p`));
      hud.appendChild(bw);
    }
    const people = el("div", "people");
    for (const id of CHAR_IDS) {
      const c = D.CHARACTERS[id], comp = composite(id), m = state.milestones[id];
      const card = el("div", "person");
      const marks = `${m.number ? " ☎" : ""}${m.dates ? ` 💞${m.dates}` : ""}${m.kiss ? " 💋" : ""}`;
      card.appendChild(el("div", "person-name", `${c.emoji} ${c.name}${marks}`));
      card.appendChild(el("div", "person-stage", `${stageFor(comp)} · Interest ${comp}`));
      const bars = el("div", "barset");
      for (const b of D.BARS) {
        const v = barVal(id, b);
        const row = el("div", "barrow");
        row.appendChild(el("span", "barlbl", D.BAR_SHORT[b]));
        const tr = el("div", `bar mini b-${b}`);
        const fl = el("div", "fill"); fl.style.width = `${v}%`; tr.appendChild(fl);
        row.appendChild(tr);
        row.appendChild(el("span", "barnum", String(v)));
        bars.appendChild(row);
      }
      card.appendChild(bars);
      card.appendChild(el("div", state.metCount[id] >= T.revealHintAfter ? "person-hint" : "person-hint dim",
        state.metCount[id] >= T.revealHintAfter ? c.hint : "Talk to her a few times to read her…"));
      people.appendChild(card);
    }
    hud.appendChild(people);
  }

  // ---------- title / create ----------
  function renderTitle() {
    state = null; renderHud(); clearScreen();
    const w = el("div", "title");
    w.appendChild(el("h1", null, "Heartbeat City"));
    w.appendChild(el("p", "subtitle", "A tiny life-sim. Build yourself, read people, and win someone over. No clock, no endings — just the long game."));
    const b = el("div", "title-buttons");
    b.appendChild(button("New Game", renderCreate, "primary"));
    const cont = button("Continue", () => { if (loadGame()) renderPhase(); }, "choice");
    if (!hasSave()) cont.disabled = true;
    b.appendChild(cont); w.appendChild(b); screen().appendChild(w);
  }
  function renderCreate() {
    clearScreen();
    const w = el("div", "create");
    w.appendChild(el("h2", null, "Who are you?"));
    w.appendChild(el("p", "subtitle", "Background sets your start. Five very different people are out there — each reads you differently."));
    const grid = el("div", "bg-grid");
    for (const [id, bg] of Object.entries(D.BACKGROUNDS)) {
      const card = el("div", "bg-card");
      card.appendChild(el("div", "bg-emoji", bg.emoji));
      card.appendChild(el("div", "bg-name", bg.name));
      card.appendChild(el("div", "bg-blurb", bg.blurb));
      const st = el("div", "bg-stats");
      for (const s of D.STATS) st.appendChild(el("span", "chip", `${D.STAT_SHORT[s]} ${bg.stats[s]}`));
      card.appendChild(st);
      card.appendChild(button("Choose", () => { state = freshState(id); saveGame(); renderPhase(); }, "primary"));
      grid.appendChild(card);
    }
    w.appendChild(grid); screen().appendChild(w);
  }

  // ---------- phase ----------
  function renderPhase() {
    saveGame(); renderHud(); clearScreen();
    const w = el("div", "phase");
    w.appendChild(el("h2", null, `Day ${state.day} — ${phaseName()}`));
    w.appendChild(el("p", "subtitle", "Where to? One thing per part of the day."));
    const grid = el("div", "loc-grid");
    if (isPartyNow()) {
      const card = el("div", "loc-card party");
      card.appendChild(el("div", "loc-emoji", "🎉"));
      card.appendChild(el("div", "loc-name", "House Party"));
      card.appendChild(el("div", "loc-blurb", "Somebody's place. Loud, packed, going late."));
      card.appendChild(el("div", "loc-who", CHAR_IDS.map((id) => `${D.CHARACTERS[id].emoji} ${D.CHARACTERS[id].name}`).join(", ")));
      card.appendChild(button("Go", renderParty, "primary"));
      grid.appendChild(card);
    }
    for (const [id, loc] of Object.entries(D.LOCATIONS)) {
      const here = presentAt(id);
      const card = el("div", "loc-card");
      card.appendChild(el("div", "loc-emoji", loc.emoji));
      card.appendChild(el("div", "loc-name", loc.name));
      card.appendChild(el("div", "loc-blurb", loc.blurb));
      card.appendChild(el("div", "loc-who", here.length ? here.map((h) => `${D.CHARACTERS[h].emoji} ${D.CHARACTERS[h].name}`).join(", ") : loc.home ? "Rest, bag" : "No one you know"));
      card.appendChild(button("Go", () => renderLocation(id), "primary"));
      grid.appendChild(card);
    }
    w.appendChild(grid);
    const tools = el("div", "choices");
    tools.appendChild(button("📱 Phone", () => renderPhone(renderPhase), "choice subtle"));
    tools.appendChild(button(`Open bag${invCount() ? ` (${invCount()})` : ""}`, () => renderBag(renderPhase), "choice subtle"));
    w.appendChild(tools);
    screen().appendChild(w);
  }
  const invCount = () => Object.values(state.inventory).reduce((a, b) => a + b, 0);

  // ---------- location ----------
  function renderLocation(locId) {
    const loc = D.LOCATIONS[locId];
    if (loc.home) return renderHome();
    renderHud(); clearScreen();
    const w = el("div", "location");
    w.appendChild(el("h2", null, `${loc.emoji} ${loc.name}`));
    w.appendChild(el("p", "subtitle", loc.blurb));
    const opts = el("div", "choices");
    for (const id of presentAt(locId)) opts.appendChild(button(`Talk to ${D.CHARACTERS[id].name}`, () => startConvo(id, locId, false), "primary"));
    if (loc.action) opts.appendChild(button(`${loc.action.label}  (train ${D.STAT_SHORT[loc.action.stat]})`, () => renderEffort(locId), "choice"));
    if (loc.work) opts.appendChild(button(`${loc.work.label}  (+$${loc.work.wage})`, () => renderWorkChoice(locId), "choice"));
    if (D.SHOPS[locId]) opts.appendChild(button("Browse the shop", () => renderShop(locId), "choice"));
    opts.appendChild(button(`Open bag${invCount() ? ` (${invCount()})` : ""}`, () => renderBag(() => renderLocation(locId)), "choice subtle"));
    opts.appendChild(button("Head out (skip)", advancePhase, "choice subtle"));
    w.appendChild(opts); screen().appendChild(w);
  }

  function renderEffort(locId) {
    renderHud(); clearScreen();
    const a = D.LOCATIONS[locId].action;
    const w = el("div", "talk");
    w.appendChild(el("div", "talk-head", a.label));
    w.appendChild(el("p", "talk-prompt", `How hard do you push? (training ${D.STAT_LABEL[a.stat]})`));
    const o = el("div", "choices");
    o.appendChild(button(`${D.TUNING.statModes.easy.label} — small but reliable`, () => doEnvironment(locId, "easy"), "choice"));
    o.appendChild(button(`${D.TUNING.statModes.focused.label} — balanced`, () => doEnvironment(locId, "focused"), "choice"));
    o.appendChild(button(`${D.TUNING.statModes.allout.label} — boom or bust`, () => doEnvironment(locId, "allout"), "choice"));
    o.appendChild(button("Back", () => renderLocation(locId), "choice subtle"));
    w.appendChild(o); screen().appendChild(w);
  }
  function doEnvironment(locId, mode) {
    const loc = D.LOCATIONS[locId], a = loc.action;
    const gain = rollTable(D.TUNING.statModes[mode].roll);
    state.stats[a.stat] = clamp(state.stats[a.stat] + gain, 0, T.statCap);
    const lines = [a.text];
    if (gain === 0) lines.push(`Nothing sticks today. ${D.STAT_SHORT[a.stat]} unchanged.`);
    else if (gain < 1) lines.push(`A little progress. ${D.STAT_SHORT[a.stat]} +${gain} (now ${round1(state.stats[a.stat])}).`);
    else lines.push(`That clicked. ${D.STAT_SHORT[a.stat]} +${gain} (now ${round1(state.stats[a.stat])}).`);
    if (loc.social && maybeParty()) lines.push("📨 You scored a house-party invite.");
    renderResult({ title: gain === 0 ? "Off day" : gain >= 2 ? "Breakthrough" : "Time well spent", lines, tone: gain === 0 ? "neutral" : "good" });
  }
  function renderWorkChoice(locId) {
    renderHud(); clearScreen();
    const wk = D.LOCATIONS[locId].work;
    const w = el("div", "talk");
    w.appendChild(el("div", "talk-head", wk.label));
    w.appendChild(el("p", "talk-prompt", `Base pay $${wk.wage}. How do you work it?`));
    const o = el("div", "choices");
    o.appendChild(button(`${D.TUNING.workModes.easy.label} — flat $${wk.wage}`, () => doWork(locId, "easy"), "choice"));
    o.appendChild(button(`${D.TUNING.workModes.hustle.label} — risk it for big tips`, () => doWork(locId, "hustle"), "choice"));
    o.appendChild(button("Back", () => renderLocation(locId), "choice subtle"));
    w.appendChild(o); screen().appendChild(w);
  }
  function doWork(locId, mode) {
    const wk = D.LOCATIONS[locId].work;
    let pay = wk.wage, note = wk.text;
    if (mode === "hustle") {
      const r = d20();
      if (r >= 14) { pay = Math.round(wk.wage * 1.5); note = "You hustle every table. Tips pour in."; }
      else if (r <= 6) { pay = Math.round(wk.wage * 0.7); note = "Rough crowd, lousy tips."; }
      else note = "Steady grind, normal night.";
    }
    state.money += pay;
    renderResult({ title: "Shift done", lines: [note, `+$${pay} → $${state.money}`], tone: "good" });
  }
  function renderHome() {
    renderHud(); clearScreen();
    const w = el("div", "location");
    w.appendChild(el("h2", null, "🏠 Home"));
    w.appendChild(el("p", "subtitle", "Quiet. Crash, or sort your bag."));
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
    w.appendChild(el("p", "subtitle", contacts.length ? "Text for a small daily nudge, peek a schedule, or set up a date." : "No numbers yet. Get one in person first."));
    const list = el("div", "choices");
    for (const id of contacts) {
      const c = D.CHARACTERS[id];
      const card = el("div", "person");
      card.appendChild(el("div", "person-name", `${c.emoji} ${c.name}`));
      card.appendChild(el("div", "person-stage", "Today — " + D.PHASES.map((p) => `${p}: ${D.LOCATIONS[c.schedule[p]].name}`).join(" · ")));
      const row = el("div", "choices");
      if (state.textedToday[id]) row.appendChild(button("Texted today", null, "choice", true));
      else row.appendChild(button(`Text ${c.name}`, () => doText(id, back), "choice"));
      if (composite(id) >= T.dateMinInterest) row.appendChild(button("Ask her out", () => renderDatePicker(id), "choice"));
      else row.appendChild(button("Ask her out (warm her up more)", null, "choice", true));
      card.appendChild(row); list.appendChild(card);
    }
    w.appendChild(list);
    w.appendChild(button("Back", back, "choice subtle"));
    screen().appendChild(w);
  }
  function doText(id, back) {
    const c = D.CHARACTERS[id], r = d20(), cha = effStat("charisma"), total = r + cha;
    const ok = total >= T.textDC, gain = ok ? T.textReward : total >= T.textDC - 5 ? 1 : 0;
    adjustBar(id, "affection", gain);
    state.textedToday[id] = true;
    renderResult({ title: "Sent", roll: { d20: r, stat: `CHA ${cha}`, vibe: 0, vibeNote: "", total, dc: T.textDC },
      lines: [ok ? `${c.name} texts back fast.` : gain ? `${c.name} replies, eventually.` : "Left on read. Ouch.", `Affection +${gain}`],
      tone: ok ? "good" : gain ? "neutral" : "bad", then: () => renderPhone(back) });
  }

  // ---------- shop / bag ----------
  function renderShop(locId) {
    renderHud(); clearScreen();
    const w = el("div", "location");
    w.appendChild(el("h2", null, `🛒 ${D.LOCATIONS[locId].name} — Shop`));
    w.appendChild(el("p", "subtitle", `You have $${state.money}.`));
    const list = el("div", "choices");
    for (const itemId of D.SHOPS[locId]) {
      const it = D.ITEMS[itemId];
      const card = el("div", "shop-item");
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
    const it = D.ITEMS[itemId];
    if (state.money < it.price) return;
    state.money -= it.price;
    let note;
    if (it.type === "permStat") { state.stats[it.stat] = clamp(state.stats[it.stat] + it.amount, 0, T.statCap); note = `+${it.amount} ${D.STAT_SHORT[it.stat]} (permanent).`; }
    else { state.inventory[itemId] = (state.inventory[itemId] || 0) + 1; note = it.type === "gift" ? "Saved for the right moment." : "In your bag."; }
    renderResult({ title: `Bought ${it.name}`, lines: [note, `$${state.money} left.`], tone: "good", then: () => renderShop(locId) });
  }
  function renderBag(back) {
    renderHud(); clearScreen();
    const w = el("div", "location");
    w.appendChild(el("h2", null, "🎒 Bag"));
    w.appendChild(el("p", "subtitle", `$${state.money}`));
    const ids = Object.keys(state.inventory).filter((k) => state.inventory[k] > 0);
    if (!ids.length) w.appendChild(el("p", "result-line", "Empty. Shops: gym, café, library, park, mall."));
    const list = el("div", "choices");
    for (const id of ids) {
      const it = D.ITEMS[id];
      const card = el("div", "shop-item");
      card.appendChild(el("div", "person-name", `${it.emoji} ${it.name} ×${state.inventory[id]}`));
      card.appendChild(el("div", "shop-desc", it.desc));
      if (it.type === "tempStat") card.appendChild(button("Use now", () => useTemp(id, back), "choice"));
      else if (it.type === "gift") card.appendChild(button("Give during a conversation", null, "choice", true));
      list.appendChild(card);
    }
    w.appendChild(list);
    w.appendChild(button("Back", back, "choice subtle"));
    screen().appendChild(w);
  }
  function useTemp(id, back) {
    const it = D.ITEMS[id];
    state.inventory[id] -= 1;
    state.buffs.push({ stat: it.stat, amount: it.amount, phasesLeft: it.phases });
    renderResult({ title: `Used ${it.name}`, lines: [`+${it.amount} ${D.STAT_SHORT[it.stat]} for ${it.phases} phase(s).`], tone: "good", then: back });
  }

  // ---------- conversation ----------
  function vibeFor(c, style, party) {
    let v = 0; const notes = [];
    if (style === c.likedStyle) { v += T.likedStyleBonus; notes.push("her energy"); }
    else if (style === c.dislikedStyle) { v -= T.dislikedStylePenalty; notes.push("not her style"); }
    if (party) { v += T.partyVibe; notes.push("party buzz"); if (style === "thoughtful") { v -= T.partyLoud; notes.push("too loud to go deep"); } }
    return { v, note: notes.join(", ") || "neutral read" };
  }
  function startConvo(id, locId, party) { state.convo = { id, locId, beat: 0, momentum: 0, party: !!party }; renderConvoBeat(); }
  function renderConvoBeat() {
    renderHud(); clearScreen();
    const cv = state.convo, c = D.CHARACTERS[cv.id], mood = moodOf(cv.id);
    const w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `${c.emoji} ${c.name}`));
    w.appendChild(el("p", "char-line", line(one(D.LINES[mood].open), c.name)));
    w.appendChild(el("p", "talk-prompt", "You —"));
    const o = el("div", "choices");
    for (const r of pickN(D.RESPONSES, 3)) o.appendChild(button(r.text, () => resolveBeat(r), "choice"));
    o.appendChild(button(D.MOVE.text, resolveMove, "choice move"));
    if (cv.beat === 0) o.appendChild(button("Back off", () => { const l = cv.locId; state.convo = null; cv.party ? renderParty() : renderLocation(l); }, "choice subtle"));
    w.appendChild(o); screen().appendChild(w);
  }
  function tierOf(r, total, dc) { const m = total - dc; if (r === 20 || m >= 10) return "crit"; if (m >= 0) return "success"; if (r === 1 || m <= -8) return "fail"; return "partial"; }
  function resolveBeat(r) {
    const cv = state.convo, c = D.CHARACTERS[cv.id], mood = moodOf(cv.id);
    const roll = d20(), sv = effStat(r.stat), { v, note } = vibeFor(c, r.style, cv.party);
    const total = roll + sv + v, dc = Math.round(T.baseDC + composite(cv.id) * T.dcPerInterest), tier = tierOf(roll, total, dc);
    let bd = T.beatBar[tier];
    if (r.stat === c.likedStat && bd > 0) bd += T.likedStatBonus;
    adjustBar(cv.id, r.bar, bd);
    if (bd > 0 && r.bar !== "affection") adjustBar(cv.id, "affection", T.beatAffSpill);
    cv.momentum += T.beatMomentum[tier];
    const last = cv.beat + 1 >= 2;
    renderResult({
      title: tier === "crit" ? "That lands hard" : tier === "success" ? "Good beat" : tier === "partial" ? "Lukewarm" : "Misfire",
      roll: { d20: roll, stat: `${D.STAT_SHORT[r.stat]} ${sv}`, vibe: v, vibeNote: note, total, dc },
      lines: [line(one(D.LINES[mood][tier]), c.name), `${D.BAR_LABEL[r.bar]} ${bd >= 0 ? "+" : ""}${bd}${bd > 0 && r.bar !== "affection" ? `, Affection +${T.beatAffSpill}` : ""}  ·  momentum ${cv.momentum >= 0 ? "+" : ""}${cv.momentum}`],
      tone: tier === "fail" ? "bad" : tier === "partial" ? "neutral" : "good",
      then: () => { if (last) renderCapstone(); else { cv.beat += 1; renderConvoBeat(); } },
      thenLabel: last ? "Where to take it" : "Keep going",
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
      lines = [hot ? `It tips over. ${c.name} closes the gap and kisses you back.` : `${c.name} leans in. The temperature jumps.`, `Romance +${T.moveReward.romance}${hot ? " · first kiss 💋" : ""}`];
      tone = "good";
    } else {
      adjustBar(cv.id, "romance", T.moveFail.romance); adjustBar(cv.id, "affection", T.moveFail.affection);
      title = "Too much, too soon";
      lines = [`${c.name} pulls back. "Whoa — slow down."`, `Romance ${T.moveFail.romance} · Affection ${T.moveFail.affection}`];
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
    w.appendChild(el("p", "talk-prompt", "The moment's open. What now?"));
    const o = el("div", "choices");
    o.appendChild(button("Give her a gift", renderGiftPicker, "choice", !haveGift));
    if (!m.number) {
      const ok = comp >= T.numberMinInterest;
      o.appendChild(button(ok ? `Ask for her number  (DC ${T.numberDC})` : `Ask for her number  (needs ${T.numberMinInterest} interest)`, () => resolvePursue("number"), "choice", !ok));
    } else {
      const ok = comp >= T.dateMinInterest;
      o.appendChild(button(ok ? "Ask her on a date" : `Ask her on a date  (needs ${T.dateMinInterest} interest)`, () => renderDatePicker(cv.id), "choice", !ok));
    }
    const kok = rom >= T.kissMinRomance || comp >= T.kissMinInterest;
    o.appendChild(button(kok ? `Go in for a kiss  (DC ${T.kissDC})` : `Go in for a kiss  (needs ${T.kissMinRomance} romance)`, () => resolvePursue("kiss"), "choice", !kok));
    o.appendChild(button("Wrap it up warmly", () => { adjustBar(cv.id, "affection", 1); renderResult({ title: "Good talk", lines: ["You leave it on a warm note. Affection +1."], tone: "good", then: endConvo }); }, "choice subtle"));
    w.appendChild(o); screen().appendChild(w);
  }
  function renderGiftPicker() {
    renderHud(); clearScreen();
    const cv = state.convo, c = D.CHARACTERS[cv.id];
    const w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `Give ${c.name} something`));
    const o = el("div", "choices");
    for (const id of Object.keys(state.inventory).filter((k) => state.inventory[k] > 0 && D.ITEMS[k].type === "gift")) {
      const it = D.ITEMS[id];
      o.appendChild(button(`${it.emoji} ${it.name} ×${state.inventory[id]}`, () => giveGift(id), "choice"));
    }
    o.appendChild(button("Back", renderCapstone, "choice subtle"));
    w.appendChild(o); screen().appendChild(w);
  }
  function giveGift(itemId) {
    const cv = state.convo, c = D.CHARACTERS[cv.id], it = D.ITEMS[itemId];
    state.inventory[itemId] -= 1;
    const fav = c.favoriteGift === itemId, val = Math.round(it.value * (fav ? T.favoriteGiftMult : 1));
    adjustBar(cv.id, "affection", val);
    adjustBar(cv.id, "romance", Math.round(val * T.giftRomanceShare));
    renderResult({ title: fav ? `${c.name} is thrilled` : `${c.name} appreciates it`,
      lines: [fav ? "That's exactly her thing. She lights up." : "A kind, well-received gesture.", `Affection +${val} · Romance +${Math.round(val * T.giftRomanceShare)}`],
      tone: "good", then: renderCapstone, thenLabel: "Back to her" });
  }
  function resolvePursue(kind) {
    const cv = state.convo, c = D.CHARACTERS[cv.id];
    const comp = composite(cv.id), rom = barVal(cv.id, "romance"), atr = barVal(cv.id, "attraction");
    const cha = effStat("charisma"), fit = fitOf(c), roll = d20();
    let total, dc, ok, title, lines, tone;
    if (kind === "number") {
      total = roll + cha + Math.floor(comp / 8) + cv.momentum + fit; dc = T.numberDC; ok = roll !== 1 && (roll === 20 || total >= dc);
      if (ok) { state.milestones[cv.id].number = true; adjustBar(cv.id, "affection", T.numberReward.affection); title = "Got the number"; lines = [`${c.name}: "Use it."`, `Affection +${T.numberReward.affection}`]; tone = "good"; }
      else { adjustBar(cv.id, "affection", T.numberFail.affection); title = "Deflected"; lines = [`${c.name}: "Maybe when I know you better."`, `Affection ${T.numberFail.affection}`]; tone = "bad"; }
    } else {
      total = roll + cha + Math.floor(rom / 8) + Math.floor(atr / 10) + cv.momentum; dc = T.kissDC; ok = roll !== 1 && (roll === 20 || total >= dc);
      if (ok) { state.milestones[cv.id].kiss = true; adjustBar(cv.id, "romance", T.kissReward.romance); adjustBar(cv.id, "attraction", T.kissReward.attractionEvent); title = "She leans in"; lines = ["Time slows. It lands.", `Romance +${T.kissReward.romance} · Attraction +${T.kissReward.attractionEvent}`]; tone = "good"; }
      else { adjustBar(cv.id, "romance", T.kissFail.romance); adjustBar(cv.id, "affection", T.kissFail.affection); title = "She turns her cheek"; lines = ["Too soon. The air goes brittle.", `Romance ${T.kissFail.romance} · Affection ${T.kissFail.affection}`]; tone = "bad"; }
    }
    renderResult({ title, roll: { d20: roll, stat: `CHA ${cha}`, extra: `+ situ ${total - roll - cha}`, total, dc }, lines, tone, then: endConvo, thenLabel: "Continue" });
  }
  function endConvo() {
    const cv = state.convo; if (!cv) return advancePhase();
    state.metCount[cv.id] += 1;
    const revealed = state.metCount[cv.id] === T.revealHintAfter;
    const c = D.CHARACTERS[cv.id];
    const party = cv.party;
    const invite = !party && D.LOCATIONS[cv.locId] && D.LOCATIONS[cv.locId].social && maybeParty();
    state.convo = null;
    const cont = party ? partyAfter : advancePhase;
    if (revealed || invite) renderResult({ title: "Later…", lines: [revealed ? `You're reading her now: ${c.hint}` : null, invite ? "📨 You picked up a house-party invite." : null].filter(Boolean), tone: "good", then: cont });
    else cont();
  }

  // ---------- dates ----------
  function renderDatePicker(id) {
    state.convo = null;
    renderHud(); clearScreen();
    const c = D.CHARACTERS[id];
    const w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `Take ${c.name} where?`));
    w.appendChild(el("p", "subtitle", "Each place has a vibe — and a bill. Your choices on the date do the rest."));
    const o = el("div", "choices");
    for (const [lid, loc] of Object.entries(D.LOCATIONS)) {
      if (!loc.dateSpot || !D.DATE_SCENES[lid]) continue;
      o.appendChild(button(`${loc.emoji} ${loc.name}  (~$${loc.dateCost})`, () => startDate(id, lid), "choice"));
    }
    o.appendChild(button("Not now", advancePhase, "choice subtle"));
    w.appendChild(o); screen().appendChild(w);
  }
  function startDate(id, loc) {
    if (!state.date) state.date = { id, venuesDone: 0, spent: 0, totRom: 0, totAff: 0, bestQ: -9, used: [] };
    state.date.venue = loc; state.date.beat = 0; state.date.picks = [];
    renderDateBeat();
  }
  function renderDateBeat() {
    renderHud(); clearScreen();
    const dt = state.date, c = D.CHARACTERS[dt.id], scene = D.DATE_SCENES[dt.venue];
    const w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `🍷 Date with ${c.name} · ${D.LOCATIONS[dt.venue].name}`));
    if (dt.beat === 0) w.appendChild(el("p", "char-line", scene.intro));
    const b = scene.beats[dt.beat];
    w.appendChild(el("p", "talk-prompt", b.q));
    const o = el("div", "choices");
    for (const opt of b.opts) o.appendChild(button(opt.text, () => { dt.picks.push(opt); dt.beat += 1; dt.beat >= scene.beats.length ? renderBill() : renderDateBeat(); }, "choice"));
    w.appendChild(o); screen().appendChild(w);
  }
  function renderBill() {
    renderHud(); clearScreen();
    const dt = state.date, c = D.CHARACTERS[dt.id], cost = D.LOCATIONS[dt.venue].dateCost;
    const w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `The bill — ${D.LOCATIONS[dt.venue].name}`));
    w.appendChild(el("p", "char-line", `It comes to about $${cost}.`));
    const o = el("div", "choices");
    for (const bopt of D.BILL) {
      const due = Math.round(cost * bopt.costMul);
      const label = `${bopt.text}${due ? `  (−$${due})` : "  ($0)"}`;
      if (due > state.money) o.appendChild(button(`${label} — can't afford`, null, "choice", true));
      else o.appendChild(button(label, () => applyBill(bopt, due), "choice"));
    }
    w.appendChild(o); screen().appendChild(w);
  }
  function applyBill(bopt, due) {
    const dt = state.date, c = D.CHARACTERS[dt.id];
    state.money -= due; dt.spent += due;
    dt.picks.push({ trait: bopt.trait, mag: bopt.mag });
    let score = 0, mag = 0;
    for (const p of dt.picks) { score += (c.traitAffinity[p.trait] || 0) * p.mag; mag += p.mag; }
    let q = mag ? score / mag : 0;
    if (bopt.cheap) {
      const pen = (c.traitAffinity.independent || 0) >= 2 ? Math.round(T.cheapBillPenalty / 2) : T.cheapBillPenalty;
      adjustBar(dt.id, "affection", -pen);
      q -= 0.4;
    }
    const rom = Math.round(T.dateRomance + q * 4), aff = Math.round(T.dateAffection + q * 3);
    adjustBar(dt.id, "romance", rom); adjustBar(dt.id, "affection", aff);
    if (q > 0.5) adjustBar(dt.id, "attraction", T.dateAttractionEvent);
    dt.totRom += rom; dt.totAff += aff; dt.venuesDone += 1; dt.used.push(dt.venue); dt.bestQ = Math.max(dt.bestQ, q);
    renderResult({
      title: q > 1 ? `${D.LOCATIONS[dt.venue].name}: a great stretch` : q > 0 ? `${D.LOCATIONS[dt.venue].name}: going well` : q > -0.5 ? `${D.LOCATIONS[dt.venue].name}: just okay` : `${D.LOCATIONS[dt.venue].name}: stiff`,
      lines: [`Romance ${rom >= 0 ? "+" : ""}${rom} · Affection ${aff >= 0 ? "+" : ""}${aff}${bopt.cheap ? " · the cheap move stung" : ""}`, `Spent so far: $${dt.spent}.`],
      tone: q > 0 ? "good" : q > -0.5 ? "neutral" : "bad",
      then: () => offerContinue(q),
      thenLabel: "And then…",
    });
  }
  function offerContinue(lastQ) {
    const dt = state.date, c = D.CHARACTERS[dt.id];
    const rom = barVal(dt.id, "romance");
    const canMore = dt.venuesDone < T.maxDateVenues && lastQ >= T.dateContinueMinQ;
    const venues = Object.entries(D.LOCATIONS).filter(([lid, loc]) => D.DATE_SCENES[lid] && loc.dateSpot && !dt.used.includes(lid));
    const homeOK = D.DATE_SCENES.home && !dt.used.includes("home") && rom >= T.homeContinueMinRomance;
    if (!canMore || (!venues.length && !homeOK)) return finalizeDate();
    renderHud(); clearScreen();
    const w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `The night's young`));
    w.appendChild(el("p", "char-line", lastQ > 0.6 ? `${c.name}: "I'm not ready for this to end."` : `${c.name} seems happy to keep going.`));
    const o = el("div", "choices");
    for (const [lid, loc] of venues) o.appendChild(button(`Move on to ${loc.emoji} ${loc.name}  (~$${loc.dateCost})`, () => startDate(dt.id, lid), "choice"));
    if (homeOK) o.appendChild(button(`Invite her back to 🏠 Home  (~$${D.LOCATIONS.home.dateCost})`, () => startDate(dt.id, "home"), "choice move"));
    o.appendChild(button("Call it a perfect night", finalizeDate, "choice subtle"));
    w.appendChild(o); screen().appendChild(w);
  }
  function finalizeDate() {
    const dt = state.date, id = dt.id, c = D.CHARACTERS[id];
    if (dt.bestQ > 0.5) adjustBar(id, "attraction", T.dateAttractionEvent);
    state.milestones[id].dates += 1;
    const venues = dt.used.map((v) => D.LOCATIONS[v].name).join(" → ");
    state.date = null;
    renderResult({
      title: dt.bestQ > 1 ? "An unforgettable night" : dt.bestQ > 0 ? "A good night" : "That was a slog",
      lines: [`${venues}.`, `Total: Romance +${dt.totRom} · Affection +${dt.totAff} · $${dt.spent} spent.`, dt.used.includes("home") ? "Some nights you don't talk about." : null].filter(Boolean),
      tone: dt.bestQ > 0 ? "good" : "neutral",
      then: () => { state.metCount[id] += 1; advancePhase(); },
    });
  }

  // ---------- party (multi-round) ----------
  function renderParty() {
    if (!state.partyRun) state.partyRun = { rounds: D.PARTY.rounds, eventDone: false, drinks: 0 };
    renderHud(); clearScreen();
    const pr = state.partyRun;
    const w = el("div", "location");
    w.appendChild(el("h2", null, "🎉 House Party"));
    if (!pr.eventDone) {
      w.appendChild(el("p", "party-note", "Someone shoves a drink at you the second you walk in."));
      const o = el("div", "choices");
      o.appendChild(button("Take it (CHA/STY up, INT down)", () => { pr.eventDone = true; pr.drinks++; state.buffs.push({ stat: "charisma", amount: 4, phasesLeft: 1 }, { stat: "style", amount: 3, phasesLeft: 1 }, { stat: "intelligence", amount: -3, phasesLeft: 1 }); renderParty(); }, "primary"));
      o.appendChild(button("Wave it off", () => { pr.eventDone = true; renderParty(); }, "choice"));
      w.appendChild(o); screen().appendChild(w); return;
    }
    w.appendChild(el("p", "subtitle", `The night's still going — about ${pr.rounds} more thing${pr.rounds === 1 ? "" : "s"} before it winds down.`));
    const o = el("div", "choices");
    for (const id of presentAt("party")) o.appendChild(button(`Talk to ${D.CHARACTERS[id].name}`, () => startConvo(id, "party", true), "primary"));
    o.appendChild(button("Play a game", renderPartyGames, "choice"));
    for (const id of presentAt("party")) o.appendChild(button(`Dance with ${D.CHARACTERS[id].name}`, () => partyDance(id), "choice"));
    for (const id of presentAt("party")) o.appendChild(button(`Bring ${D.CHARACTERS[id].name} a drink`, () => partyBuyHer(id), "choice"));
    o.appendChild(button(`Grab another drink${pr.drinks >= T.overDrinkAt - 1 ? " (you're wobbling)" : ""}`, partyDrink, "choice"));
    o.appendChild(button("Call it a night (leave)", endParty, "choice subtle"));
    w.appendChild(o); screen().appendChild(w);
  }
  function partyAfter() {
    if (!state.partyRun) return advancePhase();
    state.partyRun.rounds -= 1;
    if (state.partyRun.rounds <= 0) { state.partyRun = null; renderResult({ title: "The party winds down", lines: ["You spill out into the night, ears ringing."], tone: "neutral", then: advancePhase }); }
    else renderParty();
  }
  function endParty() { state.partyRun = null; renderResult({ title: "You head out", lines: ["You leave while it's still good."], tone: "neutral", then: advancePhase }); }
  function partyDrink() {
    const pr = state.partyRun; pr.drinks += 1;
    if (pr.drinks >= T.overDrinkAt) {
      state.buffs.push({ stat: "intelligence", amount: -3, phasesLeft: 1 }, { stat: "charisma", amount: -2, phasesLeft: 1 });
      renderResult({ title: "One too many", lines: ["The room tilts. This was a mistake.", "INT and CHA down for a bit."], tone: "bad", then: partyAfter });
    } else {
      state.buffs.push({ stat: "charisma", amount: 3, phasesLeft: 1 }, { stat: "style", amount: 2, phasesLeft: 1 });
      renderResult({ title: "Another round", lines: ["Looser, bolder. CHA/STY up briefly."], tone: "good", then: partyAfter });
    }
  }
  function partyDance(id) {
    const c = D.CHARACTERS[id], roll = d20(), sv = Math.max(effStat("style"), effStat("charisma"));
    const total = roll + sv + T.partyVibe, tier = tierOf(roll, total, 12);
    const rd = { crit: 12, success: 7, partial: 2, fail: -3 }[tier];
    adjustBar(id, "romance", rd); adjustBar(id, "libido", Math.max(0, Math.round(rd / 2)));
    renderResult({ title: tier === "fail" ? "Out of sync" : tier === "crit" ? "You two own the floor" : "Good on the floor",
      roll: { d20: roll, stat: `max(STY,CHA) ${sv}`, vibe: T.partyVibe, vibeNote: "party buzz", total, dc: 12 },
      lines: [tier === "fail" ? `${c.name} laughs it off and drifts away.` : `${c.name} stays close, grinning.`, `Romance ${rd >= 0 ? "+" : ""}${rd}`],
      tone: tier === "fail" ? "bad" : "good", then: partyAfter });
  }
  function partyBuyHer(id) {
    const c = D.CHARACTERS[id];
    adjustBar(id, "libido", T.partyDrinkLibido); adjustBar(id, "romance", 4); adjustBar(id, "affection", 2);
    renderResult({ title: `${c.name} clinks your glass`, lines: [`"You read my mind." She's looser now.`, `Libido +${T.partyDrinkLibido} · Romance +4 · Affection +2`], tone: "good", then: partyAfter });
  }
  function renderPartyGames() {
    renderHud(); clearScreen();
    const w = el("div", "talk");
    w.appendChild(el("div", "talk-head", "Pick a game"));
    const o = el("div", "choices");
    o.appendChild(button("🎲 Truth or Dare", startTruth, "choice"));
    o.appendChild(button("🍾 Spin the Bottle", startSpin, "choice"));
    o.appendChild(button("🏓 Beer Pong", startPong, "choice"));
    o.appendChild(button("Back", renderParty, "choice subtle"));
    w.appendChild(o); screen().appendChild(w);
  }
  function pgScreen(head, prompt, buttons) {
    renderHud(); clearScreen();
    const w = el("div", "talk");
    w.appendChild(el("div", "talk-head", head));
    if (prompt) w.appendChild(el("p", "char-line", prompt));
    const o = el("div", "choices");
    for (const [label, fn, cls] of buttons) o.appendChild(button(label, fn, cls || "choice"));
    w.appendChild(o); screen().appendChild(w);
  }
  // Truth or Dare — you play, then you put someone on the spot.
  function startTruth() {
    state.pg = { focus: one(presentAt("party")) };
    pgScreen("🎲 Truth or Dare", "The circle turns to you. Truth or dare?", [
      ["Truth", truthSelf], ["Dare", dareSelf], ["Back", renderPartyGames, "choice subtle"],
    ]);
  }
  function truthSelf() {
    const q = one(D.PARTY.truths);
    pgScreen("🎲 Truth", `"${q}"`, [
      ["Answer honestly", () => tdSelfResolve("sincere", 3, true)],
      ["Spin it into a joke", () => tdSelfResolve("playful", 2, false)],
      ["Dodge the question", () => tdSelfResolve("independent", 1, false)],
    ]);
  }
  function dareSelf() {
    const dr = one(D.PARTY.dares);
    pgScreen("🎲 Dare", `Dare: ${dr}`, [
      ["Go all in", () => tdSelfResolve("adventurous", 3, true)],
      ["Do a tame version", () => tdSelfResolve("classy", 1, false)],
      ["Chicken out", () => tdSelfResolve("__chicken", 0, false)],
    ]);
  }
  function tdSelfResolve(trait, mag, bold) {
    const id = state.pg.focus, c = D.CHARACTERS[id];
    let rd, aff = 0, txt, tone;
    if (trait === "__chicken") { rd = -4; txt = `${c.name} groans. "Boo. Lame."`; tone = "bad"; }
    else {
      const aff0 = c.traitAffinity[trait] || 0;
      const roll = d20(), good = roll + (bold ? effStat("charisma") : 0) + T.partyVibe >= 12;
      rd = (good ? 6 : 2) + aff0 * 2;
      aff = good ? 3 : 1;
      txt = aff0 > 0 ? `${c.name} clearly enjoyed that.` : aff0 < 0 ? `${c.name} wasn't impressed.` : `${c.name} smirks.`;
      tone = rd >= 0 ? "good" : "bad";
    }
    adjustBar(id, "romance", rd); if (aff) adjustBar(id, "affection", aff);
    renderResult({ title: "Your turn's done", lines: [txt, `${c.name}: Romance ${rd >= 0 ? "+" : ""}${rd}${aff ? ` · Affection +${aff}` : ""}`], tone, then: truthGive, thenLabel: "Your turn to ask" });
  }
  function truthGive() {
    const ids = presentAt("party");
    pgScreen("🎲 Put someone on the spot", "Who are you targeting?",
      ids.map((id) => [`${D.CHARACTERS[id].emoji} ${D.CHARACTERS[id].name}`, () => truthGivePick(id)])
        .concat([["Skip", partyAfter, "choice subtle"]]));
  }
  function truthGivePick(id) {
    state.pg.target = id;
    pgScreen(`🎲 For ${D.CHARACTERS[id].name}`, "Truth or dare?", [
      ["Truth", () => truthGiveOpts(id, D.PARTY.askTruths)],
      ["Dare", () => truthGiveOpts(id, D.PARTY.askDares)],
    ]);
  }
  function truthGiveOpts(id, list) {
    pgScreen(`🎲 For ${D.CHARACTERS[id].name}`, "Pick what you hand her:",
      list.map((o) => [o.text, () => truthGiveResolve(id, o)]));
  }
  function truthGiveResolve(id, opt) {
    const c = D.CHARACTERS[id], aff0 = c.traitAffinity[opt.trait] || 0;
    const roll = d20(), good = roll + effStat("charisma") + T.partyVibe >= 12;
    const rd = (good ? 5 : 1) + aff0 * 2 + opt.mag;
    adjustBar(id, "romance", rd);
    if (good) adjustBar(id, "affection", 2);
    renderResult({ title: `${c.name} plays along`, lines: [aff0 > 0 ? `${c.name} loved being put on the spot like that.` : aff0 < 0 ? `${c.name} plays along, a little flat.` : `${c.name} rolls with it.`, `${c.name}: Romance ${rd >= 0 ? "+" : ""}${rd}${good ? " · Affection +2" : ""}`], tone: rd >= 0 ? "good" : "bad", then: partyAfter });
  }
  // Spin the Bottle.
  function startSpin() {
    const ids = presentAt("party");
    const target = Math.random() < 0.2 ? null : one(ids);
    state.pg = { spinTarget: target };
    if (!target) { renderResult({ title: "🍾 Spin the Bottle", lines: ["It points at the snack table. The circle howls. Spin wasted."], tone: "neutral", then: partyAfter }); return; }
    const c = D.CHARACTERS[target];
    pgScreen("🍾 Spin the Bottle", `It slows… and points at ${c.name}.`, [
      ["Lean in for the kiss", () => spinKiss(target)],
      ["Quick peck on the cheek", () => spinPeck(target)],
      ["Laugh it off", () => spinLaugh(target)],
    ]);
  }
  function spinKiss(id) {
    const c = D.CHARACTERS[id], roll = d20();
    const recept = Math.floor(composite(id) / 8) + Math.floor(barVal(id, "romance") / 8);
    const ok = roll !== 1 && (roll === 20 || roll + recept + T.partyVibe >= 14);
    if (ok) {
      adjustBar(id, "romance", 12); adjustBar(id, "libido", 6);
      if (!state.milestones[id].kiss) { state.milestones[id].kiss = true; adjustBar(id, "attraction", 4); }
      renderResult({ title: "The room erupts", roll: { d20: roll, stat: `vibe ${recept}`, vibe: T.partyVibe, vibeNote: "party buzz", total: roll + recept + T.partyVibe, dc: 14 }, lines: [`${c.name} kisses you back, grinning into it.`, `Romance +12 · Libido +6`], tone: "good", then: partyAfter });
    } else {
      adjustBar(id, "romance", -6); adjustBar(id, "affection", -4);
      renderResult({ title: "She turns away", roll: { d20: roll, stat: `vibe ${recept}`, vibe: T.partyVibe, vibeNote: "party buzz", total: roll + recept + T.partyVibe, dc: 14 }, lines: [`${c.name} dodges it. Awkward laughter.`, `Romance −6 · Affection −4`], tone: "bad", then: partyAfter });
    }
  }
  function spinPeck(id) { const c = D.CHARACTERS[id]; adjustBar(id, "romance", 4); renderResult({ title: "Smooth out", lines: [`A peck on the cheek. ${c.name} smiles. Safe.`, "Romance +4"], tone: "good", then: partyAfter }); }
  function spinLaugh(id) { const c = D.CHARACTERS[id]; adjustBar(id, "affection", 2); renderResult({ title: "All in good fun", lines: [`You ham it up. ${c.name} cracks up.`, "Affection +2"], tone: "good", then: partyAfter }); }
  // Beer Pong.
  function startPong() {
    const ids = presentAt("party");
    pgScreen("🏓 Beer Pong", "Who's your partner?",
      ids.map((id) => [`${D.CHARACTERS[id].emoji} ${D.CHARACTERS[id].name}`, () => { state.pg = { tm: id, throwNo: 0, made: 0, opp: 0 }; pongThrow(); }])
        .concat([["Back", renderPartyGames, "choice subtle"]]));
  }
  function pongThrow() {
    const g = state.pg, c = D.CHARACTERS[g.tm];
    pgScreen(`🏓 Beer Pong w/ ${c.name}`, `Cup ${g.throwNo + 1} of 3 — you: ${g.made}, them: ${g.opp}. Your shot:`, [
      ["Careful aim (INT)", () => pongResolve("int")],
      ["Trick shot (STY, swingy)", () => pongResolve("sty")],
      [`Let ${c.name} take it`, () => pongResolve("her")],
    ]);
  }
  function pongResolve(kind) {
    const g = state.pg, c = D.CHARACTERS[g.tm];
    let hit;
    if (kind === "int") hit = d20() + effStat("intelligence") >= 14;
    else if (kind === "sty") hit = d20() + effStat("style") >= (Math.random() < 0.5 ? 10 : 20);
    else hit = Math.random() < 0.55;
    if (hit) g.made++;
    if (Math.random() < 0.45) g.opp++;
    g.throwNo++;
    if (g.throwNo < 3) { renderResult({ title: hit ? "Splash!" : "Rimmed out", lines: [hit ? `${c.name} whoops and high-fives you.` : `${c.name}: "We'll get the next one."`], tone: hit ? "good" : "neutral", then: pongThrow, thenLabel: "Next cup" }); return; }
    const won = g.made >= g.opp;
    const rd = won ? 9 : 2, af = won ? 4 : 1;
    adjustBar(g.tm, "romance", rd); adjustBar(g.tm, "affection", af);
    if (won) adjustBar(g.tm, "attraction", 2);
    renderResult({ title: won ? `You and ${c.name} take it` : "Beaten this round", lines: [won ? `${c.name} jumps on you, the table cheering.` : `${c.name}: "Rematch later. You owe me."`, `${c.name}: Romance +${rd} · Affection +${af}${won ? " · Attraction +2" : ""}`], tone: won ? "good" : "neutral", then: partyAfter });
  }

  // ---------- result ----------
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

  // ---------- persistence ----------
  function saveGame() { try { if (state) localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {} }
  function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
  function loadGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const p = JSON.parse(raw);
      if (!p || !p.background || !D.BACKGROUNDS[p.background]) return false;
      const base = freshState(p.background);
      state = Object.assign(base, p);
      state.stats = Object.assign({}, base.stats, p.stats);
      state.bars = {};
      for (const id of CHAR_IDS) state.bars[id] = Object.assign(freshBars(id), p.bars && p.bars[id]);
      state.metCount = Object.assign(perChar(() => 0), p.metCount);
      state.milestones = Object.assign(perChar(() => ({ number: false, kiss: false, dates: 0 })), p.milestones || {});
      state.inventory = p.inventory || {};
      state.buffs = Array.isArray(p.buffs) ? p.buffs : [];
      state.textedToday = Object.assign(perChar(() => false), p.textedToday);
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
