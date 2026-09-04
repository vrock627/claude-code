// The single reducer. Every interaction dispatches here; everything is pure
// so the whole game is testable headless.

import {
  clamp,
  type Choice,
  type GameState,
  type SceneNode,
  type TimeBlock,
} from './types';
import { resolveCheck, nextRand } from './rolls';
import {
  deriveMood,
  pickCue,
  resolveMove,
  scoreDate,
  startMeters,
  stepIndex,
  turnDecay,
} from './date';
import { begForJob, encounterRoll, sleep, workShift } from './life';
import {
  ACTIVITIES,
  CAR_TIERS,
  DATE_VENUES,
  ENCOUNTER_SCENES,
  HOME_TIERS,
  JOB_TIERS,
  PARTY_INVITE_CHANCE,
  PARTY_ROOMS,
  WARDROBE_TIERS,
} from '../content/lifeContent';
import { SCENES } from '../content/scenes';

export type Action =
  | { type: 'NEW_GAME'; seed?: number }
  | { type: 'LOAD'; state: GameState }
  | { type: 'ACTIVITY'; id: string }
  | { type: 'SLEEP' }
  | { type: 'BUY'; kind: 'home' | 'car' | 'wardrobe'; tier: number }
  | { type: 'OPEN_PHONE' }
  | { type: 'CLOSE_PHONE' }
  | { type: 'GO_ON_DATE' }
  | { type: 'GO_TO_PARTY' }
  | { type: 'CHOOSE'; index: number }
  | { type: 'CONTINUE' }
  | { type: 'CLEAR_TOASTS' };

export function initialState(seed: number = Date.now() >>> 0): GameState {
  return {
    screen: 'title',
    day: 1,
    block: 0,
    money: 220,
    energy: 80,
    mood: 60,
    stats: { charm: 2, style: 1, fitness: 2, intelligence: 2 },
    homeTier: 0,
    carTier: 0,
    wardrobeTier: 0,
    job: { tier: 0, performance: 40, warnings: 0, shiftsWorked: 0, fired: false },
    rentMissed: 0,
    pendingParty: null,
    k: {
      met: false,
      hasNumber: false,
      stage: 0,
      datesCompleted: 0,
      flags: {},
      memories: [],
      usedCallbacks: [],
      enthusiasm: 0,
      routeDead: false,
      pendingDate: null,
      fumbles: 0,
      textedToday: false,
      firstTextDone: false,
      lastDateDay: -1,
    },
    scene: null,
    seed,
    toasts: [],
    gameOver: null,
  };
}

export function currentNode(s: GameState): SceneNode | null {
  if (!s.scene) return null;
  const scene = SCENES[s.scene.sceneId];
  return scene ? scene.nodes[s.scene.nodeId] ?? null : null;
}

export function visibleChoices(s: GameState, node: SceneNode): Choice[] {
  return (node.choices ?? []).filter((c) => {
    if (c.cond && !c.cond(s)) return false;
    if (c.callback) {
      return (
        s.k.memories.includes(c.callback) && !s.k.usedCallbacks.includes(c.callback)
      );
    }
    return true;
  });
}

function advanceBlock(s: GameState): GameState {
  let out = { ...s };
  // Missing a same-day date by letting its block pass counts as standing her up.
  const pd = out.k.pendingDate;
  if (pd && pd.day === out.day && out.block >= pd.block) {
    out = {
      ...out,
      k: {
        ...out.k,
        pendingDate: null,
        enthusiasm: clamp(out.k.enthusiasm - 3, -3, 3),
      },
      toasts: [
        ...out.toasts,
        'Krystalle: "waited 20 min. cool cool cool." — you missed the date.',
      ],
    };
    if (out.k.enthusiasm <= -3) {
      out.k = { ...out.k, routeDead: true, routeDeadReason: 'Read at 8:47 PM.' };
    }
  }
  // A party you let slide past just… happens without you.
  const pp = out.pendingParty;
  if (pp && pp.day === out.day && out.block >= pp.block) {
    out = {
      ...out,
      pendingParty: null,
      toasts: [...out.toasts, 'The party came and went without you. Dex will live.'],
    };
  }
  if (out.block < 3) return { ...out, block: (out.block + 1) as TimeBlock };
  return sleep(out);
}

