(function () {
  const SAVE_KEY = "datingSimSave_v1";

  const state = {
    currentScene: null,
    affection: { aiko: 0, marco: 0, ren: 0 },
    history: [],
  };

  const el = {};

  function $(id) {
    return document.getElementById(id);
  }

  function init() {
    el.title = $("title-screen");
    el.game = $("game-screen");
    el.portrait = $("portrait");
    el.speaker = $("speaker");
    el.dialogue = $("dialogue");
    el.choices = $("choices");
    el.meters = $("meters");

    $("new-game").addEventListener("click", startNewGame);
    $("continue").addEventListener("click", continueGame);
    $("save-btn").addEventListener("click", save);
    $("load-btn").addEventListener("click", loadAndResume);
    $("reset-btn").addEventListener("click", confirmReset);

    buildMeters();
    $("continue").disabled = !hasSave();
  }

  function buildMeters() {
    el.meters.innerHTML = "";
    Object.entries(STORY.characters).forEach(([key, c]) => {
      const wrap = document.createElement("div");
      wrap.className = "meter";
      wrap.innerHTML = `
        <span class="meter-name" style="color:${c.color}">${c.portrait} ${c.name}</span>
        <div class="bar"><div class="fill" data-char="${key}" style="background:${c.color}"></div></div>
        <span class="meter-value" data-char="${key}">0</span>
      `;
      el.meters.appendChild(wrap);
    });
  }

  function updateMeters() {
    Object.entries(state.affection).forEach(([key, val]) => {
      const fill = el.meters.querySelector(`.fill[data-char="${key}"]`);
      const value = el.meters.querySelector(`.meter-value[data-char="${key}"]`);
      if (!fill || !value) return;
      const clamped = Math.max(0, Math.min(5, val));
      fill.style.width = `${(clamped / 5) * 100}%`;
      value.textContent = String(val);
    });
  }

  function startNewGame() {
    state.currentScene = STORY.startScene;
    state.affection = { aiko: 0, marco: 0, ren: 0 };
    state.history = [];
    el.title.classList.add("hidden");
    el.game.classList.remove("hidden");
    render();
  }

  function continueGame() {
    if (!loadFromStorage()) {
      startNewGame();
      return;
    }
    el.title.classList.add("hidden");
    el.game.classList.remove("hidden");
    render();
  }

  function render() {
    const scene = STORY.scenes[state.currentScene];
    if (!scene) {
      console.error("Missing scene:", state.currentScene);
      el.dialogue.textContent = `[missing scene: ${state.currentScene}]`;
      el.choices.innerHTML = "";
      return;
    }

    el.portrait.textContent = scene.portrait || "❓";
    el.speaker.textContent = scene.speaker || "";
    el.dialogue.textContent = scene.text || "";
    el.choices.innerHTML = "";
    updateMeters();

    if (scene.ending) {
      const btn = document.createElement("button");
      btn.className = "choice ending-choice";
      btn.textContent = "Play again";
      btn.addEventListener("click", () => {
        el.game.classList.add("hidden");
        el.title.classList.remove("hidden");
        $("continue").disabled = !hasSave();
      });
      el.choices.appendChild(btn);

      const tag = document.createElement("div");
      tag.className = `ending-tag ending-${scene.ending.type}`;
      tag.textContent = scene.ending.type === "good" ? "— Good Ending —" : "— Bad Ending —";
      el.choices.appendChild(tag);
      return;
    }

    if (scene.resolve) {
      const r = scene.resolve;
      const btn = document.createElement("button");
      btn.className = "choice resolve-choice";
      btn.textContent = "(Answer from your heart…)";
      btn.addEventListener("click", () => {
        const score = state.affection[r.character] || 0;
        const nextId = score >= r.threshold ? r.good : r.bad;
        goTo(nextId);
      });
      el.choices.appendChild(btn);
      return;
    }

    if (Array.isArray(scene.choices)) {
      scene.choices.forEach((choice) => {
        const btn = document.createElement("button");
        btn.className = "choice";
        btn.textContent = choice.label;
        btn.addEventListener("click", () => pickChoice(choice));
        el.choices.appendChild(btn);
      });
    }
  }

  function pickChoice(choice) {
    if (choice.affection) {
      Object.entries(choice.affection).forEach(([key, delta]) => {
        if (state.affection[key] === undefined) state.affection[key] = 0;
        state.affection[key] += delta;
      });
    }
    state.history.push({ from: state.currentScene, label: choice.label });
    goTo(choice.next);
  }

  function goTo(sceneId) {
    state.currentScene = sceneId;
    render();
  }

  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      flashSaveButton("Saved ✓");
    } catch (e) {
      flashSaveButton("Save failed");
    }
  }

  function flashSaveButton(text) {
    const btn = $("save-btn");
    const original = btn.textContent;
    btn.textContent = text;
    setTimeout(() => (btn.textContent = original), 1200);
  }

  function hasSave() {
    try {
      return !!localStorage.getItem(SAVE_KEY);
    } catch (e) {
      return false;
    }
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (!parsed.currentScene || !STORY.scenes[parsed.currentScene]) return false;
      state.currentScene = parsed.currentScene;
      state.affection = Object.assign({ aiko: 0, marco: 0, ren: 0 }, parsed.affection || {});
      state.history = Array.isArray(parsed.history) ? parsed.history : [];
      return true;
    } catch (e) {
      return false;
    }
  }

  function loadAndResume() {
    if (loadFromStorage()) {
      render();
      flashSaveButton("Loaded ✓");
    } else {
      flashSaveButton("No save");
    }
  }

  function confirmReset() {
    if (!window.confirm("Start over? This will clear your save.")) return;
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (e) {}
    startNewGame();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
