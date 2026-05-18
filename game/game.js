(function () {
  const D = window.GAMEDATA;
  const T = D.TUNING;
  const SAVE_KEY = "lifeSimSave_v3";
  const CHAR_IDS = Object.keys(D.CHARACTERS);
  let state = null;

  const perChar = (mk) => { const o = {}; for (const id of CHAR_IDS) o[id] = mk(); return o; };
  function rollLibido(c) { const [lo, hi] = c.libidoRange; return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function freshBars(id) { return { affection: 0, romance: 0, libidoBase: rollLibido(D.CHARACTERS[id]), libidoTemp: 0, attrEvent: 0 }; }
  function freshState(bgId) {
    const bars = {}; for (const id of CHAR_IDS) bars[id] = freshBars(id);
    return {
      background: bgId, stats: Object.assign({}, D.BACKGROUNDS[bgId].stats),
      day: 1, phaseIndex: 0, money: T.startMoney, bars,
      metCount: perChar(() => 0), learned: perChar(() => []),
      milestones: perChar(() => ({ number: false, kiss: false, dates: 0 })),
      inventory: {}, buffs: [], textedToday: perChar(() => false),
      party: null, partyRun: null, convo: null, date: null, pg: null,
    };
  }

  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const phaseName = () => D.PHASES[state.phaseIndex];
  const round1 = (n) => Math.round(n * 10) / 10;
  const d20 = () => 1 + Math.floor(Math.random() * 20);
  const one = (a) => a[Math.floor(Math.random() * a.length)];
  function pickN(a, n) { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x.slice(0, n); }

  function effStat(s) { let v = state.stats[s]; for (const b of state.buffs) if (b.stat === s) v += b.amount; return Math.max(0, Math.floor(v)); }
  function attraction(id) {
    const c = D.CHARACTERS[id]; let base = 0;
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
      state.phaseIndex = 0; state.day += 1; state.money += T.dailyAllowance; state.textedToday = perChar(() => false);
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
    top.appendChild(el("span", "hud-time", `Day ${state.day} · ${phaseName()}`));
    const right = el("div", "hud-right");
    right.appendChild(el("span", "money", `$${state.money}`)); right.appendChild(el("span", "chip", "📱"));
    top.appendChild(right); hud.appendChild(top);
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
      const marks = `${m.number ? " ☎" : ""}${m.dates ? ` 💞${m.dates}` : ""}${m.kiss ? " 💋" : ""}`;
      card.appendChild(el("div", "person-name", `${c.emoji} ${c.name}${marks}`));
      card.appendChild(el("div", "person-stage", `${stageFor(comp)} · Interest ${comp}`));
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
  function renderCreate() {
    clearScreen();
    const w = el("div", "create");
    w.appendChild(el("h2", null, "Who are you?"));
    w.appendChild(el("p", "subtitle", "Background sets your start. Five very different people are out there — each reads you differently."));
    const grid = el("div", "bg-grid");
    for (const [id, bg] of Object.entries(D.BACKGROUNDS)) {
      const card = el("div", "bg-card");
      card.appendChild(el("div", "bg-emoji", bg.emoji)); card.appendChild(el("div", "bg-name", bg.name)); card.appendChild(el("div", "bg-blurb", bg.blurb));
      const st = el("div", "bg-stats"); for (const s of D.STATS) st.appendChild(el("span", "chip", `${D.STAT_SHORT[s]} ${bg.stats[s]}`)); card.appendChild(st);
      card.appendChild(button("Choose", () => { state = freshState(id); saveGame(); renderPhase(); }, "primary"));
      grid.appendChild(card);
    }
    w.appendChild(grid); screen().appendChild(w);
  }

  function renderPhase() {
    saveGame(); renderHud(); clearScreen();
    const w = el("div", "phase");
    w.appendChild(el("h2", null, `Day ${state.day} — ${phaseName()}`));
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
    w.appendChild(el("p", "char-line", one(c.opens[mood])));
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
    w.appendChild(el("div", "talk-head", `🍷 ${D.LOCATIONS[dt.venue].name} · with ${c.name}`));
    if (dt.beat === 0) w.appendChild(el("p", "char-line", scene.intro));
    const b = scene.beats[dt.beat];
    w.appendChild(el("p", "talk-prompt", b.q));
    const o = el("div", "choices");
    for (const opt of b.opts) o.appendChild(button(opt.text, () => { dt.picks.push(opt); dt.beat += 1; dt.beat >= scene.beats.length ? afterVenueBeats() : renderDateBeat(); }, "choice"));
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
    w.appendChild(el("p", "char-line", `It comes to about $${cost}. She watches to see what you do — everyone always does.`));
    const o = el("div", "choices");
    for (const bid of scene.bill.options) {
      const bopt = D.BILL[bid], due = Math.round(cost * bopt.costMul);
      const label = `${bopt.text}${due ? `  (−$${due})` : "  ($0)"}`;
      if (due > state.money) o.appendChild(button(`${label} — can't afford`, null, "choice", true));
      else o.appendChild(button(label, () => resolveVenue(due, bopt), "choice"));
    }
    w.appendChild(o); screen().appendChild(w);
  }
  function resolveVenue(due, bopt) {
    const dt = state.date, c = D.CHARACTERS[dt.id];
    state.money -= due; dt.spent += due;
    if (bopt) dt.picks.push({ trait: bopt.trait, mag: bopt.mag });
    let score = 0, mag = 0;
    for (const p of dt.picks) { score += (c.traitAffinity[p.trait] || 0) * p.mag; mag += p.mag; }
    let q = mag ? score / mag : 0;
    if (bopt && bopt.cheap) { const pen = (c.traitAffinity.independent || 0) >= 2 ? Math.round(T.cheapBillPenalty / 2) : T.cheapBillPenalty; adjustBar(dt.id, "affection", -pen); q -= 0.4; }
    const rom = Math.round(T.dateRomance + q * 4), aff = Math.round(T.dateAffection + q * 3);
    adjustBar(dt.id, "romance", rom); adjustBar(dt.id, "affection", aff);
    if (q > 0.5) adjustBar(dt.id, "attraction", T.dateAttractionEvent);
    dt.totRom += rom; dt.totAff += aff; dt.venuesDone += 1; dt.used.push(dt.venue); dt.bestQ = Math.max(dt.bestQ, q);
    const vn = D.LOCATIONS[dt.venue].name;
    renderResult({
      title: q > 1 ? `${vn}: a great stretch` : q > 0 ? `${vn}: going well` : q > -0.5 ? `${vn}: just okay` : `${vn}: stiff`,
      lines: [q > 0.6 ? `${c.name} is fully in this. You can feel it.` : q < -0.3 ? `${c.name} is being polite, which is its own kind of answer.` : `${c.name} seems content to see where this goes.`,
        `Romance ${rom >= 0 ? "+" : ""}${rom} · Affection ${aff >= 0 ? "+" : ""}${aff}${bopt && bopt.cheap ? " · the cheap move landed badly" : ""}`, dt.spent ? `Spent so far: $${dt.spent}.` : "No bill here — just the night."],
      tone: q > 0 ? "good" : q > -0.5 ? "neutral" : "bad", then: () => offerContinue(q), thenLabel: "And then…",
    });
  }
  function offerContinue(lastQ) {
    const dt = state.date, c = D.CHARACTERS[dt.id], rom = barVal(dt.id, "romance");
    const canMore = dt.venuesDone < T.maxDateVenues && lastQ >= T.dateContinueMinQ;
    const venues = Object.entries(D.LOCATIONS).filter(([lid, loc]) => D.DATE_SCENES[lid] && loc.dateSpot && !dt.used.includes(lid));
    const homeOK = D.DATE_SCENES.home && !dt.used.includes("home") && rom >= T.homeContinueMinRomance;
    if (!canMore || (!venues.length && !homeOK)) return renderDateEnd();
    renderHud(); clearScreen();
    const w = el("div", "talk");
    w.appendChild(el("div", "talk-head", "The night's still young"));
    w.appendChild(el("p", "char-line", lastQ > 0.6 ? `${c.name}, close to your ear: "I'm not ready for this to be over."` : `${c.name} glances at the door, then back at you. Open to more.`));
    const o = el("div", "choices");
    for (const [lid, loc] of venues) o.appendChild(button(`\"Come on — ${loc.name}.\"  (${loc.dateCost ? "~$" + loc.dateCost : "free"})`, () => startDate(dt.id, lid), "choice"));
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
      lines: [endLine, `${venues}.`, `Total: Romance ${dt.totRom + er >= 0 ? "+" : ""}${dt.totRom + er} · Affection ${dt.totAff + ea >= 0 ? "+" : ""}${dt.totAff + ea} · $${dt.spent} spent.`, dt.used.includes("home") ? "Some of the night you keep to yourself." : null].filter(Boolean),
      tone: dt.bestQ > 0 ? "good" : "neutral", then: () => { state.metCount[id] += 1; advancePhase(); },
    });
  }

  // ---------- party ----------
  function flowIndex() {
    const pr = state.partyRun; if (!pr) return 0;
    const elapsed = (D.PARTY.rounds - pr.rounds) + Math.floor(pr.drinks / 2);
    let idx = 0; D.PARTY.flows.forEach((f, i) => { if (f.at <= elapsed) idx = i; });
    return idx;
  }
  function recept(id) { return composite(id); }
  function renderParty() {
    if (!state.partyRun) state.partyRun = { rounds: D.PARTY.rounds, eventDone: false, drinks: 0 };
    renderHud(); clearScreen();
    const pr = state.partyRun, w = el("div", "location");
    w.appendChild(el("h2", null, "🎉 House Party"));
    if (!pr.eventDone) {
      w.appendChild(el("p", "char-line", "You shoulder through the door into heat and noise. Someone presses a drink into your hand before you've even got your bearings."));
      const o = el("div", "choices");
      o.appendChild(button("Take it (CHA/STY up, INT down)", () => { pr.eventDone = true; pr.drinks++; state.buffs.push({ stat: "charisma", amount: 4, phasesLeft: 1 }, { stat: "style", amount: 3, phasesLeft: 1 }, { stat: "intelligence", amount: -3, phasesLeft: 1 }); renderParty(); }, "primary"));
      o.appendChild(button("Wave it off, stay sharp", () => { pr.eventDone = true; renderParty(); }, "choice"));
      w.appendChild(o); screen().appendChild(w); return;
    }
    const fi = flowIndex(), flow = D.PARTY.flows[fi];
    w.appendChild(el("p", "char-line", `${flow.desc} ${pr.rounds} thing${pr.rounds === 1 ? "" : "s"} before you'd call it a night.`));
    const guests = partyGuests();
    w.appendChild(el("p", "subtitle", "Here: " + guests.map((g) => D.CHARACTERS[g].name).join(", ")));
    const o = el("div", "choices");
    for (const id of guests) o.appendChild(button(`Talk to ${D.CHARACTERS[id].name}`, () => startConvo(id, "party", true), "primary"));
    o.appendChild(button("Get pulled into a game", startRandomGame, "choice"));
    for (const id of guests) o.appendChild(button(`Dance with ${D.CHARACTERS[id].name}`, () => renderDanceModes(id), "choice"));
    for (const id of guests) if (fi >= D.PARTY.privateGateFlow && recept(id) >= D.PARTY.privateGateInterest) o.appendChild(button(`Slip away somewhere quiet with ${D.CHARACTERS[id].name}`, () => renderPrivate(id), "choice move"));
    for (const id of guests) o.appendChild(button(`Bring ${D.CHARACTERS[id].name} a drink`, () => partyBuyHer(id), "choice"));
    o.appendChild(button(`Grab another drink${pr.drinks >= T.overDrinkAt - 1 ? " (you're wobbling)" : ""}`, partyDrink, "choice"));
    o.appendChild(button("Call it a night (leave)", endParty, "choice subtle"));
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
    renderResult({ title: `${c.name} clinks your glass`, lines: [`"You read my mind." She drinks, watching you over the rim.`, `Libido +${T.partyDrinkLibido} · Romance +4 · Affection +2`], tone: "good", then: partyAfter });
  }
  function renderDanceModes(id) {
    renderHud(); clearScreen();
    const c = D.CHARACTERS[id], fi = flowIndex(), rc = recept(id), w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `Dance with ${c.name}`));
    w.appendChild(el("p", "char-line", `She steps into the space, eyebrow up. "Well? Show me."`));
    const o = el("div", "choices");
    for (const mode of D.PARTY.dance) {
      const locked = fi < mode.gateFlow || rc < mode.gateRecept;
      if (locked) o.appendChild(button(`${mode.label} — ${mode.gateFlow > fi ? "not that kind of party yet" : "she's not there with you yet"}`, null, "choice", true));
      else o.appendChild(button(`${mode.label} — ${mode.desc}`, () => partyDance(id, mode), mode.id === "handsy" ? "choice move" : "choice"));
    }
    o.appendChild(button("Back", renderParty, "choice subtle"));
    w.appendChild(o); screen().appendChild(w);
  }
  function partyDance(id, mode) {
    const c = D.CHARACTERS[id];
    if (!mode.risk) {
      adjustBar(id, "romance", mode.rom); adjustBar(id, "libido", mode.lib);
      renderResult({ title: "On the floor", lines: [`${c.name} matches you, laughing, easy. No stakes, all fun.`, `Romance +${mode.rom}${mode.lib ? ` · Libido +${mode.lib}` : ""}`], tone: "good", then: partyAfter });
      return;
    }
    const roll = d20(), gauge = Math.floor(recept(id) / 6) + Math.floor(barVal(id, "libido") / 12);
    const total = roll + gauge + T.partyVibe, ok = roll !== 1 && (roll === 20 || total >= 13);
    if (ok) {
      adjustBar(id, "romance", mode.rom); adjustBar(id, "libido", mode.lib); adjustBar(id, "attraction", 2);
      renderResult({ title: mode.id === "handsy" ? "She pulls you closer" : "She's right there with you", roll: { d20: roll, stat: `read ${gauge}`, vibe: T.partyVibe, vibeNote: "party buzz", total, dc: 13 },
        lines: [mode.id === "handsy" ? `${c.name}'s hands find your collar. The room stops mattering.` : `${c.name} moves in close, breath warm, completely unbothered by who's watching.`, `Romance +${mode.rom} · Libido +${mode.lib}`], tone: "good", then: partyAfter });
    } else {
      adjustBar(id, "romance", T.danceFail.romance); adjustBar(id, "affection", T.danceFail.affection);
      renderResult({ title: "She steps back", roll: { d20: roll, stat: `read ${gauge}`, vibe: T.partyVibe, vibeNote: "party buzz", total, dc: 13 },
        lines: [`${c.name} catches your hands and sets them back. "Easy. Not like that, not here."`, `Romance ${T.danceFail.romance} · Affection ${T.danceFail.affection}`], tone: "bad", then: partyAfter });
    }
  }
  function renderPrivate(id) {
    renderHud(); clearScreen();
    const c = D.CHARACTERS[id], w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `Just the two of you`));
    w.appendChild(el("p", "char-line", `You catch ${c.name}'s eye and tilt your head toward the quiet of the hallway. She holds the look a second — then follows. The noise drops behind a closed door.`));
    const o = el("div", "choices");
    o.appendChild(button("\"I've been wanting you to myself all night.\" (bold)", () => resolvePrivate(id, "bold"), "choice move"));
    o.appendChild(button("\"…is this okay?\" (let her decide the pace)", () => resolvePrivate(id, "tender"), "choice"));
    o.appendChild(button("Lose your nerve, head back", renderParty, "choice subtle"));
    w.appendChild(o); screen().appendChild(w);
  }
  function resolvePrivate(id, approach) {
    const c = D.CHARACTERS[id], roll = d20();
    const gauge = Math.floor(recept(id) / 6) + Math.floor(barVal(id, "libido") / 8) + Math.floor(barVal(id, "romance") / 12);
    const dc = approach === "bold" ? 15 : 12; // tender is safer, bold higher ceiling
    const total = roll + gauge + (approach === "bold" ? 0 : 2);
    const ok = roll !== 1 && (roll === 20 || total >= dc);
    if (ok) {
      adjustBar(id, "romance", T.privateReward.romance + (approach === "bold" ? 3 : 0));
      adjustBar(id, "libido", T.privateReward.libido); adjustBar(id, "attraction", T.privateReward.attractionEvent);
      if (!state.milestones[id].kiss) state.milestones[id].kiss = true;
      renderResult({ title: "Behind a closed door", roll: { d20: roll, stat: `read ${gauge}`, vibe: 0, vibeNote: "", total, dc },
        lines: [`${c.name} answers by pulling you in. It gets quiet, and close, and unhurried — and the party stops existing for a while.`, "Some of the night stays between the two of you.", `Romance way up · Libido way up`], tone: "good", then: partyAfter });
    } else {
      adjustBar(id, "romance", T.privateFail.romance); adjustBar(id, "affection", T.privateFail.affection);
      state.party.guests = state.party.guests.filter((g) => g !== id);
      renderResult({ title: "Misread", roll: { d20: roll, stat: `read ${gauge}`, vibe: 0, vibeNote: "", total, dc },
        lines: [`${c.name} stops you, gentle but unmistakable. "Hey — no. Not this." She slips back into the noise without looking back, and you don't see her again tonight.`, `Romance ${T.privateFail.romance} · Affection ${T.privateFail.affection}`], tone: "bad", then: partyAfter });
    }
  }

  // ----- party games (random, multi-round, everyone narrated) -----
  function startRandomGame() {
    const g = one(D.PARTY.games);
    state.pg = { game: g, round: 0, partner: null, made: 0, opp: 0 };
    nextGameRound();
  }
  function guestNarration(spicyOK) {
    const guests = partyGuests();
    return guests.map((id) => {
      const c = D.CHARACTERS[id];
      const spicy = spicyOK && (barVal(id, "libido") >= 55 || (c.traitAffinity.adventurous || 0) >= 2 || (c.traitAffinity.independent || 0) >= 2) && Math.random() < 0.6;
      const pool = spicy ? D.PARTY.spicyGuestBeats : D.PARTY.guestBeats;
      return one(pool).replace(/\{n\}/g, c.name);
    });
  }
  function nextGameRound() {
    const pg = state.pg;
    if (pg.round >= D.PARTY.gameRounds) { renderResult({ title: "Game over", lines: ["The circle breaks up, someone refills cups, the night rolls on."], tone: "neutral", then: partyAfter }); return; }
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
    const pg = state.pg, fi = flowIndex(), spicyOK = fi >= 2;
    const guests = partyGuests();
    const upYou = Math.random() < 0.5 || !guests.length;
    const narr = guestNarration(spicyOK);
    if (upYou) {
      gameShell(`🎲 Truth or Dare · round ${pg.round}/${D.PARTY.gameRounds}`, narr, "The bottle stops on you. The circle leans in.", [
        ["Truth", () => tdYou("truth", spicyOK)], ["Dare", () => tdYou("dare", spicyOK)],
      ]);
    } else {
      const who = one(guests), c = D.CHARACTERS[who];
      const spicy = spicyOK && (barVal(who, "libido") >= 55 || (c.traitAffinity.adventurous || 0) >= 2);
      const prompt = spicy ? one(D.PARTY.spicyDares) : one(Math.random() < 0.5 ? D.PARTY.truths : D.PARTY.dares);
      gameShell(`🎲 Truth or Dare · round ${pg.round}/${D.PARTY.gameRounds}`, narr.concat([`It's ${c.name}'s turn: "${prompt}"`]), `${c.name} glances at you while she does it. What do you do?`, [
        ["Egg her on", () => { adjustBar(who, "romance", spicy ? 5 : 3); adjustBar(who, "libido", spicy ? 4 : 1); afterGameRound(`${c.name} goes for it, holding your eyes the whole time. Romance +${spicy ? 5 : 3}.`); }],
        ["Play it cool", () => { adjustBar(who, "romance", 1); afterGameRound(`You stay unreadable. ${c.name} works a little harder for your reaction. Romance +1.`); }],
      ]);
    }
  }
  function tdYou(kind, spicyOK) {
    const guests = partyGuests(), focus = guests.length ? one(guests) : null;
    const pool = kind === "truth" ? (spicyOK ? D.PARTY.spicyTruths : D.PARTY.truths) : (spicyOK ? D.PARTY.spicyDares : D.PARTY.dares);
    const prompt = one(pool);
    const opts = kind === "truth"
      ? [["Answer honestly", "sincere", true], ["Spin it into a joke", "playful", false], ["Dodge it", "independent", false]]
      : [["Go all in", "adventurous", true], ["Tame version", "classy", false], ["Chicken out", "__chk", false]];
    gameShell(`🎲 Your ${kind}`, [], `"${prompt}"`, opts.map(([label, trait, bold]) => [label, () => tdYouResolve(focus, trait, bold)]));
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
    const pg = state.pg, guests = partyGuests(), narr = guestNarration(flowIndex() >= 2);
    const circle = guests.slice(); const youIn = Math.random() < 0.6;
    const target = one(circle);
    if (youIn && target) {
      const c = D.CHARACTERS[target], fi = flowIndex();
      const buttons = [["Lean in for it", () => spinKiss(target)], ["Peck on the cheek", () => { adjustBar(target, "romance", 4); afterGameRound(`A peck. ${c.name} grins. Safe. Romance +4.`); }], ["Laugh it off", () => { adjustBar(target, "affection", 2); afterGameRound(`You ham it up; ${c.name} cracks up. Affection +2.`); }]];
      gameShell(`🍾 Spin the Bottle · round ${pg.round}/${D.PARTY.gameRounds}`, narr, `It slows… and points at ${c.name}.${fi >= 2 ? " The room goes \"ooooh.\"" : ""}`, buttons);
    } else {
      const a = one(circle), b = one(circle.filter((x) => x !== a) || circle);
      const an = D.CHARACTERS[a].name, bn = b ? D.CHARACTERS[b].name : "the snack table";
      if (b) { adjustBar(a, "romance", 1); }
      gameShell(`🍾 Spin the Bottle · round ${pg.round}/${D.PARTY.gameRounds}`, narr.concat([`The bottle picks ${an} and ${bn}. The circle howls; you're just a spectator this round.`]), null, [["Watch it play out", () => afterGameRound(`${an} and ${bn} sort it out, to much applause.`)]]);
    }
  }
  function spinKiss(id) {
    const c = D.CHARACTERS[id], roll = d20();
    const r = Math.floor(composite(id) / 8) + Math.floor(barVal(id, "romance") / 8);
    const ok = roll !== 1 && (roll === 20 || roll + r + T.partyVibe >= 14);
    if (ok) {
      adjustBar(id, "romance", 12); adjustBar(id, "libido", 6);
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
    gameShell(`🏓 Beer Pong w/ ${c ? c.name : "the table"} · cup ${pg.round}/${D.PARTY.gameRounds}`, guestNarration(false), `You: ${pg.made} · Them: ${pg.opp}. Your shot:`, [
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
    if (pg.round < D.PARTY.gameRounds) { afterGameRound(hit ? `Splash. ${c ? c.name + " whoops and high-fives you." : "Nice."}` : `Rimmed out. ${c ? c.name + ": \"Next one.\"" : ""}`, hit ? "good" : "neutral"); return; }
    const won = pg.made >= pg.opp, rd = won ? 9 : 2, af = won ? 4 : 1;
    if (pg.partner) { adjustBar(pg.partner, "romance", rd); adjustBar(pg.partner, "affection", af); if (won) adjustBar(pg.partner, "attraction", 2); }
    afterGameRound(won ? `You take it. ${c ? c.name + " jumps on you, the table roaring." : "Winners."} Romance +${rd} · Affection +${af}.` : `Beaten this round. ${c ? c.name + ": \"Rematch. You owe me.\"" : ""} Romance +${rd}.`, won ? "good" : "neutral");
  }
  function afterGameRound(line, tone, roll) {
    renderResult({ title: `Round ${state.pg.round}`, roll: roll || null, lines: [line], tone: tone || "good", then: nextGameRound, thenLabel: state.pg.round >= D.PARTY.gameRounds ? "Wrap up" : "Next round" });
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
      const p = JSON.parse(raw); if (!p || !p.background || !D.BACKGROUNDS[p.background]) return false;
      const base = freshState(p.background);
      state = Object.assign(base, p);
      state.stats = Object.assign({}, base.stats, p.stats);
      state.bars = {}; for (const id of CHAR_IDS) state.bars[id] = Object.assign(freshBars(id), p.bars && p.bars[id]);
      state.metCount = Object.assign(perChar(() => 0), p.metCount);
      state.learned = Object.assign(perChar(() => []), p.learned);
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