function startScene(
  s: GameState,
  sceneId: string,
  dateNumber: number | null
): GameState {
  const scene = SCENES[sceneId];
  let date = null;
  let seed = s.seed;
  if (dateNumber !== null) {
    date = {
      venueId: scene.venueId ?? '',
      dateNumber,
      meters: startMeters(s, dateNumber),
      strikes: 0,
      ladder: -1,
      recentStrike: false,
      recentKiss: false,
      turn: 0,
      lastRoll: null,
      over: false,
      outcome: null,
    };
  }
  let cue: string | null = null;
  if (date) {
    const picked = pickCue(date, seed);
    cue = picked.cue;
    seed = picked.seed;
  }
  return {
    ...s,
    seed,
    screen: 'scene',
    scene: { sceneId, nodeId: scene.start, date, cue, vars: {} },
  };
}

function applyEffects(s: GameState, e: NonNullable<Choice['effects']>): GameState {
  let out = { ...s };
  if (e.money) out.money += e.money;
  if (e.energy) out.energy = clamp(out.energy + e.energy, 0, 100);
  if (e.mood) out.mood = clamp(out.mood + e.mood, 0, 100);
  if (e.performance)
    out.job = { ...out.job, performance: clamp(out.job.performance + e.performance, 0, 100) };
  if (e.enthusiasm)
    out.k = { ...out.k, enthusiasm: clamp(out.k.enthusiasm + e.enthusiasm, -3, 3) };
  if (out.scene?.date && (e.interest || e.comfort || e.momentum)) {
    const m = out.scene.date.meters;
    out.scene = {
      ...out.scene,
      date: {
        ...out.scene.date,
        meters: {
          interest: clamp(m.interest + (e.interest ?? 0), 0, 100),
          comfort: clamp(m.comfort + (e.comfort ?? 0), 0, 100),
          momentum: clamp(m.momentum + (e.momentum ?? 0), 0, 100),
        },
      },
    };
  }
  return out;
}

function handleEvent(s: GameState, event: string): GameState {
  let out = { ...s };
  if (event === 'gotNumber') {
    out.k = { ...out.k, met: true, hasNumber: true, stage: 2 };
    out.toasts = [...out.toasts, 'You got Krystalle’s number.'];
  } else if (event === 'firstText') {
    out.k = { ...out.k, firstTextDone: true, textedToday: true };
  } else if (event === 'banterText') {
    out.k = { ...out.k, textedToday: true };
  } else if (event.startsWith('schedule:')) {
    const venueId = event.slice('schedule:'.length);
    const venue = DATE_VENUES.find((v) => v.id === venueId)!;
    out.k = {
      ...out.k,
      textedToday: true,
      pendingDate: { venueId, day: out.day + 1, block: venue.block },
    };
    out.toasts = [
      ...out.toasts,
      `It’s on: ${venue.name}, tomorrow ${venue.block === 1 ? 'afternoon' : 'evening'}.`,
    ];
  }
  return out;
}

