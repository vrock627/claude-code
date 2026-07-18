import { describe, expect, it } from 'vitest';
import { currentNode, initialState, reducer, visibleChoices } from '../src/engine/reducer';
import {
  effectiveRequirement,
  judgeMove,
  resolveMove,
  scoreDate,
  startMeters,
  turnDecay,
  deriveMood,
} from '../src/engine/date';
import { weeklySettleUp, sleep } from '../src/engine/life';
import { momentumBonus, nextRand, rollD20 } from '../src/engine/rolls';
import type { DateSession, GameState } from '../src/engine/types';

function mkDate(over: Partial<DateSession> = {}): DateSession {
  return {
    venueId: 'coffee',
    dateNumber: 1,
    meters: { interest: 50, comfort: 50, momentum: 50 },
    strikes: 0,
    ladder: -1,
    recentStrike: false,
    recentKiss: false,
    turn: 0,
    lastRoll: null,
    over: false,
    outcome: null,
    ...over,
  };
}

function mkState(overrides: Partial<GameState> = {}, date: Partial<DateSession> | null = {}): GameState {
  const base = initialState(42);
  const s: GameState = {
    ...base,
    screen: 'scene',
    k: { ...base.k, met: true, hasNumber: true, stage: 2 },
    scene:
      date === null
        ? null
        : { sceneId: 'date-coffee', nodeId: 'arrive', date: mkDate(date), cue: null },
    ...overrides,
  };
  return s;
}

describe('rng', () => {
  it('is deterministic per seed and advances', () => {
    const a = nextRand(123);
    const b = nextRand(123);
    expect(a.value).toBe(b.value);
    expect(a.seed).not.toBe(123);
    const r = rollD20(999);
    expect(r.roll).toBeGreaterThanOrEqual(1);
    expect(r.roll).toBeLessThanOrEqual(20);
  });
});

describe('momentum bonus', () => {
  it('rewards flow and punishes stalls', () => {
    expect(momentumBonus(90)).toBe(3);
    expect(momentumBonus(60)).toBe(1);
    expect(momentumBonus(30)).toBe(0);
    expect(momentumBonus(10)).toBe(-2);
  });
});

describe('expectation ladder', () => {
  it('auto-succeeds when comfort clears the requirement', () => {
    const s = mkState({}, { meters: { interest: 60, comfort: 60, momentum: 50 } });
    expect(judgeMove(s, 'lightTouch')).toEqual({ kind: 'auto-success' });
  });

  it('flags a risky roll in the marginal band', () => {
    const s = mkState({}, { ladder: 2, meters: { interest: 60, comfort: 60, momentum: 50 } });
    // leanClose needs 55; skipping no rungs; comfort 60 → auto
    expect(judgeMove(s, 'leanClose').kind).toBe('auto-success');
    const s2 = mkState({}, { ladder: 3, meters: { interest: 62, comfort: 60, momentum: 50 } });
    // kiss needs 68, no skipped rungs, margin -8 → risky
    expect(judgeMove(s2, 'kiss').kind).toBe('risky');
  });

  it('punishes going way too fast with a strike and comfort crash', () => {
    const s = mkState({}, { meters: { interest: 60, comfort: 30, momentum: 50 } });
    const v = judgeMove(s, 'kiss');
    expect(v.kind).toBe('too-fast');
    const out = resolveMove(s, 'kiss');
    expect(out.strike).toBe(true);
    expect(out.session.strikes).toBe(1);
    expect(out.session.meters.comfort).toBeLessThan(30);
  });

  it('hard-gates the top of the ladder on early dates (severe → creep)', () => {
    const s = mkState({}, { dateNumber: 1, meters: { interest: 90, comfort: 95, momentum: 50 } });
    const out = resolveMove(s, 'bedroom');
    expect(out.strike).toBe(true);
    expect(out.flags).toContain('creep');
  });

  it('a second severe overshoot kills the route', () => {
    const base = mkState({}, { dateNumber: 1, meters: { interest: 90, comfort: 95, momentum: 50 } });
    const s = { ...base, k: { ...base.k, flags: { creep: true as const } } };
    const out = resolveMove(s, 'bedroom');
    expect(out.routeDead).toBe(true);
    expect(out.session.outcome).toBe('route-dead');
  });

  it('three strikes crash the date', () => {
    const s = mkState({}, { strikes: 2, meters: { interest: 60, comfort: 20, momentum: 50 } });
    const out = resolveMove(s, 'kiss');
    expect(out.session.over).toBe(true);
    expect(out.session.outcome).toBe('crash');
  });

  it('skipping rungs raises the effective requirement', () => {
    const s1 = mkState({}, { ladder: 3, meters: { interest: 70, comfort: 60, momentum: 50 } });
    const s2 = mkState({}, { ladder: -1, meters: { interest: 70, comfort: 60, momentum: 50 } });
    expect(effectiveRequirement(s2, 'kiss')).toBeGreaterThan(effectiveRequirement(s1, 'kiss'));
  });

  it('positive flags lower the bar; creep raises it hard', () => {
    const plain = mkState({}, {});
    const confident = { ...plain, k: { ...plain.k, flags: { confident: true as const } } };
    const creep = { ...plain, k: { ...plain.k, flags: { creep: true as const } } };
    expect(effectiveRequirement(confident, 'kiss')).toBeLessThan(effectiveRequirement(plain, 'kiss'));
    expect(effectiveRequirement(creep, 'kiss')).toBeGreaterThan(effectiveRequirement(plain, 'kiss') + 10);
  });

  it('interest floor produces a rebuff, not a strike', () => {
    const s = mkState({}, { meters: { interest: 20, comfort: 80, momentum: 50 } });
    const out = resolveMove(s, 'kiss');
    expect(out.strike).toBe(false);
    expect(out.success).toBe(false);
  });
});

