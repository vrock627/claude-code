(function () {
  const D = window.GAMEDATA;
  const T = D.TUNING;
  const SAVE_KEY = "lifeSimSave_v3";
  let state = null;

  // ---------- state ----------
  function rollLibido(c) {
    const [lo, hi] = c.libidoRange;
    return lo + Math.floor(Math.random() * (hi - lo + 1));
  }
  function freshBars(id) {
    return { affection: 0, romance: 0, libidoBase: rollLibido(D.CHARACTERS[id]), libidoTemp: 0, attrEvent: 0 };
  }
  function freshState(bgId) {
    const bg = D.BACKGROUNDS[bgId];
    const bars = {};
    for (const id of Object.keys(D.CHARACTERS)) bars[id] = freshBars(id);
    return {
      background: bgId,
      stats: Object.assign({}, bg.stats),
      day: 1, phaseIndex: 0,
      money: T.startMoney,
      bars,
      metCount: { aiko: 0, bianca: 0 },
      milestones: { aiko: m(), bianca: m() },
      inventory: {},
      buffs: [],
      textedToday: { aiko: false, bianca: false },
      party: null,
      partyEventDone: false,
      convo: null,
      date: null,
    };
    function m() { return { number: false, kiss: false, dates: 0 }; }
  }

  // ---------- math ----------
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const phaseName = () => D.PHASES[state.phaseIndex];
  const round1 = (n) => Math.round(n * 10) / 10;

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
    const ev = clamp(state.bars[id].attrEvent, 0, T.attractEventCap);
    return clamp(base + ev, 0, T.barCap);
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
  function stageFor(v) {
    let s = D.STAGES[0].name;
    for (const t of D.STAGES) if (v >= t.min) s = t.name;
    return s;
  }
  function moodOf(id) {
    const c = composite(id);
    return c < 15 ? "cold" : c < 35 ? "neutral" : c < 60 ? "warm" : "hot";
  }

  function isPartyNow() {
    return state.party && state.party.day === state.day && state.party.phaseIndex === state.phaseIndex;
  }
  function presentAt(locId) {
    if (state.party && (isPartyNow() ? true : false)) {
      // during the party night's party phase, everyone is at the party
      if (isPartyNow()) return locId === "party" ? Object.keys(D.CHARACTERS) : [];
    }
    const here = [];
    for (const [id, c] of Object.entries(D.CHARACTERS)) if (c.schedule[phaseName()] === locId) here.push(id);
    return here;
  }
  function scheduleParty() {
    // next Night from now (tonight if it hasn't happened yet, else tomorrow)
    const nightIdx = D.PHASES.indexOf("Night");
    if (state.phaseIndex < nightIdx) state.party = { day: state.day, phaseIndex: nightIdx };
    else state.party = { day: state.day + 1, phaseIndex: nightIdx };
    state.partyEventDone = false;
  }
  function maybeParty() {
    if (state.party) return false;
    if (Math.random() < T.partyInviteChance) { scheduleParty(); return true; }
    return false;
  }

  function advancePhase() {
    state.convo = null;
    state.date = null;
    state.buffs = state.buffs.map((b) => ({ ...b, phasesLeft: b.phasesLeft - 1 })).filter((b) => b.phasesLeft > 0);
    state.phaseIndex += 1;
    if (state.phaseIndex >= D.PHASES.length) {
      state.phaseIndex = 0;
      state.day += 1;
      state.money += T.dailyAllowance;
      state.textedToday = { aiko: false, bianca: false };
      for (const id of Object.keys(D.CHARACTERS)) {
        const c = D.CHARACTERS[id], b = state.bars[id];
        b.affection = clamp(b.affection - c.decay.affection, 0, T.barCap);
        b.romance = clamp(b.romance - c.decay.romance, 0, T.barCap);
        b.libidoBase = rollLibido(c);
        b.libidoTemp = 0;
      }
      if (state.party && state.party.day < state.day) { state.party = null; state.partyEventDone = false; }
    }
    renderPhase();
  }

  // ---------- DOM ----------
  const screen = () => document.getElementById("screen");
  function el(t, c, x) { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function button(label, fn, cls, dis) { const b = el("button", cls || "choice", label); if (dis) b.disabled = true; else b.addEventListener("click", fn); return b; }
  const clearScreen = () => (screen().innerHTML = "");
  function pickN(arr, n) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a.slice(0, n);
  }
  const line = (s, name) => s.replace(/\{n\}/g, name);

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
      for (const b of state.buffs)
        bw.appendChild(el("span", "buff", `${D.STAT_SHORT[b.stat]} ${b.amount > 0 ? "+" : ""}${b.amount}·${b.phasesLeft}p`));
      hud.appendChild(bw);
    }

    const people = el("div", "people");
    for (const [id, c] of Object.entries(D.CHARACTERS)) {
      const comp = composite(id), m = state.milestones[id];
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
        const fl = el("div", "fill");
        fl.style.width = `${v}%`;
        tr.appendChild(fl);
        row.appendChild(tr);
        row.appendChild(el("span", "barnum", String(v)));
        bars.appendChild(row);
      }
      card.appendChild(bars);
      if (state.metCount[id] >= T.revealHintAfter)
        card.appendChild(el("div", "person-hint", c.hint));
      else
        card.appendChild(el("div", "person-hint dim", "Talk to her a few times to read her…"));
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
    b.appendChild(cont);
    w.appendChild(b); screen().appendChild(w);
  }
  function renderCreate() {
    clearScreen();
    const w = el("div", "create");
    w.appendChild(el("h2", null, "Who are you?"));
    w.appendChild(el("p", "subtitle", "Background sets your start. Everything after, you earn — and people read you differently."));
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
      card.appendChild(el("div", "loc-who", Object.values(D.CHARACTERS).map((c) => `${c.emoji} ${c.name}`).join(", ")));
      card.appendChild(button("Go", () => renderParty(), "primary"));
      grid.appendChild(card);
    }

    for (const [id, loc] of Object.entries(D.LOCATIONS)) {
      const here = presentAt(id);
      const card = el("div", "loc-card");
      card.appendChild(el("div", "loc-emoji", loc.emoji));
      card.appendChild(el("div", "loc-name", loc.name));
      card.appendChild(el("div", "loc-blurb", loc.blurb));
      const who = here.length
        ? here.map((h) => `${D.CHARACTERS[h].emoji} ${D.CHARACTERS[h].name}`).join(", ")
        : loc.home ? "Rest, bag" : "No one you know";
      card.appendChild(el("div", "loc-who", who));
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
    for (const id of presentAt(locId)) {
      const c = D.CHARACTERS[id];
      opts.appendChild(button(`Talk to ${c.name}`, () => startConvo(id, locId, false), "primary"));
    }
    if (loc.action) opts.appendChild(button(`${loc.action.label}  (train ${D.STAT_SHORT[loc.action.stat]})`, () => doEnvironment(locId), "choice"));
    if (loc.work) opts.appendChild(button(`${loc.work.label}  (+$${loc.work.wage})`, () => doWork(locId), "choice"));
    if (D.SHOPS[locId]) opts.appendChild(button("Browse the shop", () => renderShop(locId), "choice"));
    opts.appendChild(button(`Open bag${invCount() ? ` (${invCount()})` : ""}`, () => renderBag(() => renderLocation(locId)), "choice subtle"));
    opts.appendChild(button("Head out (skip)", () => advancePhase(), "choice subtle"));
    w.appendChild(opts); screen().appendChild(w);
  }

  function doEnvironment(locId) {
    const a = D.LOCATIONS[locId].action;
    const gain = rollStatGain();
    state.stats[a.stat] = clamp(state.stats[a.stat] + gain, 0, T.statCap);
    const lines = [a.text];
    if (gain === 0) lines.push(`It just doesn't stick today. ${D.STAT_SHORT[a.stat]} unchanged.`);
    else if (gain < 1) lines.push(`A little progress. ${D.STAT_SHORT[a.stat]} +${gain} (now ${round1(state.stats[a.stat])}).`);
    else lines.push(`That clicked. ${D.STAT_SHORT[a.stat]} +${gain} (now ${round1(state.stats[a.stat])}).`);
    if (D.LOCATIONS[locId].social && maybeParty()) lines.push("📨 You scored a house-party invite.");
    renderResult({ title: gain === 0 ? "Off day" : gain >= 2 ? "Breakthrough" : "Time well spent", lines, tone: gain === 0 ? "neutral" : "good" });
  }
  function rollStatGain() {
    let r = Math.random(), acc = 0;
    for (const seg of T.statRoll) { acc += seg.p; if (r <= acc) return seg.min === seg.max ? seg.min : round1(seg.min + Math.random() * (seg.max - seg.min)); }
    const last = T.statRoll[T.statRoll.length - 1];
    return last.min === last.max ? last.min : round1(last.min + Math.random() * (last.max - last.min));
  }
  function doWork(locId) {
    const wk = D.LOCATIONS[locId].work;
    state.money += wk.wage;
    renderResult({ title: "Shift done", lines: [wk.text, `+$${wk.wage} → $${state.money}`], tone: "good" });
  }

  // ---------- home / phone ----------
  function renderHome() {
    renderHud(); clearScreen();
    const w = el("div", "location");
    w.appendChild(el("h2", null, "🏠 Home"));
    w.appendChild(el("p", "subtitle", "Quiet. Crash, or sort your bag."));
    const o = el("div", "choices");
    o.appendChild(button("📱 Phone", () => renderPhone(renderHome), "primary"));
    o.appendChild(button(`Open bag${invCount() ? ` (${invCount()})` : ""}`, () => renderBag(renderHome), "choice"));
    o.appendChild(button("Rest (skip to next phase)", () => advancePhase(), "choice subtle"));
    w.appendChild(o); screen().appendChild(w);
  }
  function renderPhone(back) {
    renderHud(); clearScreen();
    const w = el("div", "location");
    w.appendChild(el("h2", null, "📱 Phone"));
    const contacts = Object.keys(D.CHARACTERS).filter((id) => state.milestones[id].number);
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
      card.appendChild(row);
      list.appendChild(card);
    }
    w.appendChild(list);
    w.appendChild(button("Back", back, "choice subtle"));
    screen().appendChild(w);
  }
  function doText(id, back) {
    const c = D.CHARACTERS[id];
    const d20 = 1 + Math.floor(Math.random() * 20);
    const cha = effStat("charisma");
    const total = d20 + cha;
    const ok = total >= T.textDC;
    const gain = ok ? T.textReward : total >= T.textDC - 5 ? 1 : 0;
    adjustBar(id, "affection", gain);
    state.textedToday[id] = true;
    renderResult({
      title: "Sent",
      roll: { d20, stat: `CHA ${cha}`, vibe: 0, vibeNote: "", total, dc: T.textDC },
      lines: [ok ? `${c.name} texts back fast. Easy banter.` : gain ? `${c.name} replies, eventually.` : "Left on read. Ouch.", `Affection +${gain}`],
      tone: ok ? "good" : gain ? "neutral" : "bad",
      then: () => renderPhone(back),
    });
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
  function startConvo(id, locId, party) {
    state.convo = { id, locId, beat: 0, momentum: 0, party: !!party };
    renderConvoBeat();
  }
  function renderConvoBeat() {
    renderHud(); clearScreen();
    const cv = state.convo, c = D.CHARACTERS[cv.id], mood = moodOf(cv.id);
    const w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `${c.emoji} ${c.name}`));
    w.appendChild(el("p", "char-line", line(pickN(D.LINES[mood].open, 1)[0], c.name)));
    w.appendChild(el("p", "talk-prompt", "You —"));
    const opts = el("div", "choices");
    for (const r of pickN(D.RESPONSES, 3))
      opts.appendChild(button(`${r.text}`, () => resolveBeat(r), "choice"));
    opts.appendChild(button(D.MOVE.text, () => resolveMove(), "choice move"));
    if (cv.beat === 0) opts.appendChild(button("Back off", () => { state.convo = null; renderLocation(cv.locId); }, "choice subtle"));
    w.appendChild(opts); screen().appendChild(w);
  }
  function tierOf(d20, total, dc) {
    const m = total - dc;
    if (d20 === 20 || m >= 10) return "crit";
    if (m >= 0) return "success";
    if (d20 === 1 || m <= -8) return "fail";
    return "partial";
  }
  function resolveBeat(r) {
    const cv = state.convo, c = D.CHARACTERS[cv.id], mood = moodOf(cv.id);
    const d20 = 1 + Math.floor(Math.random() * 20);
    const sv = effStat(r.stat);
    const { v, note } = vibeFor(c, r.style, cv.party);
    const total = d20 + sv + v;
    const dc = Math.round(T.baseDC + composite(cv.id) * T.dcPerInterest);
    const tier = tierOf(d20, total, dc);
    let bd = T.beatBar[tier];
    if (r.stat === c.likedStat && bd > 0) bd += T.likedStatBonus;
    adjustBar(cv.id, r.bar, bd);
    if (bd > 0 && r.bar !== "affection") adjustBar(cv.id, "affection", T.beatAffSpill);
    cv.momentum += T.beatMomentum[tier];
    const last = cv.beat + 1 >= 2;
    renderResult({
      title: tier === "crit" ? "That lands hard" : tier === "success" ? "Good beat" : tier === "partial" ? "Lukewarm" : "Misfire",
      roll: { d20, stat: `${D.STAT_SHORT[r.stat]} ${sv}`, vibe: v, vibeNote: note, total, dc },
      lines: [
        line(pickN(D.LINES[mood][tier], 1)[0], c.name),
        `${D.BAR_LABEL[r.bar]} ${bd >= 0 ? "+" : ""}${bd}${bd > 0 && r.bar !== "affection" ? `, Affection +${T.beatAffSpill}` : ""}  ·  momentum ${cv.momentum >= 0 ? "+" : ""}${cv.momentum}`,
      ],
      tone: tier === "fail" ? "bad" : tier === "partial" ? "neutral" : "good",
      then: () => { if (last) renderCapstone(); else { cv.beat += 1; renderConvoBeat(); } },
      thenLabel: last ? "Where to take it" : "Keep going",
    });
  }
  function resolveMove() {
    const cv = state.convo, c = D.CHARACTERS[cv.id];
    const comp = composite(cv.id);
    const d20 = 1 + Math.floor(Math.random() * 20);
    const cha = effStat("charisma");
    const { v, note } = vibeFor(c, D.MOVE.style, cv.party);
    const total = d20 + cha + v;
    const dc = Math.round(T.moveBaseDC + (comp < 60 ? (60 - comp) * T.movePerInterestMissing : 0));
    const ok = d20 !== 1 && (d20 === 20 || total >= dc);
    let lines, tone, title;
    if (ok) {
      adjustBar(cv.id, "romance", T.moveReward.romance);
      adjustBar(cv.id, "attraction", 3);
      const hot = barVal(cv.id, "romance") >= T.kissMinRomance && !state.milestones[cv.id].kiss;
      if (hot) { state.milestones[cv.id].kiss = true; adjustBar(cv.id, "attraction", 4); }
      title = "She meets you there";
      lines = [hot ? `It tips over. ${c.name} closes the gap and kisses you back.` : `${c.name} leans in. The temperature jumps.`,
        `Romance +${T.moveReward.romance}${hot ? " · first kiss 💋" : ""}`];
      tone = "good";
    } else {
      adjustBar(cv.id, "romance", T.moveFail.romance);
      adjustBar(cv.id, "affection", T.moveFail.affection);
      title = "Too much, too soon";
      lines = [`${c.name} pulls back. "Whoa — slow down."`, `Romance ${T.moveFail.romance} · Affection ${T.moveFail.affection}`];
      tone = "bad";
    }
    renderResult({ title, roll: { d20, stat: `CHA ${cha}`, vibe: v, vibeNote: note, total, dc }, lines, tone, then: renderCapstone, thenLabel: "Where to take it" });
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
    const fav = c.favoriteGift === itemId;
    const val = Math.round(it.value * (fav ? T.favoriteGiftMult : 1));
    adjustBar(cv.id, "affection", val);
    adjustBar(cv.id, "romance", Math.round(val * T.giftRomanceShare));
    renderResult({
      title: fav ? `${c.name} is thrilled` : `${c.name} appreciates it`,
      lines: [fav ? "That's exactly her thing. She lights up." : "A kind, well-received gesture.", `Affection +${val} · Romance +${Math.round(val * T.giftRomanceShare)}`],
      tone: "good", then: renderCapstone, thenLabel: "Back to her",
    });
  }
  function resolvePursue(kind) {
    const cv = state.convo, c = D.CHARACTERS[cv.id];
    const comp = composite(cv.id), rom = barVal(cv.id, "romance"), atr = barVal(cv.id, "attraction");
    const cha = effStat("charisma"), fit = fitOf(c);
    const d20 = 1 + Math.floor(Math.random() * 20);
    let total, dc, ok, title, lines, tone;
    if (kind === "number") {
      total = d20 + cha + Math.floor(comp / 8) + cv.momentum + fit;
      dc = T.numberDC; ok = d20 !== 1 && (d20 === 20 || total >= dc);
      if (ok) { state.milestones[cv.id].number = true; adjustBar(cv.id, "affection", T.numberReward.affection); title = "Got the number"; lines = [`${c.name}: "Use it."`, `Affection +${T.numberReward.affection}`]; tone = "good"; }
      else { adjustBar(cv.id, "affection", T.numberFail.affection); title = "Deflected"; lines = [`${c.name}: "Maybe when I know you better."`, `Affection ${T.numberFail.affection}`]; tone = "bad"; }
    } else {
      total = d20 + cha + Math.floor(rom / 8) + Math.floor(atr / 10) + cv.momentum;
      dc = T.kissDC; ok = d20 !== 1 && (d20 === 20 || total >= dc);
      if (ok) { state.milestones[cv.id].kiss = true; adjustBar(cv.id, "romance", T.kissReward.romance); adjustBar(cv.id, "attraction", T.kissReward.attractionEvent); title = "She leans in"; lines = ["Time slows. It lands.", `Romance +${T.kissReward.romance} · Attraction +${T.kissReward.attractionEvent}`]; tone = "good"; }
      else { adjustBar(cv.id, "romance", T.kissFail.romance); adjustBar(cv.id, "affection", T.kissFail.affection); title = "She turns her cheek"; lines = ["Too soon. The air goes brittle.", `Romance ${T.kissFail.romance} · Affection ${T.kissFail.affection}`]; tone = "bad"; }
    }
    renderResult({ title, roll: { d20, stat: `CHA ${cha}`, extra: `+ situ ${total - d20 - cha}`, total, dc }, lines, tone, then: endConvo, thenLabel: "Continue" });
  }
  function endConvo() {
    const cv = state.convo; if (!cv) return advancePhase();
    state.metCount[cv.id] += 1;
    const revealed = state.metCount[cv.id] === T.revealHintAfter;
    const c = D.CHARACTERS[cv.id];
    const party = !cv.party && D.LOCATIONS[cv.locId] && D.LOCATIONS[cv.locId].social && maybeParty();
    state.convo = null;
    if (revealed || party)
      renderResult({ title: "Later…", lines: [revealed ? `You're reading her now: ${c.hint}` : null, party ? "📨 You picked up a house-party invite." : null].filter(Boolean), tone: "good" });
    else advancePhase();
  }

  // ---------- dates ----------
  function renderDatePicker(id) {
    state.convo = null;
    renderHud(); clearScreen();
    const c = D.CHARACTERS[id];
    const w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `Take ${c.name} where?`));
    w.appendChild(el("p", "subtitle", "The place sets the mood. Your choices on the date do the rest."));
    const o = el("div", "choices");
    for (const [lid, loc] of Object.entries(D.LOCATIONS)) {
      if (!loc.dateSpot || !D.DATE_SCENES[lid]) continue;
      o.appendChild(button(`${loc.emoji} ${loc.name}`, () => startDate(id, lid), "choice"));
    }
    o.appendChild(button("Not now", () => advancePhase(), "choice subtle"));
    w.appendChild(o); screen().appendChild(w);
  }
  function startDate(id, loc) {
    state.date = { id, loc, beat: 0, picks: [] };
    renderDateBeat();
  }
  function renderDateBeat() {
    renderHud(); clearScreen();
    const dt = state.date, c = D.CHARACTERS[dt.id], scene = D.DATE_SCENES[dt.loc];
    const w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `🍷 Date with ${c.name} · ${D.LOCATIONS[dt.loc].name}`));
    if (dt.beat === 0) w.appendChild(el("p", "char-line", scene.intro));
    const b = scene.beats[dt.beat];
    w.appendChild(el("p", "talk-prompt", b.q));
    const o = el("div", "choices");
    for (const opt of b.opts) o.appendChild(button(opt.text, () => { dt.picks.push(opt); dt.beat += 1; if (dt.beat >= scene.beats.length) resolveDate(); else renderDateBeat(); }, "choice"));
    w.appendChild(o); screen().appendChild(w);
  }
  function resolveDate() {
    const dt = state.date, id = dt.id, c = D.CHARACTERS[id];
    let score = 0, magSum = 0;
    const detail = [];
    for (const p of dt.picks) {
      const aff = c.traitAffinity[p.trait] || 0;
      score += aff * p.mag; magSum += p.mag;
      detail.push(`${p.text} — ${aff > 0 ? "she loved that" : aff < 0 ? "not her thing" : "neutral"}`);
    }
    const q = magSum ? score / magSum : 0; // ~ -2 .. +3
    const romGain = Math.round(T.dateRomance + q * 4);
    const affGain = Math.round(T.dateAffection + q * 3);
    adjustBar(id, "romance", romGain);
    adjustBar(id, "affection", affGain);
    if (q > 0.5) adjustBar(id, "attraction", T.dateAttractionEvent);
    state.milestones[id].dates += 1;
    state.date = null;
    renderResult({
      title: q > 1 ? "A great night" : q > 0 ? "A nice date" : q > -0.5 ? "An okay date" : "That fell flat",
      lines: detail.concat([`Romance ${romGain >= 0 ? "+" : ""}${romGain} · Affection ${affGain >= 0 ? "+" : ""}${affGain}${q > 0.5 ? " · Attraction +" + T.dateAttractionEvent : ""}`]),
      tone: q > 0 ? "good" : q > -0.5 ? "neutral" : "bad",
      then: () => { state.metCount[id] += 1; advancePhase(); },
    });
  }

  // ---------- party ----------
  function renderParty() {
    renderHud(); clearScreen();
    const w = el("div", "location");
    w.appendChild(el("h2", null, "🎉 House Party"));
    w.appendChild(el("p", "subtitle", "Sticky floors, good music, everyone you know in one place."));
    if (!state.partyEventDone) {
      w.appendChild(el("p", "party-note", "Someone shoves a drink at you the second you walk in."));
      const ev = el("div", "choices");
      ev.appendChild(button("Take it (CHA/STY up, INT down)", () => { state.partyEventDone = true; state.buffs.push({ stat: "charisma", amount: 4, phasesLeft: 1 }, { stat: "style", amount: 3, phasesLeft: 1 }, { stat: "intelligence", amount: -3, phasesLeft: 1 }); renderParty(); }, "primary"));
      ev.appendChild(button("Wave it off", () => { state.partyEventDone = true; renderParty(); }, "choice"));
      w.appendChild(ev); screen().appendChild(w); return;
    }
    const o = el("div", "choices");
    for (const id of Object.keys(D.CHARACTERS)) {
      const c = D.CHARACTERS[id];
      o.appendChild(button(`Talk to ${c.name}`, () => startConvo(id, "party", true), "primary"));
    }
    for (const id of Object.keys(D.CHARACTERS)) {
      const c = D.CHARACTERS[id];
      o.appendChild(button(`Pull ${c.name} onto the floor (dance)`, () => partyDance(id), "choice"));
    }
    for (const id of Object.keys(D.CHARACTERS)) {
      const c = D.CHARACTERS[id];
      o.appendChild(button(`Bring ${c.name} a drink`, () => partyBuyHer(id), "choice"));
    }
    o.appendChild(button("Join the party game", () => partyGame(), "choice"));
    o.appendChild(button("Slip out (skip)", () => advancePhase(), "choice subtle"));
    w.appendChild(o); screen().appendChild(w);
  }
  function partyDance(id) {
    const c = D.CHARACTERS[id];
    const d20 = 1 + Math.floor(Math.random() * 20);
    const sv = Math.max(effStat("style"), effStat("charisma"));
    const total = d20 + sv + T.partyVibe;
    const dc = 12;
    const tier = tierOf(d20, total, dc);
    const rd = { crit: 12, success: 7, partial: 2, fail: -3 }[tier];
    adjustBar(id, "romance", rd);
    adjustBar(id, "libido", Math.max(0, Math.round(rd / 2)));
    renderResult({
      title: tier === "fail" ? "Out of sync" : tier === "crit" ? "You two own the floor" : "Good on the floor",
      roll: { d20, stat: `max(STY,CHA) ${sv}`, vibe: T.partyVibe, vibeNote: "party buzz", total, dc },
      lines: [tier === "fail" ? `${c.name} laughs it off and drifts away.` : `${c.name} stays close, breathing hard, grinning.`, `Romance ${rd >= 0 ? "+" : ""}${rd}`],
      tone: tier === "fail" ? "bad" : "good",
    });
  }
  function partyBuyHer(id) {
    const c = D.CHARACTERS[id];
    adjustBar(id, "libido", T.partyDrinkLibido);
    adjustBar(id, "romance", 4);
    adjustBar(id, "affection", 2);
    renderResult({ title: `${c.name} clinks your glass`, lines: [`"You read my mind." She's looser now.`, `Libido +${T.partyDrinkLibido} · Romance +4 · Affection +2`], tone: "good" });
  }
  function partyGame() {
    const ids = Object.keys(D.CHARACTERS);
    const id = ids[Math.floor(Math.random() * ids.length)];
    const c = D.CHARACTERS[id];
    const prompt = pickN(D.PARTY_GAME.prompts, 1)[0];
    const d20 = 1 + Math.floor(Math.random() * 20);
    const cha = effStat("charisma");
    const total = d20 + cha + T.partyVibe;
    const tier = tierOf(d20, total, 13);
    const rd = { crit: 10, success: 6, partial: 1, fail: -4 }[tier];
    adjustBar(id, "romance", rd);
    if (rd > 0) adjustBar(id, "affection", 2);
    renderResult({
      title: "Party game",
      roll: { d20, stat: `CHA ${cha}`, vibe: T.partyVibe, vibeNote: "party buzz", total, dc: 13 },
      lines: [`${prompt} ${c.name}.`, tier === "fail" ? "It gets awkward fast." : tier === "crit" ? "The whole room loses it — and she's looking at you." : "Laughs all around.", `${c.name}: Romance ${rd >= 0 ? "+" : ""}${rd}${rd > 0 ? " · Affection +2" : ""}`],
      tone: tier === "fail" ? "bad" : "good",
    });
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
      state.bars = p.bars || base.bars;
      for (const id of Object.keys(D.CHARACTERS)) state.bars[id] = Object.assign(freshBars(id), p.bars && p.bars[id]);
      state.metCount = Object.assign({ aiko: 0, bianca: 0 }, p.metCount);
      state.milestones = Object.assign(base.milestones, p.milestones || {});
      state.inventory = p.inventory || {};
      state.buffs = Array.isArray(p.buffs) ? p.buffs : [];
      state.textedToday = Object.assign({ aiko: false, bianca: false }, p.textedToday);
      state.convo = null; state.date = null;
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