// Wrap up the current scene: scoring, stage changes, back to life screen.
function finishScene(s: GameState): GameState {
  const sc = s.scene;
  if (!sc) return s;
  const scene = SCENES[sc.sceneId];
  let out: GameState = { ...s, scene: null, screen: 'life' };

  // Parties are their own thing: never counted as dates, but her mood about
  // the night still carries over.
  if (scene.id === 'party') {
    if (sc.date) {
      const d = sc.date;
      if (d.outcome === 'crash' || d.outcome === 'route-dead') {
        out.k = { ...out.k, enthusiasm: clamp(out.k.enthusiasm - 2, -3, 3) };
        if (d.outcome === 'route-dead' || out.k.enthusiasm <= -3) {
          out.k = {
            ...out.k,
            routeDead: true,
            routeDeadReason: 'A whole party watched. That’s the version people retell.',
          };
        }
        out.mood = clamp(out.mood - 12, 0, 100);
        out.toasts = [...out.toasts, 'That went sideways in front of everyone.'];
      } else if (d.meters.interest >= 55 && (sc.vars.kSpotted as boolean)) {
        out.k = { ...out.k, enthusiasm: clamp(out.k.enthusiasm + 1, -3, 3) };
        out.mood = clamp(out.mood + 10, 0, 100);
        out.toasts = [...out.toasts, 'Good party. Great company.'];
      } else {
        out.mood = clamp(out.mood + 6, 0, 100);
        out.toasts = [...out.toasts, 'Decent party. Dex delivered.'];
      }
    } else {
      out.mood = clamp(out.mood + 8, 0, 100);
      out.toasts = [...out.toasts, 'Solid night. Your ears will ring till noon.'];
    }
    return advanceBlock(out);
  }

  if (sc.date) {
    const d = sc.date;
    if (d.dateNumber === 0) {
      // First encounter. Getting the number is handled by the gotNumber event;
      // here we settle the failure modes.
      if (!out.k.hasNumber) {
        const crashed = d.outcome === 'crash' || d.outcome === 'route-dead';
        out.k = {
          ...out.k,
          met: true,
          stage: Math.max(out.k.stage, 1),
          fumbles: out.k.fumbles + (crashed ? 1 : 0),
        };
        if (d.outcome === 'route-dead') {
          out.k = {
            ...out.k,
            routeDead: true,
            routeDeadReason: 'She saw you coming from a mile away.',
          };
        }
      }
    } else {
      // A real date.
      out.k = { ...out.k, lastDateDay: out.day };
      if (d.outcome === 'crash' || d.outcome === 'route-dead') {
        out.k = {
          ...out.k,
          enthusiasm: clamp(out.k.enthusiasm - 3, -3, 3),
        };
        if (d.outcome === 'route-dead' || out.k.enthusiasm <= -3) {
          out.k = {
            ...out.k,
            routeDead: true,
            routeDeadReason:
              d.outcome === 'route-dead'
                ? 'Some lines, once crossed, stay crossed.'
                : 'The texts got shorter, then stopped.',
          };
        }
        out.toasts = [...out.toasts, 'That ended badly.'];
        out.mood = clamp(out.mood - 15, 0, 100);
      } else {
        const { grade, score } = scoreDate(out, d);
        const deltaE = grade === 'amazing' ? 2 : grade === 'good' ? 1 : grade === 'okay' ? 0 : -2;
        out.k = {
          ...out.k,
          datesCompleted: out.k.datesCompleted + 1,
          enthusiasm: clamp(out.k.enthusiasm + deltaE, -3, 3),
          stage: Math.max(out.k.stage, 3),
        };
        out.mood = clamp(out.mood + (grade === 'bad' ? -10 : 12), 0, 100);
        out.toasts = [
          ...out.toasts,
          grade === 'amazing'
            ? `Date score ${score}: she texts you a song on the ride home.`
            : grade === 'good'
              ? `Date score ${score}: that was a good night.`
              : grade === 'okay'
                ? `Date score ${score}: fine. Just — fine.`
                : `Date score ${score}: she was polite about it, which stings worse.`,
        ];
        if (grade === 'bad' && out.k.enthusiasm <= -3) {
          out.k = {
            ...out.k,
            routeDead: true,
            routeDeadReason: 'The texts got shorter, then stopped.',
          };
        }
        if (
          out.k.stage < 4 &&
          out.k.datesCompleted >= 3 &&
          grade === 'amazing' &&
          d.ladder >= stepIndex('makeOut')
        ) {
          out.k = { ...out.k, stage: 4 };
          out.toasts = [
            ...out.toasts,
            '“So… are we a thing? I feel like we’re a thing.” — Krystalle is your girlfriend.',
          ];
        }
      }
    }
    // Dates and encounters consume the time block.
    return advanceBlock(out);
  }

  // Text scenes are free.
  if (scene.id.startsWith('text-')) return { ...out, screen: 'life' };
  return advanceBlock(out);
}