describe('meters & mood', () => {
  it('turn decay drains momentum and clears recent-strike', () => {
    const d = mkDate({ recentStrike: true, meters: { interest: 50, comfort: 50, momentum: 50 } });
    const out = turnDecay(d);
    expect(out.meters.momentum).toBe(47);
    expect(out.recentStrike).toBe(false);
    expect(out.turn).toBe(1);
  });

  it('derives moods from state', () => {
    expect(deriveMood(mkDate({ recentStrike: true, meters: { interest: 50, comfort: 50, momentum: 50 } }))).toBe('annoyed');
    expect(deriveMood(mkDate({ recentStrike: true, meters: { interest: 50, comfort: 20, momentum: 50 } }))).toBe('uneasy');
    expect(deriveMood(mkDate({ meters: { interest: 50, comfort: 20, momentum: 50 } }))).toBe('uneasy');
    expect(deriveMood(mkDate({ recentKiss: true, meters: { interest: 70, comfort: 75, momentum: 50 } }))).toBe('flushed');
    expect(deriveMood(mkDate({ meters: { interest: 50, comfort: 50, momentum: 75 } }))).toBe('laughing');
    expect(deriveMood(mkDate({ meters: { interest: 65, comfort: 50, momentum: 50 } }))).toBe('warm');
  });

  it('start meters respect flags, enthusiasm, and clamps', () => {
    const cold = mkState({}, null);
    const warm = {
      ...cold,
      k: { ...cold.k, enthusiasm: 3, flags: { nice: true as const, funny: true as const } },
    };
    const a = startMeters(cold, 1);
    const b = startMeters(warm, 1);
    expect(b.interest).toBeGreaterThan(a.interest);
    expect(b.comfort).toBeGreaterThan(a.comfort);
    expect(b.interest).toBeLessThanOrEqual(70);
  });
});

describe('date scoring', () => {
  it('grades a strong date up and a struck-out date down', () => {
    const good = mkState({}, { ladder: 4, meters: { interest: 80, comfort: 80, momentum: 60 } });
    good.k.flags = { funny: true, nice: true, confident: true };
    const { grade } = scoreDate(good, good.scene!.date!);
    expect(['good', 'amazing']).toContain(grade);

    const bad = mkState({}, { strikes: 2, meters: { interest: 30, comfort: 25, momentum: 20 } });
    bad.k.flags = { creep: true };
    expect(scoreDate(bad, bad.scene!.date!).grade).toBe('bad');
  });
});

