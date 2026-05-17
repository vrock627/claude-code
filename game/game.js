(function () {
  const D = window.GAMEDATA;
  const SAVE_KEY = "lifeSimSave_v1";

  let state = null;

  function freshState(backgroundId) {
    const bg = D.BACKGROUNDS[backgroundId];
    return {
      background: backgroundId,
      stats: Object.assign({}, bg.stats),
      day: 1,
      phaseIndex: 0,
      affection: { aiko: 0, bianca: 0 },
      metCount: { aiko: 0, bianca: 0 },
    };
  }

  function phaseName() {
    return D.PHASES[state.phaseIndex];
  }

  function advancePhase() {
    state.phaseIndex += 1;
    if (state.phaseIndex >= D.PHASES.length) {
      state.phaseIndex = 0;
      state.day += 1;
    }
    renderPhase();
  }

  function stageFor(affection) {
    let s = D.STAGES[0].name;
    for (const tier of D.STAGES) if (affection >= tier.min) s = tier.name;
    return s;
  }

  function presentAt(locId) {
    const here = [];
    for (const [id, c] of Object.entries(D.CHARACTERS)) {
      if (c.schedule[phaseName()] === locId) here.push(id);
    }
    return here;
  }

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  // ---- DOM helpers ----
  const screen = () => document.getElementById("screen");

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function button(label, onClick, cls) {
    const b = el("button", cls || "choice", label);
    b.addEventListener("click", onClick);
    return b;
  }

  function clearScreen() {
    screen().innerHTML = "";
  }

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
    const statWrap = el("div", "stat-chips");
    for (const s of D.STATS) {
      const chip = el("span", "chip");
      chip.textContent = `${D.STAT_SHORT[s]} ${state.stats[s]}`;
      statWrap.appendChild(chip);
    }
    top.appendChild(statWrap);
    hud.appendChild(top);

    const people = el("div", "people");
    for (const [id, c] of Object.entries(D.CHARACTERS)) {
      const aff = state.affection[id];
      const card = el("div", "person");
      card.appendChild(el("div", "person-name", `${c.emoji} ${c.name}`));
      card.appendChild(el("div", "person-stage", `${stageFor(aff)} · ${aff}/${D.TUNING.affectionCap}`));
      const bar = el("div", "bar");
      const fill = el("div", "fill");
      fill.style.width = `${(aff / D.TUNING.affectionCap) * 100}%`;
      bar.appendChild(fill);
      card.appendChild(bar);
      if (state.metCount[id] >= D.TUNING.revealHintAfter) {
        card.appendChild(
          el("div", "person-hint", `Likes ${D.STAT_LABEL[c.likedStat]}. ${c.hint}`)
        );
      } else {
        card.appendChild(el("div", "person-hint dim", "Talk to her a few times to learn what she likes…"));
      }
      people.appendChild(card);
    }
    hud.appendChild(people);
  }

  // ---- Screens ----
  function renderTitle() {
    state = null;
    renderHud();
    clearScreen();
    const wrap = el("div", "title");
    wrap.appendChild(el("h1", null, "Heartbeat City"));
    wrap.appendChild(el("p", "subtitle", "A tiny life-sim. Build yourself. Win someone over. No clock, no endings — just the long game."));
    const btns = el("div", "title-buttons");
    btns.appendChild(button("New Game", renderCreate, "primary"));
    const cont = button("Continue", () => {
      if (loadGame()) renderPhase();
    }, "choice");
    if (!hasSave()) cont.disabled = true;
    btns.appendChild(cont);
    wrap.appendChild(btns);
    screen().appendChild(wrap);
  }

  function renderCreate() {
    clearScreen();
    const wrap = el("div", "create");
    wrap.appendChild(el("h2", null, "Who are you?"));
    wrap.appendChild(el("p", "subtitle", "Your background sets your starting stats. Everything after that, you earn."));
    const grid = el("div", "bg-grid");
    for (const [id, bg] of Object.entries(D.BACKGROUNDS)) {
      const card = el("div", "bg-card");
      card.appendChild(el("div", "bg-emoji", bg.emoji));
      card.appendChild(el("div", "bg-name", bg.name));
      card.appendChild(el("div", "bg-blurb", bg.blurb));
      const stats = el("div", "bg-stats");
      for (const s of D.STATS) {
        stats.appendChild(el("span", "chip", `${D.STAT_SHORT[s]} ${bg.stats[s]}`));
      }
      card.appendChild(stats);
      card.appendChild(
        button("Choose", () => {
          state = freshState(id);
          saveGame();
          renderPhase();
        }, "primary")
      );
      grid.appendChild(card);
    }
    wrap.appendChild(grid);
    screen().appendChild(wrap);
  }

  function renderPhase() {
    saveGame();
    renderHud();
    clearScreen();
    const wrap = el("div", "phase");
    wrap.appendChild(el("h2", null, `Day ${state.day} — ${phaseName()}`));
    wrap.appendChild(el("p", "subtitle", "Where to? One thing per part of the day."));
    const grid = el("div", "loc-grid");
    for (const [id, loc] of Object.entries(D.LOCATIONS)) {
      const here = presentAt(id);
      const card = el("div", "loc-card");
      card.appendChild(el("div", "loc-emoji", loc.emoji));
      card.appendChild(el("div", "loc-name", loc.name));
      card.appendChild(el("div", "loc-blurb", loc.blurb));
      const who = here.length
        ? here.map((h) => `${D.CHARACTERS[h].emoji} ${D.CHARACTERS[h].name}`).join(", ")
        : "No one you know";
      card.appendChild(el("div", "loc-who", who));
      card.appendChild(button("Go", () => renderLocation(id), "primary"));
      grid.appendChild(card);
    }
    wrap.appendChild(grid);
    screen().appendChild(wrap);
  }

  function renderLocation(locId) {
    renderHud();
    clearScreen();
    const loc = D.LOCATIONS[locId];
    const here = presentAt(locId);
    const wrap = el("div", "location");
    wrap.appendChild(el("h2", null, `${loc.emoji} ${loc.name}`));
    wrap.appendChild(el("p", "subtitle", loc.blurb));

    const opts = el("div", "choices");
    for (const id of here) {
      const c = D.CHARACTERS[id];
      opts.appendChild(button(`Talk to ${c.name}`, () => renderTalk(id, locId), "primary"));
    }
    const a = loc.action;
    opts.appendChild(
      button(`${a.label}  (+1 ${D.STAT_SHORT[a.stat]})`, () => doEnvironment(locId), "choice")
    );
    opts.appendChild(button("Head out (skip)", () => advancePhase(), "choice subtle"));
    wrap.appendChild(opts);
    screen().appendChild(wrap);
  }

  function doEnvironment(locId) {
    const a = D.LOCATIONS[locId].action;
    state.stats[a.stat] = clamp(state.stats[a.stat] + a.gain, 0, D.TUNING.statCap);
    renderResult({
      title: "Time well spent",
      lines: [a.text],
      tone: "good",
    });
  }

  function renderTalk(charId, locId) {
    renderHud();
    clearScreen();
    const c = D.CHARACTERS[charId];
    const wrap = el("div", "talk");
    wrap.appendChild(el("div", "talk-head", `${c.emoji} ${c.name}`));
    wrap.appendChild(el("p", "subtitle", c.blurb));
    wrap.appendChild(el("p", "talk-prompt", `How do you play this?`));
    const opts = el("div", "choices");
    for (const ap of D.APPROACHES) {
      opts.appendChild(
        button(`${ap.label}  (rolls ${D.STAT_SHORT[ap.stat]})`, () => doInteraction(charId, ap), "choice")
      );
    }
    opts.appendChild(button("Back off", () => renderLocation(locId), "choice subtle"));
    wrap.appendChild(opts);
    screen().appendChild(wrap);
  }

  function doInteraction(charId, approach) {
    const c = D.CHARACTERS[charId];
    const T = D.TUNING;
    const statVal = state.stats[approach.stat];
    const d20 = 1 + Math.floor(Math.random() * 20);

    let vibe = 0;
    let vibeNote = "neutral read";
    if (approach.style === c.likedStyle) {
      vibe = T.likedStyleBonus;
      vibeNote = "her kind of energy";
    } else if (approach.style === c.dislikedStyle) {
      vibe = -T.dislikedStylePenalty;
      vibeNote = "not her style";
    }

    const total = d20 + statVal + vibe;
    const dc = Math.round(T.baseDC + state.affection[charId] * T.dcPerAffection);
    const margin = total - dc;

    let tier;
    if (d20 === 20 || margin >= 10) tier = "crit";
    else if (margin >= 0) tier = "success";
    else if (d20 === 1 || margin <= -8) tier = "fail";
    else tier = "partial";

    let delta = { crit: 9, success: 5, partial: 1, fail: -3 }[tier];
    let synergy = false;
    if (approach.stat === c.likedStat && delta > 0) {
      delta += T.likedStatBonusAffection;
      synergy = true;
    }

    const before = state.affection[charId];
    state.affection[charId] = clamp(before + delta, 0, T.affectionCap);
    const realDelta = state.affection[charId] - before;
    state.metCount[charId] += 1;

    const flavor = {
      crit: `${c.name} lights up. That landed perfectly.`,
      success: `${c.name} warms to you. Good call.`,
      partial: `${c.name} gives a polite half-smile. Didn't really land.`,
      fail: `${c.name} visibly cools. That was a misread.`,
    }[tier];

    const justRevealed =
      state.metCount[charId] === T.revealHintAfter
        ? `You're starting to read her: she likes ${D.STAT_LABEL[c.likedStat]}.`
        : null;

    renderResult({
      title:
        tier === "crit"
          ? "Critical hit"
          : tier === "success"
          ? "It works"
          : tier === "partial"
          ? "Lukewarm"
          : "It backfires",
      roll: {
        d20,
        stat: `${D.STAT_SHORT[approach.stat]} ${statVal}`,
        vibe,
        vibeNote,
        total,
        dc,
      },
      lines: [
        flavor,
        synergy ? "(She really values that — bonus affection.)" : null,
        `Affection ${realDelta >= 0 ? "+" : ""}${realDelta} → ${state.affection[charId]} (${stageFor(
          state.affection[charId]
        )})`,
        justRevealed,
      ].filter(Boolean),
      tone: tier === "fail" ? "bad" : tier === "partial" ? "neutral" : "good",
    });
  }

  function renderResult(payload) {
    saveGame();
    renderHud();
    clearScreen();
    const wrap = el("div", `result tone-${payload.tone}`);
    wrap.appendChild(el("h2", null, payload.title));

    if (payload.roll) {
      const r = payload.roll;
      const rollBox = el("div", "rollbox");
      const sign = r.vibe === 0 ? "" : r.vibe > 0 ? `+ ${r.vibe}` : `− ${Math.abs(r.vibe)}`;
      rollBox.appendChild(
        el(
          "div",
          "roll-line",
          `🎲 d20 ${r.d20}  +  ${r.stat}  ${sign ? sign + " (" + r.vibeNote + ")  " : ""}=  ${r.total}`
        )
      );
      rollBox.appendChild(el("div", "roll-line dim", `vs  DC ${r.dc}`));
      wrap.appendChild(rollBox);
    }

    for (const line of payload.lines) {
      wrap.appendChild(el("p", "result-line", line));
    }

    wrap.appendChild(button("Continue", () => advancePhase(), "primary"));
    screen().appendChild(wrap);
  }

  // ---- Persistence ----
  function saveGame() {
    try {
      if (state) localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (e) {}
  }
  function hasSave() {
    try {
      return !!localStorage.getItem(SAVE_KEY);
    } catch (e) {
      return false;
    }
  }
  function loadGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const p = JSON.parse(raw);
      if (!p || !p.background || !D.BACKGROUNDS[p.background]) return false;
      state = {
        background: p.background,
        stats: Object.assign({ strength: 0, style: 0, intelligence: 0, charisma: 0 }, p.stats),
        day: p.day || 1,
        phaseIndex: p.phaseIndex || 0,
        affection: Object.assign({ aiko: 0, bianca: 0 }, p.affection),
        metCount: Object.assign({ aiko: 0, bianca: 0 }, p.metCount),
      };
      return true;
    } catch (e) {
      return false;
    }
  }

  function flash(btnId, text) {
    const b = document.getElementById(btnId);
    const o = b.textContent;
    b.textContent = text;
    setTimeout(() => (b.textContent = o), 1100);
  }

  function init() {
    document.getElementById("save-btn").addEventListener("click", () => {
      saveGame();
      flash("save-btn", "Saved ✓");
    });
    document.getElementById("load-btn").addEventListener("click", () => {
      if (loadGame()) {
        renderPhase();
        flash("load-btn", "Loaded ✓");
      } else {
        flash("load-btn", "No save");
      }
    });
    document.getElementById("reset-btn").addEventListener("click", () => {
      if (!window.confirm("Start over? This clears your save.")) return;
      try {
        localStorage.removeItem(SAVE_KEY);
      } catch (e) {}
      renderTitle();
    });
    renderTitle();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