function chooseInScene(s: GameState, index: number): GameState {
  const node = currentNode(s);
  if (!node || !s.scene) return s;
  const choices = visibleChoices(s, node);
  const choice = choices[index];
  if (!choice) return s;

  let out: GameState = { ...s };

  // Per-turn drift happens before the action lands.
  if (out.scene!.date && !out.scene!.date.over) {
    out = {
      ...out,
      scene: { ...out.scene!, date: turnDecay(out.scene!.date!) },
    };
  }

  if (choice.learn && !out.k.memories.includes(choice.learn)) {
    out = { ...out, k: { ...out.k, memories: [...out.k.memories, choice.learn] } };
  }
  if (choice.callback) {
    out = {
      ...out,
      k: {
        ...out.k,
        usedCallbacks: [...out.k.usedCallbacks, choice.callback],
        flags: { ...out.k.flags, nice: true },
      },
    };
    out = applyEffects(out, { interest: 8, comfort: 6, momentum: 6 });
  }
  if (choice.flags) {
    const flags = { ...out.k.flags };
    for (const f of choice.flags) flags[f] = true;
    out = { ...out, k: { ...out.k, flags } };
  }
  if (choice.unflags) {
    const flags = { ...out.k.flags };
    for (const f of choice.unflags) delete flags[f];
    out = { ...out, k: { ...out.k, flags } };
  }
  if (choice.setVars || choice.addVars) {
    const vars = { ...out.scene!.vars };
    for (const [k, v] of Object.entries(choice.setVars ?? {})) vars[k] = v;
    for (const [k, dv] of Object.entries(choice.addVars ?? {})) {
      vars[k] = (typeof vars[k] === 'number' ? (vars[k] as number) : 0) + dv;
    }
    out = { ...out, scene: { ...out.scene!, vars } };
  }
  if (choice.effects) out = applyEffects(out, choice.effects);
  if (choice.event) out = handleEvent(out, choice.event);

  let nextNode = choice.goto ?? null;
  if (choice.judge) {
    nextNode = choice.judge.pass(out) ? choice.judge.onPass : choice.judge.onFail;
  }

  if (choice.move && out.scene!.date) {
    const mo = resolveMove(out, choice.move);
    const flags = { ...out.k.flags };
    for (const f of mo.flags) flags[f] = true;
    out = {
      ...out,
      seed: mo.seed,
      k: { ...out.k, flags },
      scene: { ...out.scene!, date: mo.session },
    };
    nextNode = mo.success ? choice.moveWin ?? nextNode : choice.moveLose ?? nextNode;
    if (mo.session.over) nextNode = 'crash';
  } else if (choice.check) {
    const spec = choice.check;
    const { result, seed } = resolveCheck(out, spec.stat, spec.dc, spec.label);
    out = { ...out, seed };
    if (out.scene!.date) {
      out = { ...out, scene: { ...out.scene!, date: { ...out.scene!.date!, lastRoll: result } } };
    }
    if (result.success) {
      if (spec.winEffects) out = applyEffects(out, spec.winEffects);
      if (spec.winFlags) {
        const flags = { ...out.k.flags };
        for (const f of spec.winFlags) flags[f] = true;
        out = { ...out, k: { ...out.k, flags } };
      }
      nextNode = spec.onWin;
    } else {
      if (spec.loseEffects) out = applyEffects(out, spec.loseEffects);
      if (spec.loseFlags) {
        const flags = { ...out.k.flags };
        for (const f of spec.loseFlags) flags[f] = true;
        out = { ...out, k: { ...out.k, flags } };
      }
      nextNode = spec.onLose;
    }
  }

  if (choice.endScene) return finishScene(out);

  if (nextNode) out = enterNode(out, nextNode);
  return out;
}

// Move to a node: pick up any fact it shares, refresh her body-language cue.
function enterNode(s: GameState, nodeId: string): GameState {
  let out: GameState = { ...s, scene: { ...s.scene!, nodeId } };
  const node = currentNode(out);
  if (node?.learn && !out.k.memories.includes(node.learn)) {
    out = { ...out, k: { ...out.k, memories: [...out.k.memories, node.learn] } };
  }
  if (node?.event) out = handleEvent(out, node.event);
  if (out.scene!.date) {
    const picked = pickCue(out.scene!.date!, out.seed);
    out = { ...out, seed: picked.seed, scene: { ...out.scene!, cue: picked.cue } };
  }
  return out;
}

