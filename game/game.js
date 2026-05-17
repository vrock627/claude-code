(function () {
  const D = window.GAMEDATA;
  const T = D.TUNING;
  const SAVE_KEY = "lifeSimSave_v2";

  let state = null;

  function freshState(backgroundId) {
    const bg = D.BACKGROUNDS[backgroundId];
    return {
      background: backgroundId,
      stats: Object.assign({}, bg.stats),
      day: 1,
      phaseIndex: 0,
      money: T.startMoney,
      affection: { aiko: 0, bianca: 0 },
      metCount: { aiko: 0, bianca: 0 },
      inventory: {},
      owned: { phone: false },
      buffs: [],
      milestones: {
        aiko: { number: false, kiss: false, dates: 0 },
        bianca: { number: false, kiss: false, dates: 0 },
      },
      textedToday: { aiko: false, bianca: false },
      partyPending: false,
      partyEventDone: false,
      convo: null,
    };
  }

  // ---- helpers ----
  const phaseName = () => D.PHASES[state.phaseIndex];
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

  function effStat(s) {
    let v = state.stats[s];
    for (const b of state.buffs) if (b.stat === s) v += b.amount;
    return v;
  }

  function stageFor(aff) {
    let s = D.STAGES[0].name;
    for (const t of D.STAGES) if (aff >= t.min) s = t.name;
    return s;
  }

  function isParty() {
    return state.partyPending && phaseName() === "Night";
  }

  function presentAt(locId) {
    if (isParty()) return locId === "club" ? Object.keys(D.CHARACTERS) : [];
    const here = [];
    for (const [id, c] of Object.entries(D.CHARACTERS)) {
      if (c.schedule[phaseName()] === locId) here.push(id);
    }
    return here;
  }

  function maybeParty() {
    if (state.partyPending) return false;
    if (Math.random() < T.partyInviteChance) {
      state.partyPending = true;
      return true;
    }
    return false;
  }

  function advancePhase() {
    state.convo = null;
    state.buffs = state.buffs
      .map((b) => ({ ...b, phasesLeft: b.phasesLeft - 1 }))
      .filter((b) => b.phasesLeft > 0);
    state.phaseIndex += 1;
    if (state.phaseIndex >= D.PHASES.length) {
      state.phaseIndex = 0;
      state.day += 1;
      state.money += T.dailyAllowance;
      state.textedToday = { aiko: false, bianca: false };
      state.partyPending = false;
      state.partyEventDone = false;
    }
    renderPhase();
  }

  // ---- DOM ----
  const screen = () => document.getElementById("screen");
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function button(label, onClick, cls, disabled) {
    const b = el("button", cls || "choice", label);
    if (disabled) b.disabled = true;
    else b.addEventListener("click", onClick);
    return b;
  }
  const clearScreen = () => (screen().innerHTML = "");

  // ---- HUD ----
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
    if (state.owned.phone) right.appendChild(el("span", "chip", "📱"));
    top.appendChild(right);
    hud.appendChild(top);

    const statWrap = el("div", "stat-chips");
    for (const s of D.STATS) {
      const e = effStat(s);
      const buffed = e !== state.stats[s];
      const chip = el("span", buffed ? "chip buffed" : "chip");
      chip.textContent = `${D.STAT_SHORT[s]} ${e}${buffed ? ` (${state.stats[s]})` : ""}`;
      statWrap.appendChild(chip);
    }
    hud.appendChild(statWrap);

    if (state.buffs.length) {
      const bw = el("div", "buffs");
      for (const b of state.buffs) {
        bw.appendChild(
          el("span", "buff", `${D.STAT_SHORT[b.stat]} +${b.amount} · ${b.phasesLeft}p`)
        );
      }
      hud.appendChild(bw);
    }

    const people = el("div", "people");
    for (const [id, c] of Object.entries(D.CHARACTERS)) {
      const aff = state.affection[id];
      const m = state.milestones[id];
      const card = el("div", "person");
      const marks = `${m.number ? " ☎" : ""}${m.dates ? ` 💞${m.dates}` : ""}${m.kiss ? " 💋" : ""}`;
      card.appendChild(el("div", "person-name", `${c.emoji} ${c.name}${marks}`));
      card.appendChild(el("div", "person-stage", `${stageFor(aff)} · ${aff}/${T.affectionCap}`));
      const bar = el("div", "bar");
      const fill = el("div", "fill");
      fill.style.width = `${(aff / T.affectionCap) * 100}%`;
      bar.appendChild(fill);
      card.appendChild(bar);
      if (state.metCount[id] >= T.revealHintAfter) {
        card.appendChild(el("div", "person-hint", `Likes ${D.STAT_LABEL[c.likedStat]}. ${c.hint}`));
      } else {
        card.appendChild(el("div", "person-hint dim", "Talk to her a few times to learn what she likes…"));
      }
      people.appendChild(card);
    }
    hud.appendChild(people);
  }

  // ---- Title / Create ----
  function renderTitle() {
    state = null;
    renderHud();
    clearScreen();
    const w = el("div", "title");
    w.appendChild(el("h1", null, "Heartbeat City"));
    w.appendChild(el("p", "subtitle",
      "A tiny life-sim. Build yourself, earn a living, win someone over. No clock, no endings — just the long game."));
    const btns = el("div", "title-buttons");
    btns.appendChild(button("New Game", renderCreate, "primary"));
    const cont = button("Continue", () => { if (loadGame()) renderPhase(); }, "choice");
    if (!hasSave()) cont.disabled = true;
    btns.appendChild(cont);
    w.appendChild(btns);
    screen().appendChild(w);
  }

  function renderCreate() {
    clearScreen();
    const w = el("div", "create");
    w.appendChild(el("h2", null, "Who are you?"));
    w.appendChild(el("p", "subtitle", "Your background sets your starting stats. Everything after that, you earn."));
    const grid = el("div", "bg-grid");
    for (const [id, bg] of Object.entries(D.BACKGROUNDS)) {
      const card = el("div", "bg-card");
      card.appendChild(el("div", "bg-emoji", bg.emoji));
      card.appendChild(el("div", "bg-name", bg.name));
      card.appendChild(el("div", "bg-blurb", bg.blurb));
      const st = el("div", "bg-stats");
      for (const s of D.STATS) st.appendChild(el("span", "chip", `${D.STAT_SHORT[s]} ${bg.stats[s]}`));
      card.appendChild(st);
      card.appendChild(button("Choose", () => {
        state = freshState(id);
        saveGame();
        renderPhase();
      }, "primary"));
      grid.appendChild(card);
    }
    w.appendChild(grid);
    screen().appendChild(w);
  }

  // ---- Day / phase ----
  function renderPhase() {
    saveGame();
    renderHud();
    clearScreen();
    const w = el("div", "phase");
    w.appendChild(el("h2", null, `Day ${state.day} — ${phaseName()}`));
    w.appendChild(el("p", "subtitle", "Where to? One thing per part of the day."));
    const grid = el("div", "loc-grid");
    for (const [id, loc] of Object.entries(D.LOCATIONS)) {
      const here = presentAt(id);
      const partyHere = isParty() && id === "club";
      const card = el("div", partyHere ? "loc-card party" : "loc-card");
      card.appendChild(el("div", "loc-emoji", loc.emoji));
      card.appendChild(el("div", "loc-name", partyHere ? `${loc.name} — Party!` : loc.name));
      card.appendChild(el("div", "loc-blurb", loc.blurb));
      const who = here.length
        ? here.map((h) => `${D.CHARACTERS[h].emoji} ${D.CHARACTERS[h].name}`).join(", ")
        : loc.home ? "Phone, bag, rest" : "No one you know";
      card.appendChild(el("div", "loc-who", who));
      card.appendChild(button("Go", () => renderLocation(id), "primary"));
      grid.appendChild(card);
    }
    w.appendChild(grid);
    w.appendChild(button(`Open bag${invCount() ? ` (${invCount()})` : ""}`, () => renderBag(renderPhase), "choice subtle"));
    screen().appendChild(w);
  }

  function invCount() {
    return Object.values(state.inventory).reduce((a, b) => a + b, 0);
  }

  // ---- Location ----
  function renderLocation(locId) {
    const loc = D.LOCATIONS[locId];
    if (loc.home) return renderHome();
    if (isParty() && locId === "club" && !state.partyEventDone) return renderPartyEvent(locId);

    renderHud();
    clearScreen();
    const w = el("div", "location");
    const party = isParty() && locId === "club";
    w.appendChild(el("h2", null, `${loc.emoji} ${loc.name}${party ? " — Party!" : ""}`));
    w.appendChild(el("p", "subtitle", loc.blurb));
    if (party) w.appendChild(el("p", "party-note", "Loud, buzzing, everyone here. Bold moves land; deep talk doesn't."));

    const opts = el("div", "choices");
    for (const id of presentAt(locId)) {
      const c = D.CHARACTERS[id];
      opts.appendChild(button(`Talk to ${c.name}`, () => startConvo(id, locId), "primary"));
    }
    if (loc.action) {
      const a = loc.action;
      opts.appendChild(button(`${a.label}  (+${a.gain} ${D.STAT_SHORT[a.stat]})`,
        () => doEnvironment(locId), "choice"));
    }
    if (loc.work) {
      opts.appendChild(button(`${loc.work.label}  (+$${loc.work.wage})`,
        () => doWork(locId), "choice"));
    }
    if (D.SHOPS[locId]) {
      opts.appendChild(button("Browse the shop", () => renderShop(locId), "choice"));
    }
    opts.appendChild(button(`Open bag${invCount() ? ` (${invCount()})` : ""}`,
      () => renderBag(() => renderLocation(locId)), "choice subtle"));
    opts.appendChild(button("Head out (skip)", () => advancePhase(), "choice subtle"));
    w.appendChild(opts);
    screen().appendChild(w);
  }

  function doEnvironment(locId) {
    const loc = D.LOCATIONS[locId];
    const a = loc.action;
    state.stats[a.stat] = clamp(state.stats[a.stat] + a.gain, 0, T.statCap);
    const lines = [a.text];
    if (loc.social && maybeParty()) lines.push("📨 Someone slid you a party invite — tonight at Neon Club.");
    renderResult({ title: "Time well spent", lines, tone: "good" });
  }

  function doWork(locId) {
    const wk = D.LOCATIONS[locId].work;
    state.money += wk.wage;
    renderResult({ title: "Shift done", lines: [wk.text, `+$${wk.wage} → $${state.money}`], tone: "good" });
  }

  // ---- Home / phone ----
  function renderHome() {
    renderHud();
    clearScreen();
    const w = el("div", "location");
    w.appendChild(el("h2", null, "🏠 Home"));
    w.appendChild(el("p", "subtitle", "Quiet. You could make some calls, or just crash."));
    const opts = el("div", "choices");
    if (state.owned.phone) {
      opts.appendChild(button("Use your phone", renderPhone, "primary"));
    } else {
      opts.appendChild(button("Use your phone — buy one at the Mall first", null, "choice", true));
    }
    opts.appendChild(button(`Open bag${invCount() ? ` (${invCount()})` : ""}`,
      () => renderBag(renderHome), "choice"));
    opts.appendChild(button("Rest (skip to next phase)", () => advancePhase(), "choice subtle"));
    w.appendChild(opts);
    screen().appendChild(w);
  }

  function renderPhone() {
    renderHud();
    clearScreen();
    const w = el("div", "location");
    w.appendChild(el("h2", null, "📱 Phone"));
    const contacts = Object.keys(D.CHARACTERS).filter((id) => state.milestones[id].number);
    if (!contacts.length) {
      w.appendChild(el("p", "subtitle", "No numbers yet. Get someone's number in person first."));
    } else {
      w.appendChild(el("p", "subtitle", "Texting gives a small daily nudge. Schedules help you find her."));
    }
    const list = el("div", "choices");
    for (const id of contacts) {
      const c = D.CHARACTERS[id];
      const card = el("div", "person");
      card.appendChild(el("div", "person-name", `${c.emoji} ${c.name}`));
      const sch = D.PHASES.map((p) => `${p}: ${D.LOCATIONS[c.schedule[p]].name}`).join(" · ");
      card.appendChild(el("div", "person-stage", `Today — ${sch}`));
      if (state.textedToday[id]) {
        card.appendChild(button("Already texted today", null, "choice", true));
      } else {
        card.appendChild(button(`Text ${c.name}`, () => doText(id), "choice"));
      }
      list.appendChild(card);
    }
    w.appendChild(list);
    w.appendChild(button("Back", renderHome, "choice subtle"));
    screen().appendChild(w);
  }

  function doText(charId) {
    const c = D.CHARACTERS[charId];
    const d20 = 1 + Math.floor(Math.random() * 20);
    const cha = effStat("charisma");
    const total = d20 + cha;
    const ok = total >= T.textDC;
    const gain = ok ? T.textReward : total >= T.textDC - 5 ? 1 : 0;
    const before = state.affection[charId];
    state.affection[charId] = clamp(before + gain, 0, T.affectionCap);
    state.textedToday[charId] = true;
    renderResult({
      title: "Sent",
      roll: { d20, stat: `CHA ${cha}`, vibe: 0, vibeNote: "", total, dc: T.textDC },
      lines: [
        ok ? `${c.name} texts back fast. Easy banter.` : gain ? `${c.name} replies, eventually.` : `Left on read. Ouch.`,
        `Affection +${state.affection[charId] - before} → ${state.affection[charId]}`,
      ],
      tone: ok ? "good" : gain ? "neutral" : "bad",
      then: renderPhone,
    });
  }

  // ---- Shop ----
  function renderShop(locId) {
    renderHud();
    clearScreen();
    const w = el("div", "location");
    w.appendChild(el("h2", null, `🛒 ${D.LOCATIONS[locId].name} — Shop`));
    w.appendChild(el("p", "subtitle", `You have $${state.money}.`));
    const list = el("div", "choices");
    for (const itemId of D.SHOPS[locId]) {
      const it = D.ITEMS[itemId];
      const owned = itemId === "phone" && state.owned.phone;
      const card = el("div", "shop-item");
      card.appendChild(el("div", "person-name", `${it.emoji} ${it.name} — $${it.price}`));
      card.appendChild(el("div", "shop-desc", it.desc));
      if (owned) card.appendChild(button("Already owned", null, "choice", true));
      else if (state.money < it.price) card.appendChild(button(`Can't afford ($${it.price})`, null, "choice", true));
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
    if (it.type === "permStat") {
      state.stats[it.stat] = clamp(state.stats[it.stat] + it.amount, 0, T.statCap);
      note = `+${it.amount} ${D.STAT_SHORT[it.stat]} (permanent).`;
    } else if (it.type === "tool") {
      state.owned.phone = true;
      note = "Phone activated. Texting and date plans unlocked.";
    } else {
      state.inventory[itemId] = (state.inventory[itemId] || 0) + 1;
      note = it.type === "gift" ? "Tucked away for the right moment." : "In your bag — use it when it counts.";
    }
    renderResult({
      title: `Bought ${it.name}`,
      lines: [note, `$${state.money} left.`],
      tone: "good",
      then: () => renderShop(locId),
    });
  }

  // ---- Bag ----
  function renderBag(back) {
    renderHud();
    clearScreen();
    const w = el("div", "location");
    w.appendChild(el("h2", null, "🎒 Bag"));
    w.appendChild(el("p", "subtitle", `$${state.money}${state.owned.phone ? " · 📱 phone" : ""}`));
    const ids = Object.keys(state.inventory).filter((k) => state.inventory[k] > 0);
    if (!ids.length) {
      w.appendChild(el("p", "result-line", "Empty. Shops are at the gym, café, library, park and mall."));
    }
    const list = el("div", "choices");
    for (const id of ids) {
      const it = D.ITEMS[id];
      const n = state.inventory[id];
      const card = el("div", "shop-item");
      card.appendChild(el("div", "person-name", `${it.emoji} ${it.name} ×${n}`));
      card.appendChild(el("div", "shop-desc", it.desc));
      if (it.type === "tempStat") {
        card.appendChild(button("Use now", () => useTemp(id, back), "choice"));
      } else if (it.type === "gift") {
        card.appendChild(button("Give during a conversation", null, "choice", true));
      }
      list.appendChild(card);
    }
    w.appendChild(list);
    w.appendChild(button("Back", back, "choice subtle"));
    screen().appendChild(w);
  }

  function useTemp(itemId, back) {
    const it = D.ITEMS[itemId];
    state.inventory[itemId] -= 1;
    state.buffs.push({ stat: it.stat, amount: it.amount, phasesLeft: it.phases });
    renderResult({
      title: `Used ${it.name}`,
      lines: [`+${it.amount} ${D.STAT_SHORT[it.stat]} for ${it.phases} phase(s).`],
      tone: "good",
      then: back,
    });
  }

  // ---- Party event ----
  function renderPartyEvent(locId) {
    renderHud();
    clearScreen();
    const w = el("div", "result tone-neutral");
    w.appendChild(el("h2", null, "🍸 At the door"));
    w.appendChild(el("p", "result-line", "A stranger presses a drink into your hand. “It's a party, relax!”"));
    const opts = el("div", "choices");
    opts.appendChild(button("Take the drink (bolder, fuzzier)", () => {
      state.partyEventDone = true;
      state.buffs.push({ stat: "charisma", amount: 4, phasesLeft: 1 });
      state.buffs.push({ stat: "style", amount: 4, phasesLeft: 1 });
      state.buffs.push({ stat: "intelligence", amount: -3, phasesLeft: 1 });
      renderResult({
        title: "Liquid courage",
        lines: ["+4 CHA, +4 STY, −3 INT for this phase. Go get 'em."],
        tone: "good",
        then: () => renderLocation(locId),
      });
    }, "primary"));
    opts.appendChild(button("Stay sharp, decline", () => {
      state.partyEventDone = true;
      renderLocation(locId);
    }, "choice"));
    w.appendChild(opts);
    screen().appendChild(w);
  }

  // ---- Conversation ----
  function convoVibe(c, approach) {
    let vibe = 0;
    const notes = [];
    if (approach.style === c.likedStyle) { vibe += T.likedStyleBonus; notes.push("her energy"); }
    else if (approach.style === c.dislikedStyle) { vibe -= T.dislikedStylePenalty; notes.push("not her style"); }
    if (isParty()) {
      vibe += T.partyVibe; notes.push("party buzz");
      if (approach.style === "thoughtful") { vibe -= T.partyLoud; notes.push("too loud to go deep"); }
    }
    return { vibe, note: notes.join(", ") || "neutral read" };
  }

  function startConvo(charId, locId) {
    state.convo = { char: charId, locId, beat: 0, momentum: 0 };
    renderBeat();
  }

  function renderBeat() {
    renderHud();
    clearScreen();
    const cv = state.convo;
    const c = D.CHARACTERS[cv.char];
    const w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `${c.emoji} ${c.name}`));
    if (cv.beat === 0) w.appendChild(el("p", "subtitle", c.blurb));
    w.appendChild(el("p", "talk-prompt", D.CONVO.prompts[cv.beat]));
    const opts = el("div", "choices");
    for (const ap of D.APPROACHES) {
      opts.appendChild(button(`${ap.label}  (rolls ${D.STAT_SHORT[ap.stat]})`,
        () => resolveBeat(ap), "choice"));
    }
    if (cv.beat === 0) {
      opts.appendChild(button("Back off", () => { state.convo = null; renderLocation(cv.locId); }, "choice subtle"));
    }
    w.appendChild(opts);
    screen().appendChild(w);
  }

  function resolveBeat(approach) {
    const cv = state.convo;
    const c = D.CHARACTERS[cv.char];
    const statVal = effStat(approach.stat);
    const d20 = 1 + Math.floor(Math.random() * 20);
    const { vibe, note } = convoVibe(c, approach);
    const total = d20 + statVal + vibe;
    const dc = Math.round(T.baseDC + state.affection[cv.char] * T.dcPerAffection);
    const margin = total - dc;

    let tier;
    if (d20 === 20 || margin >= 10) tier = "crit";
    else if (margin >= 0) tier = "success";
    else if (d20 === 1 || margin <= -8) tier = "fail";
    else tier = "partial";

    let delta = T.beatDelta[tier];
    if (approach.stat === c.likedStat && delta > 0) delta += T.likedStatBonusAffection;
    cv.momentum += T.beatMomentum[tier];

    const before = state.affection[cv.char];
    state.affection[cv.char] = clamp(before + delta, 0, T.affectionCap);
    const realDelta = state.affection[cv.char] - before;

    const flavor = {
      crit: `${c.name} lights up — that really landed.`,
      success: `${c.name} warms to it.`,
      partial: `A polite half-smile. Didn't quite land.`,
      fail: `${c.name} cools. Misread.`,
    }[tier];

    const last = cv.beat + 1 >= D.CONVO.beats;
    renderResult({
      title: tier === "crit" ? "Nailed it" : tier === "success" ? "Good beat" : tier === "partial" ? "Lukewarm" : "Backfired",
      roll: { d20, stat: `${D.STAT_SHORT[approach.stat]} ${statVal}`, vibe, vibeNote: note, total, dc },
      lines: [
        flavor,
        `Affection ${realDelta >= 0 ? "+" : ""}${realDelta} → ${state.affection[cv.char]}  ·  momentum ${cv.momentum >= 0 ? "+" : ""}${cv.momentum}`,
      ],
      tone: tier === "fail" ? "bad" : tier === "partial" ? "neutral" : "good",
      then: () => { if (last) renderCapstone(); else { cv.beat += 1; renderBeat(); } },
      thenLabel: last ? "Where to take it" : "Keep going",
    });
  }

  function statFit(c) {
    return clamp(Math.floor((effStat(c.likedStat) - 6) / 2), -2, 5);
  }

  function renderCapstone() {
    renderHud();
    clearScreen();
    const cv = state.convo;
    const c = D.CHARACTERS[cv.char];
    const aff = state.affection[cv.char];
    const m = state.milestones[cv.char];
    const haveGift = Object.keys(state.inventory).some(
      (k) => state.inventory[k] > 0 && D.ITEMS[k].type === "gift"
    );

    const w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `${c.emoji} ${c.name}`));
    w.appendChild(el("p", "talk-prompt", "The conversation's warm. What now?"));
    const opts = el("div", "choices");

    opts.appendChild(button("Give her a gift",
      () => renderGiftPicker(), "choice", !haveGift));

    if (!m.number) {
      const ok = aff >= T.numberMinAff;
      opts.appendChild(button(
        ok ? `Ask for her number  (DC ${T.numberDC})` : `Ask for her number  (needs ${T.numberMinAff} affection)`,
        () => resolvePursue("number"), "choice", !ok));
    } else {
      const need = !state.owned.phone ? "needs a phone" : aff < T.dateMinAff ? `needs ${T.dateMinAff} affection` : null;
      opts.appendChild(button(
        need ? `Ask her on a date  (${need})` : `Ask her on a date  (DC ${T.dateDC})`,
        () => resolvePursue("date"), "choice", !!need));
    }

    {
      const ok = aff >= T.kissMinAff;
      opts.appendChild(button(
        ok ? `Go in for a kiss  (DC ${T.kissDC})` : `Go in for a kiss  (needs ${T.kissMinAff} affection)`,
        () => resolvePursue("kiss"), "choice", !ok));
    }

    opts.appendChild(button("Wrap it up warmly", () => {
      const before = state.affection[cv.char];
      state.affection[cv.char] = clamp(before + 1, 0, T.affectionCap);
      renderResult({
        title: "Good talk",
        lines: [`You leave it on a warm note. Affection +${state.affection[cv.char] - before}.`],
        tone: "good",
        then: endConvo,
        thenLabel: "Continue",
      });
    }, "choice subtle"));

    w.appendChild(opts);
    screen().appendChild(w);
  }

  function renderGiftPicker() {
    renderHud();
    clearScreen();
    const cv = state.convo;
    const c = D.CHARACTERS[cv.char];
    const w = el("div", "talk");
    w.appendChild(el("div", "talk-head", `Give ${c.name} something`));
    const opts = el("div", "choices");
    const gifts = Object.keys(state.inventory).filter(
      (k) => state.inventory[k] > 0 && D.ITEMS[k].type === "gift"
    );
    for (const id of gifts) {
      const it = D.ITEMS[id];
      opts.appendChild(button(`${it.emoji} ${it.name} ×${state.inventory[id]}`,
        () => giveGift(id), "choice"));
    }
    opts.appendChild(button("Back", renderCapstone, "choice subtle"));
    w.appendChild(opts);
    screen().appendChild(w);
  }

  function giveGift(itemId) {
    const cv = state.convo;
    const c = D.CHARACTERS[cv.char];
    const it = D.ITEMS[itemId];
    state.inventory[itemId] -= 1;
    const fav = c.favoriteGift === itemId;
    const gain = Math.round(it.value * (fav ? T.favoriteGiftMult : 1));
    const before = state.affection[cv.char];
    state.affection[cv.char] = clamp(before + gain, 0, T.affectionCap);
    renderResult({
      title: fav ? `${c.name} is thrilled` : `${c.name} appreciates it`,
      lines: [
        fav ? `That's exactly her thing. She lights up.` : `A kind, well-received gesture.`,
        `Affection +${state.affection[cv.char] - before} → ${state.affection[cv.char]}`,
      ],
      tone: "good",
      then: renderCapstone,
      thenLabel: "Back to her",
    });
  }

  function resolvePursue(kind) {
    const cv = state.convo;
    const c = D.CHARACTERS[cv.char];
    const aff = state.affection[cv.char];
    const cha = effStat("charisma");
    const fit = statFit(c);
    const affBonus = Math.floor(aff / 8);
    const d20 = 1 + Math.floor(Math.random() * 20);
    const total = d20 + cha + affBonus + cv.momentum + fit;
    const dc = { number: T.numberDC, date: T.dateDC, kiss: T.kissDC }[kind];
    const ok = d20 !== 1 && (d20 === 20 || total >= dc);

    let title, lines, tone;
    const before = aff;
    if (kind === "number") {
      if (ok) {
        state.milestones[cv.char].number = true;
        state.affection[cv.char] = clamp(before + T.numberReward, 0, T.affectionCap);
        title = "Got the number";
        lines = [`${c.name} taps her number into your phone hand. "Use it."`];
        tone = "good";
      } else {
        state.affection[cv.char] = clamp(before + T.numberFail, 0, T.affectionCap);
        title = "Deflected";
        lines = [`${c.name}: "Maybe when I know you better."`];
        tone = "bad";
      }
    } else if (kind === "date") {
      if (ok) {
        state.milestones[cv.char].dates += 1;
        state.affection[cv.char] = clamp(before + T.dateReward, 0, T.affectionCap);
        title = "It's a date";
        lines = [`${c.name} grins. "Pick somewhere good." That went somewhere real.`];
        tone = "good";
      } else {
        state.affection[cv.char] = clamp(before + T.dateFail, 0, T.affectionCap);
        title = "Rain check";
        lines = [`${c.name}: "I'm slammed this week." Stings a little.`];
        tone = "bad";
      }
    } else {
      if (ok) {
        state.milestones[cv.char].kiss = true;
        state.affection[cv.char] = clamp(before + T.kissReward, 0, T.affectionCap);
        title = "She leans in";
        lines = [`Time slows. It lands. ${c.name} doesn't pull away.`];
        tone = "good";
      } else {
        state.affection[cv.char] = clamp(before + T.kissFail, 0, T.affectionCap);
        title = "She turns her cheek";
        lines = [`Too soon. The air goes awkward. That cost you.`];
        tone = "bad";
      }
    }
    lines.push(`Affection ${state.affection[cv.char] - before >= 0 ? "+" : ""}${state.affection[cv.char] - before} → ${state.affection[cv.char]} (${stageFor(state.affection[cv.char])})`);

    renderResult({
      title,
      roll: {
        d20,
        stat: `CHA ${cha}`,
        extra: `+ aff ${affBonus} + mom ${cv.momentum} + fit ${fit}`,
        total,
        dc,
      },
      lines,
      tone,
      then: endConvo,
      thenLabel: "Continue",
    });
  }

  function endConvo() {
    const cv = state.convo;
    state.metCount[cv.char] += 1;
    const revealed = state.metCount[cv.char] === T.revealHintAfter;
    const c = D.CHARACTERS[cv.char];
    const partyMsg = D.LOCATIONS[cv.locId].social && maybeParty();
    state.convo = null;
    if (revealed || partyMsg) {
      renderResult({
        title: "Later…",
        lines: [
          revealed ? `You're reading her now: she likes ${D.STAT_LABEL[c.likedStat]}.` : null,
          partyMsg ? "📨 You picked up a party invite — tonight at Neon Club." : null,
        ].filter(Boolean),
        tone: "good",
      });
    } else {
      advancePhase();
    }
  }

  // ---- Result ----
  function renderResult(p) {
    saveGame();
    renderHud();
    clearScreen();
    const w = el("div", `result tone-${p.tone}`);
    w.appendChild(el("h2", null, p.title));
    if (p.roll) {
      const r = p.roll;
      const box = el("div", "rollbox");
      const sign = !r.vibe ? "" : r.vibe > 0 ? `+ ${r.vibe}` : `− ${Math.abs(r.vibe)}`;
      const vibeTxt = sign ? `${sign} (${r.vibeNote})  ` : "";
      const extra = r.extra ? `${r.extra}  ` : "";
      box.appendChild(el("div", "roll-line",
        `🎲 d20 ${r.d20}  +  ${r.stat}  ${vibeTxt}${extra}=  ${r.total}`));
      box.appendChild(el("div", "roll-line dim", `vs  DC ${r.dc}`));
      w.appendChild(box);
    }
    for (const line of p.lines) w.appendChild(el("p", "result-line", line));
    w.appendChild(button(p.thenLabel || "Continue", p.then || advancePhase, "primary"));
    screen().appendChild(w);
  }

  // ---- Persistence ----
  function saveGame() {
    try { if (state) localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function hasSave() {
    try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
  }
  function loadGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const p = JSON.parse(raw);
      if (!p || !p.background || !D.BACKGROUNDS[p.background]) return false;
      const base = freshState(p.background);
      state = Object.assign(base, p);
      state.stats = Object.assign({}, base.stats, p.stats);
      state.affection = Object.assign({ aiko: 0, bianca: 0 }, p.affection);
      state.metCount = Object.assign({ aiko: 0, bianca: 0 }, p.metCount);
      state.milestones = Object.assign(base.milestones, p.milestones || {});
      state.inventory = p.inventory || {};
      state.owned = Object.assign({ phone: false }, p.owned);
      state.buffs = Array.isArray(p.buffs) ? p.buffs : [];
      state.textedToday = Object.assign({ aiko: false, bianca: false }, p.textedToday);
      state.convo = null;
      return true;
    } catch (e) {
      return false;
    }
  }

  function flash(id, text) {
    const b = document.getElementById(id);
    const o = b.textContent;
    b.textContent = text;
    setTimeout(() => (b.textContent = o), 1100);
  }

  function init() {
    document.getElementById("save-btn").addEventListener("click", () => { saveGame(); flash("save-btn", "Saved ✓"); });
    document.getElementById("load-btn").addEventListener("click", () => {
      if (loadGame()) { renderPhase(); flash("load-btn", "Loaded ✓"); } else flash("load-btn", "No save");
    });
    document.getElementById("reset-btn").addEventListener("click", () => {
      if (!window.confirm("Start over? This clears your save.")) return;
      try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
      renderTitle();
    });
    renderTitle();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