describe('life economy', () => {
  it('pays rent when solvent and evicts after two misses', () => {
    const s = mkState({ money: 500, screen: 'life' }, null);
    const paid = weeklySettleUp(s);
    expect(paid.money).toBe(390); // studio rent 110
    const broke = mkState({ money: 0, screen: 'life' }, null);
    const miss1 = weeklySettleUp(broke);
    expect(miss1.rentMissed).toBe(1);
    expect(miss1.gameOver).toBeNull();
    const miss2 = weeklySettleUp(miss1);
    expect(miss2.gameOver).not.toBeNull();
    expect(miss2.screen).toBe('gameover');
  });

  it('warns then fires for missing weekly shifts', () => {
    const s = mkState({ money: 5000, screen: 'life' }, null);
    const w1 = weeklySettleUp(s);
    expect(w1.job.warnings).toBe(1);
    expect(w1.job.fired).toBe(false);
    const w2 = weeklySettleUp(w1);
    expect(w2.job.fired).toBe(true);
  });

  it('standing her up drains enthusiasm and can kill the route', () => {
    const s = mkState({ screen: 'life', day: 5, block: 3 as const }, null);
    s.k.pendingDate = { venueId: 'coffee', day: 4, block: 1 };
    s.k.enthusiasm = -1;
    const out = sleep(s);
    expect(out.k.pendingDate).toBeNull();
    expect(out.k.enthusiasm).toBe(-3);
    expect(out.k.routeDead).toBe(true);
  });
});

describe('reducer end-to-end', () => {
  it('runs a working day: shift pays, gym trains, sleep advances the day', () => {
    let s = reducer(initialState(7), { type: 'NEW_GAME', seed: 7 });
    const money0 = s.money;
    s = reducer(s, { type: 'ACTIVITY', id: 'work' });
    expect(s.money).toBe(money0 + 48);
    expect(s.block).toBe(1);
    const fit0 = s.stats.fitness;
    s = reducer(s, { type: 'ACTIVITY', id: 'gym' });
    expect(s.stats.fitness).toBe(fit0 + 1);
    s = reducer(s, { type: 'SLEEP' });
    expect(s.day).toBe(2);
    expect(s.block).toBe(0);
  });

  it('blocks activities you cannot afford or survive', () => {
    let s = reducer(initialState(7), { type: 'NEW_GAME', seed: 7 });
    s = { ...s, energy: 5 };
    const before = s.block;
    s = reducer(s, { type: 'ACTIVITY', id: 'gym' });
    expect(s.block).toBe(before); // refused, block not consumed
  });

  it('charges rent on the morning of day 8', () => {
    let s = reducer(initialState(7), { type: 'NEW_GAME', seed: 7 });
    s = { ...s, money: 1000, day: 7, block: 2 as const };
    s = reducer(s, { type: 'SLEEP' });
    expect(s.day).toBe(8);
    expect(s.money).toBe(890);
  });

  it('buying upgrades spends money and steps tiers', () => {
    let s = reducer(initialState(7), { type: 'NEW_GAME', seed: 7 });
    s = { ...s, money: 10000 };
    s = reducer(s, { type: 'BUY', kind: 'wardrobe', tier: 1 });
    expect(s.wardrobeTier).toBe(1);
    s = reducer(s, { type: 'BUY', kind: 'car', tier: 1 });
    expect(s.carTier).toBe(1);
    s = reducer(s, { type: 'BUY', kind: 'home', tier: 1 });
    expect(s.homeTier).toBe(1);
    expect(s.money).toBe(10000 - 160 - 700 - 450);
  });

  it('cannot skip home tiers', () => {
    let s = reducer(initialState(7), { type: 'NEW_GAME', seed: 7 });
    s = { ...s, money: 10000 };
    const out = reducer(s, { type: 'BUY', kind: 'home', tier: 2 });
    expect(out.homeTier).toBe(0);
  });

  it('a full scripted date can run through the reducer', () => {
    let s = reducer(initialState(11), { type: 'NEW_GAME', seed: 11 });
    s = {
      ...s,
      money: 500,
      k: {
        ...s.k,
        met: true,
        hasNumber: true,
        firstTextDone: true,
        stage: 2,
        pendingDate: { venueId: 'coffee', day: s.day, block: 1 },
      },
      block: 1 as const,
    };
    s = reducer(s, { type: 'GO_ON_DATE' });
    expect(s.screen).toBe('scene');
    expect(s.scene?.sceneId).toBe('date-coffee');
    expect(s.scene?.date?.dateNumber).toBe(1);
    // Walk the date by always taking the first visible choice until it ends.
    let guard = 0;
    while (s.scene && guard++ < 200) {
      const node = currentNode(s);
      if (!node) break;
      const choices = visibleChoices(s, node);
      s = choices.length > 0 ? reducer(s, { type: 'CHOOSE', index: 0 }) : reducer(s, { type: 'CONTINUE' });
    }
    expect(guard).toBeLessThan(200);
    expect(s.screen).toBe('life');
    expect(s.k.lastDateDay).toBeGreaterThan(0);
  });
});