function doActivity(s: GameState, id: string): GameState {
  const act = ACTIVITIES.find((a) => a.id === id);
  if (!act || s.gameOver) return s;
  if (!act.blocks.includes(s.block)) return s;
  if (act.available && !act.available(s)) return s;
  if (act.energy < 0 && s.energy + act.energy < 0) {
    return { ...s, toasts: [...s.toasts, 'You’re too wiped for that. Rest first.'] };
  }
  if (act.cost > s.money) {
    return { ...s, toasts: [...s.toasts, 'You can’t afford that right now.'] };
  }

  let out: GameState = {
    ...s,
    money: s.money - act.cost,
    energy: clamp(s.energy + act.energy, 0, 100),
  };

  switch (id) {
    case 'work':
      out = workShift(out);
      break;
    case 'beg-job':
      out = begForJob(out);
      break;
    case 'gym':
      out = {
        ...out,
        stats: { ...out.stats, fitness: Math.min(10, out.stats.fitness + 1) },
        mood: clamp(out.mood + 4, 0, 100),
        toasts: [...out.toasts, 'Good session. Fitness up.'],
      };
      break;
    case 'read':
      out = {
        ...out,
        stats: { ...out.stats, charm: Math.min(10, out.stats.charm + 1) },
        toasts: [...out.toasts, 'New material banked. Charm up.'],
      };
      break;
    case 'study':
      out = {
        ...out,
        stats: { ...out.stats, intelligence: Math.min(10, out.stats.intelligence + 1) },
        toasts: [...out.toasts, 'Three tabs deep and it finally clicked. Intelligence up.'],
      };
      break;
    case 'park':
      out = {
        ...out,
        stats: { ...out.stats, fitness: Math.min(10, out.stats.fitness + (out.stats.fitness < 6 ? 1 : 0)) },
      };
      break;
    case 'rest':
      out = { ...out, mood: clamp(out.mood + 3, 0, 100) };
      break;
  }

  if (act.encounterVenue) {
    const { hit, seed } = encounterRoll(out, act.encounterVenue);
    out = { ...out, seed };
    if (hit) {
      return startScene(out, ENCOUNTER_SCENES[act.encounterVenue], 0);
    }
    out = {
      ...out,
      mood: clamp(out.mood + 3, 0, 100),
      toasts:
        out.k.hasNumber || !out.k.met
          ? out.toasts
          : [...out.toasts, 'No sign of her today.'],
    };
    // Being out and social is how party invites happen.
    out = rollPartyInvite(out);
  }

  return advanceBlock(out);
}

// After a social hang, someone might press an address into your phone:
// a house party, a night or two out, always evening or later.
function rollPartyInvite(s: GameState): GameState {
  if (s.pendingParty || s.gameOver) return s;
  const r1 = nextRand(s.seed);
  let out = { ...s, seed: r1.seed };
  if (r1.value >= PARTY_INVITE_CHANCE) return out;
  const r2 = nextRand(out.seed);
  const r3 = nextRand(r2.seed);
  out = { ...out, seed: r3.seed };
  const day = out.day + 1 + Math.floor(r2.value * 2); // tomorrow or the day after
  let block: TimeBlock = r3.value < 0.6 ? 2 : 3; // usually evening, sometimes late
  const pd = out.k.pendingDate;
  if (pd && pd.day === day && pd.block === block) block = block === 2 ? 3 : 2;
  return {
    ...out,
    pendingParty: { day, block },
    toasts: [
      ...out.toasts,
      `Dex — Sam’s cousin, knows everyone — grabs your shoulder on the way out: “House party, ${
        day === out.day + 1 ? 'tomorrow' : 'day after tomorrow'
      } ${block === 2 ? 'evening' : 'late'}. Bring nothing. Bring everything.”`,
    ],
  };
}

