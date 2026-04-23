// Headless smoke test: loads story.js in a fake browser env, verifies every
// choice.next and every resolve target points to a real scene, every path
// terminates at an `ending` scene, and reports max/min reachable affection
// per character. Not shipped in index.html; used for verification only.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const storySrc = fs.readFileSync(path.join(__dirname, "story.js"), "utf8");
const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(storySrc, sandbox);
const STORY = sandbox.window.STORY;

if (!STORY || !STORY.scenes) {
  console.error("FAIL: STORY not exposed on window");
  process.exit(1);
}

const scenes = STORY.scenes;
const ids = new Set(Object.keys(scenes));
const errors = [];
const reachable = new Set();
const endingsHit = new Set();

function walk(sceneId, affection, depth) {
  if (depth > 100) {
    errors.push(`cycle? depth >100 at ${sceneId}`);
    return;
  }
  const scene = scenes[sceneId];
  if (!scene) {
    errors.push(`missing scene: ${sceneId}`);
    return;
  }
  reachable.add(sceneId);

  if (scene.ending) {
    endingsHit.add(sceneId);
    return;
  }

  if (scene.resolve) {
    const { character, threshold, good, bad } = scene.resolve;
    if (!ids.has(good)) errors.push(`${sceneId}.resolve.good -> missing ${good}`);
    if (!ids.has(bad)) errors.push(`${sceneId}.resolve.bad -> missing ${bad}`);
    if (!character) errors.push(`${sceneId}.resolve missing character`);
    if (typeof threshold !== "number") errors.push(`${sceneId}.resolve missing threshold`);
    // Record affection snapshot for reporting.
    const score = affection[character] || 0;
    resolveSnapshots.push({ sceneId, character, score, threshold });
    walk(good, affection, depth + 1);
    walk(bad, affection, depth + 1);
    return;
  }

  if (!Array.isArray(scene.choices) || scene.choices.length === 0) {
    errors.push(`${sceneId} has no choices/resolve/ending — dead end`);
    return;
  }

  scene.choices.forEach((choice, i) => {
    if (!choice.next) {
      errors.push(`${sceneId}.choices[${i}] missing next`);
      return;
    }
    if (!ids.has(choice.next)) {
      errors.push(`${sceneId}.choices[${i}].next -> missing ${choice.next}`);
      return;
    }
    const nextAff = { ...affection };
    if (choice.affection) {
      for (const [k, v] of Object.entries(choice.affection)) {
        nextAff[k] = (nextAff[k] || 0) + v;
      }
    }
    walk(choice.next, nextAff, depth + 1);
  });
}

const resolveSnapshots = [];
walk(STORY.startScene, { aiko: 0, marco: 0, ren: 0 }, 0);

// Check for unreachable scenes.
const orphans = [...ids].filter((id) => !reachable.has(id));

// Compute max reachable affection per character by greedy traversal.
function maxAffection(character) {
  const memo = new Map();
  function best(sceneId) {
    if (memo.has(sceneId)) return memo.get(sceneId);
    const scene = scenes[sceneId];
    if (!scene) return -Infinity;
    if (scene.ending || scene.resolve) {
      memo.set(sceneId, 0);
      return 0;
    }
    let m = -Infinity;
    for (const c of scene.choices || []) {
      const delta = (c.affection && c.affection[character]) || 0;
      const rest = best(c.next);
      if (rest === -Infinity) continue;
      m = Math.max(m, delta + rest);
    }
    memo.set(sceneId, m);
    return m;
  }
  return best(STORY.startScene);
}

// Find route entry (first scene where character-affection can diverge).
const routeEntries = { aiko: "aiko_1", marco: "marco_1", ren: "ren_1" };

function bestOnRoute(character) {
  const memo = new Map();
  function rec(sceneId) {
    if (memo.has(sceneId)) return memo.get(sceneId);
    const scene = scenes[sceneId];
    if (!scene || scene.ending) return 0;
    if (scene.resolve) return 0;
    let m = -Infinity;
    for (const c of scene.choices || []) {
      const delta = (c.affection && c.affection[character]) || 0;
      const rest = rec(c.next);
      if (rest === -Infinity) continue;
      m = Math.max(m, delta + rest);
    }
    if (m === -Infinity) m = 0;
    memo.set(sceneId, m);
    return m;
  }
  return rec(routeEntries[character]);
}
function worstOnRoute(character) {
  const memo = new Map();
  function rec(sceneId) {
    if (memo.has(sceneId)) return memo.get(sceneId);
    const scene = scenes[sceneId];
    if (!scene || scene.ending) return 0;
    if (scene.resolve) return 0;
    let m = Infinity;
    for (const c of scene.choices || []) {
      const delta = (c.affection && c.affection[character]) || 0;
      const rest = rec(c.next);
      if (rest === Infinity) continue;
      m = Math.min(m, delta + rest);
    }
    if (m === Infinity) m = 0;
    memo.set(sceneId, m);
    return m;
  }
  return rec(routeEntries[character]);
}

console.log("Scenes defined:", ids.size);
console.log("Scenes reachable:", reachable.size);
console.log("Endings reached:", [...endingsHit].sort().join(", "));
console.log("Orphan scenes:", orphans.length ? orphans.join(", ") : "none");
for (const c of ["aiko", "marco", "ren"]) {
  console.log(
    `  ${c}: route-affection range ${worstOnRoute(c)}..${bestOnRoute(c)} (threshold 3 for good ending)`
  );
}

if (errors.length) {
  console.error("\nFAIL:");
  errors.forEach((e) => console.error("  " + e));
  process.exit(1);
}
if (orphans.length) {
  console.error("\nFAIL: orphan scenes");
  process.exit(1);
}
console.log("\nSMOKE TEST PASSED");