export function reducer(s: GameState, a: Action): GameState {
  switch (a.type) {
    case 'NEW_GAME':
      return { ...initialState(a.seed), screen: 'life' };
    case 'LOAD':
      return a.state;
    case 'CLEAR_TOASTS':
      return { ...s, toasts: [] };
    case 'ACTIVITY':
      return doActivity(s, a.id);
    case 'SLEEP':
      return s.scene ? s : sleep(s);
    case 'BUY': {
      if (a.kind === 'home') {
        const t = HOME_TIERS[a.tier];
        if (!t || a.tier !== s.homeTier + 1 || s.money < t.moveCost) return s;
        return {
          ...s,
          money: s.money - t.moveCost,
          homeTier: a.tier,
          toasts: [...s.toasts, `Moved: ${t.name}.`],
        };
      }
      if (a.kind === 'car') {
        const t = CAR_TIERS[a.tier];
        if (!t || a.tier <= s.carTier || s.money < t.cost) return s;
        return {
          ...s,
          money: s.money - t.cost,
          carTier: a.tier,
          toasts: [...s.toasts, `Yours now: ${t.name}.`],
        };
      }
      const t = WARDROBE_TIERS[a.tier];
      if (!t || a.tier !== s.wardrobeTier + 1 || s.money < t.cost) return s;
      return {
        ...s,
        money: s.money - t.cost,
        wardrobeTier: a.tier,
        stats: { ...s.stats, style: Math.min(10, s.stats.style + 1) },
        toasts: [...s.toasts, `Wardrobe upgraded: ${t.name}. Style up.`],
      };
    }
    case 'OPEN_PHONE': {
      if (!s.k.hasNumber || s.k.routeDead || s.scene) return s;
      return startScene(s, 'text-hub', null);
    }
    case 'CLOSE_PHONE':
      return { ...s, scene: null, screen: 'life' };
    case 'GO_ON_DATE': {
      const pd = s.k.pendingDate;
      if (!pd || pd.day !== s.day || pd.block !== s.block) return s;
      const venue = DATE_VENUES.find((v) => v.id === pd.venueId)!;
      let out: GameState = { ...s, k: { ...s.k, pendingDate: null } };
      // Your ride decides whether you show up on time.
      const { value, seed } = nextRand(out.seed);
      out = { ...out, seed };
      const late = value < CAR_TIERS[out.carTier].lateChance;
      out = startScene(out, venue.sceneId, out.k.datesCompleted + 1);
      if (late && out.scene?.date) {
        out = {
          ...out,
          toasts: [...out.toasts, 'The bus crawled. You’re twelve minutes late.'],
          scene: {
            ...out.scene,
            date: {
              ...out.scene.date,
              meters: {
                ...out.scene.date.meters,
                comfort: clamp(out.scene.date.meters.comfort - 8, 0, 100),
                interest: clamp(out.scene.date.meters.interest - 5, 0, 100),
              },
            },
          },
        };
      }
      return out;
    }
    case 'GO_TO_PARTY': {
      const pp = s.pendingParty;
      if (!pp || pp.day !== s.day || pp.block !== s.block || s.scene) return s;
      let out: GameState = {
        ...s,
        pendingParty: null,
        energy: clamp(s.energy - 12, 0, 100),
      };
      // Is she here tonight?
      const rK = nextRand(out.seed);
      const kChance = out.k.routeDead
        ? 0
        : out.k.met
          ? 0.5 + out.k.enthusiasm * 0.05
          : 0.4;
      const kHere = rK.value < kChance;
      // Party personality: overall vibe + which three of the five rooms exist.
      const rV = nextRand(rK.seed);
      const vibe = rV.value < 0.5 ? 'chill' : 'rowdy';
      let seed = rV.seed;
      const pool = [...PARTY_ROOMS];
      const rooms: string[] = [];
      while (rooms.length < 3) {
        const r = nextRand(seed);
        seed = r.seed;
        rooms.push(pool.splice(Math.floor(r.value * pool.length), 1)[0]);
      }
      const dateNumber = kHere
        ? out.k.hasNumber
          ? Math.max(1, out.k.datesCompleted)
          : 0
        : null;
      const date =
        dateNumber === null
          ? null
          : {
              venueId: 'party',
              dateNumber,
              meters: startMeters(out, dateNumber),
              strikes: 0,
              ladder: -1,
              recentStrike: false,
              recentKiss: false,
              turn: 0,
              lastRoll: null,
              over: false,
              outcome: null,
            };
      return {
        ...out,
        seed,
        screen: 'scene',
        scene: {
          sceneId: 'party',
          nodeId: 'arrive',
          date,
          cue: null,
          vars: { kHere, kSpotted: false, vibe, rooms: rooms.join(','), drinks: 0 },
        },
      };
    }
    case 'CHOOSE':
      return chooseInScene(s, a.index);
    case 'CONTINUE': {
      const node = currentNode(s);
      if (!node) return s;
      if (node.endScene) return finishScene(s);
      if (node.next) return enterNode(s, node.next);
      return s;
    }
    default:
      return s;
  }
}
