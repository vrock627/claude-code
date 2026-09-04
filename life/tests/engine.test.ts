import { describe, expect, it } from 'vitest';
import { currentNode, initialState, reducer, visibleChoices } from '../src/engine/reducer';
import { PARTY_LOCATIONS } from '../src/content/lifeContent';
import { CIRCLE, eligible, rollDare, rollNpc } from '../src/content/dares';
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
        : { sceneId: 'date-coffee', nodeId: 'arrive', date: mkDate(date), cue: null, vars: {}, wardrobe: {} },
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

  it('library study trains intelligence', () => {
    let s = reducer(initialState(7), { type: 'NEW_GAME', seed: 7 });
    const int0 = s.stats.intelligence;
    s = reducer(s, { type: 'ACTIVITY', id: 'study' });
    expect(s.stats.intelligence).toBe(int0 + 1);
    expect(s.block).toBe(1);
  });

  it('social activities can produce a party invite for a future evening/night', () => {
    let s = reducer(initialState(3), { type: 'NEW_GAME', seed: 3 });
    s = { ...s, money: 5000, k: { ...s.k, routeDead: true } }; // no encounters, pure invite hunt
    let guard = 0;
    while (!s.pendingParty && guard++ < 120) {
      if (s.block <= 1) s = reducer(s, { type: 'ACTIVITY', id: 'cafe' });
      else s = reducer(s, { type: 'SLEEP' });
      if (s.gameOver) break;
    }
    expect(s.pendingParty).not.toBeNull();
    expect(s.pendingParty!.day).toBeGreaterThan(s.day);
    expect([1, 2, 3]).toContain(s.pendingParty!.block);
    expect(Object.keys(PARTY_LOCATIONS)).toContain(s.pendingParty!.loc);
  });

  it('an unattended party invite expires overnight', () => {
    let s = reducer(initialState(7), { type: 'NEW_GAME', seed: 7 });
    s = { ...s, pendingParty: { day: s.day, block: 2 as const, loc: 'house' } };
    s = reducer(s, { type: 'SLEEP' });
    expect(s.pendingParty).toBeNull();
  });

  it('a party runs through the reducer and never counts as a date', () => {
    let s = reducer(initialState(21), { type: 'NEW_GAME', seed: 21 });
    s = {
      ...s,
      block: 2 as const,
      pendingParty: { day: s.day, block: 2 as const, loc: 'house' },
      k: { ...s.k, met: true, hasNumber: true, firstTextDone: true, stage: 3, datesCompleted: 1 },
    };
    const dates0 = s.k.datesCompleted;
    s = reducer(s, { type: 'GO_TO_PARTY' });
    expect(s.screen).toBe('scene');
    expect(s.scene?.sceneId).toBe('party');
    expect(s.pendingParty).toBeNull();
    expect([1, 2, 3]).toContain(Number(s.scene?.vars.spice));
    const rooms = String(s.scene?.vars.rooms).split(',');
    expect(rooms).toHaveLength(3);
    expect(rooms).toContain('tod');
    expect(s.scene?.wardrobe.player).toBeTruthy();
    let guard = 0;
    while (s.scene && guard++ < 300) {
      const node = currentNode(s);
      if (!node) break;
      const choices = visibleChoices(s, node);
      // Bias toward leaving when available so the walk terminates.
      const leaveIdx = choices.findIndex((c) => c.text.startsWith('Call it a night'));
      const idx = guard > 12 && leaveIdx >= 0 ? leaveIdx : 0;
      s = choices.length > 0 ? reducer(s, { type: 'CHOOSE', index: idx }) : reducer(s, { type: 'CONTINUE' });
    }
    expect(guard).toBeLessThan(300);
    expect(s.screen).toBe('life');
    expect(s.k.datesCompleted).toBe(dates0);
  });

  it('$default outfit restores the wardrobe-tier baseline', () => {
    let s = reducer(initialState(21), { type: 'NEW_GAME', seed: 21 });
    s = {
      ...s,
      block: 2 as const,
      pendingParty: { day: s.day, block: 2 as const, loc: 'frat' },
    };
    s = reducer(s, { type: 'GO_TO_PARTY' });
    s = {
      ...s,
      scene: {
        ...s.scene!,
        nodeId: 'stripRedeem',
        wardrobe: { ...s.scene!.wardrobe, player: 'p-shirtless' },
        vars: { ...s.scene!.vars, loc: 'frat', spice: 3 },
      },
    };
    s = reducer(s, { type: 'CHOOSE', index: 0 });
    expect(s.scene?.wardrobe.player).toBe('p-basic');
  });

  it('the midnight plunge only appears at a spice-3 pool party, late', () => {
    let s = reducer(initialState(21), { type: 'NEW_GAME', seed: 21 });
    s = { ...s, block: 1 as const, pendingParty: { day: s.day, block: 1 as const, loc: 'pool' } };
    s = reducer(s, { type: 'GO_TO_PARTY' });
    const at = (vars: Record<string, string | number | boolean>) => {
      const st = {
        ...s,
        scene: { ...s.scene!, nodeId: 'flow', vars: { ...s.scene!.vars, ...vars } },
      };
      return visibleChoices(st, currentNode(st)!).some((c) => c.text.startsWith('Midnight.'));
    };
    expect(at({ loc: 'pool', spice: 3, beats: 3 })).toBe(true);
    expect(at({ loc: 'pool', spice: 2, beats: 3 })).toBe(false);
    expect(at({ loc: 'pool', spice: 3, beats: 1 })).toBe(false);
    expect(at({ loc: 'house', spice: 3, beats: 3 })).toBe(false);
    expect(at({ loc: 'pool', spice: 3, beats: 3, done_dip: true })).toBe(false);
  });

  it('DEBUG_PARTY spawns the chosen location at the chosen spice', () => {
    let s = reducer(initialState(5), { type: 'NEW_GAME', seed: 5 });
    s = reducer(s, { type: 'DEBUG_PARTY', loc: 'frat', spice: 3 });
    expect(s.scene?.sceneId).toBe('party');
    expect(s.scene?.vars.loc).toBe('frat');
    expect(s.scene?.vars.spice).toBe(3);
    expect(s.scene?.vars.baseSpice).toBe(3);
    expect(String(s.scene?.vars.rooms).split(',')).toContain('tod');
    // pool parties put you in swimwear
    let p = reducer(initialState(5), { type: 'NEW_GAME', seed: 5 });
    p = reducer(p, { type: 'DEBUG_PARTY', loc: 'pool', spice: 1 });
    expect(p.scene?.wardrobe.player).toBe('p-swim');
    expect(p.scene?.vars.spice).toBe(1);
  });

  it('risky dares raise party spice, saturating at 3', () => {
    let s = reducer(initialState(5), { type: 'NEW_GAME', seed: 5 });
    s = reducer(s, { type: 'DEBUG_PARTY', loc: 'house', spice: 2 });
    const bump = (st: GameState) => ({
      ...st,
      scene: { ...st.scene!, nodeId: 'todOT1', vars: { ...st.scene!.vars } },
    });
    // The blind-dare choice carries addVars { spice: 1, heat: 1 }
    s = reducer(bump(s), { type: 'CHOOSE', index: 0 });
    expect(s.scene!.vars.spice).toBe(3);
    expect(s.scene!.vars.heat).toBe(1);
    // Further risky dares cannot push spice past 3
    s = reducer(bump(s), { type: 'CHOOSE', index: 0 });
    expect(s.scene!.vars.spice).toBe(3);
    expect(s.scene!.vars.heat).toBe(2);
  });

  it('overtime only opens at spice 2+, and escalation unlocks hotter rooms', () => {
    let s = reducer(initialState(5), { type: 'NEW_GAME', seed: 5 });
    s = reducer(s, { type: 'DEBUG_PARTY', loc: 'pool', spice: 1 });
    const otAt = (spice: number) => {
      const st = {
        ...s,
        scene: { ...s.scene!, nodeId: 'todEnd', vars: { ...s.scene!.vars, spice } },
      };
      return visibleChoices(st, currentNode(st)!).some((c) => c.text.startsWith('Stay for overtime'));
    };
    expect(otAt(1)).toBe(false);
    expect(otAt(2)).toBe(true);
    expect(otAt(3)).toBe(true);
    // A party that starts mild but heats up to 3 unlocks the midnight plunge.
    const late = {
      ...s,
      scene: { ...s.scene!, nodeId: 'flow', vars: { ...s.scene!.vars, spice: 3, beats: 3 } },
    };
    expect(
      visibleChoices(late, currentNode(late)!).some((c) => c.text.startsWith('Midnight.'))
    ).toBe(true);
  });

  it('an established relationship arrives warm, not at stranger level', () => {
    const at = (stage: number, dates: number) => {
      let s = reducer(initialState(9), { type: 'NEW_GAME', seed: 9 });
      s = {
        ...s,
        k: { ...s.k, met: true, hasNumber: stage >= 2, stage, datesCompleted: dates, enthusiasm: 1 },
      };
      return reducer(s, { type: 'DEBUG_PARTY', loc: 'house', spice: 3 });
    };
    const acquaintance = at(1, 0).scene!.date!;
    const girlfriend = at(4, 3).scene!.date!;
    expect(girlfriend.meters.comfort).toBeGreaterThan(acquaintance.meters.comfort + 25);
    expect(girlfriend.meters.interest).toBeGreaterThan(acquaintance.meters.interest + 20);
    // ...and she doesn't make her boyfriend re-earn hand-holding.
    expect(acquaintance.ladder).toBe(-1);
    expect(girlfriend.ladder).toBeGreaterThanOrEqual(4);
  });

  it('escalation stays gated early and opens up late', () => {
    const verdict = (stage: number, dates: number, step: 'kiss' | 'makeOut') => {
      let s = reducer(initialState(9), { type: 'NEW_GAME', seed: 9 });
      s = {
        ...s,
        k: {
          ...s.k,
          met: true,
          hasNumber: stage >= 2,
          stage,
          datesCompleted: dates,
          enthusiasm: 2,
          flags: stage >= 4 ? { confident: true, sexy: true, nice: true } : {},
        },
      };
      s = reducer(s, { type: 'DEBUG_PARTY', loc: 'house', spice: 3 });
      s = { ...s, scene: { ...s.scene!, vars: { ...s.scene!.vars, kSpotted: true } } };
      return judgeMove(s, step).kind;
    };
    // A near-stranger cannot kiss her at a party, however the dice land.
    expect(verdict(1, 0, 'kiss')).toBe('too-fast');
    // Her boyfriend can — that was the bug: he couldn't.
    expect(verdict(4, 3, 'kiss')).toBe('auto-success');
    expect(['auto-success', 'risky']).toContain(verdict(4, 3, 'makeOut'));
  });

  it('dares also land on other people in the circle', () => {
    let s = reducer(initialState(9), { type: 'NEW_GAME', seed: 9 });
    s = reducer(s, { type: 'DEBUG_PARTY', loc: 'house', spice: 2 });
    const pool = eligible({
      ...s,
      scene: { ...s.scene!, vars: { ...s.scene!.vars, kSpotted: true, spice: 2, heat: 2 } },
    });
    expect(pool.some((d) => d.target === 'npc')).toBe(true);
    // The circle is cast from the venue's roster.
    const names = new Set(Array.from({ length: 12 }, (_, i) => rollNpc(s, i / 12)));
    expect([...names].every((n) => CIRCLE.house.includes(n))).toBe(true);
    expect(names.size).toBeGreaterThan(1);
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

describe('party v2: locations, spice, outfits, truth or dare', () => {
  function startParty(seed: number, loc: string): GameState {
    let s = reducer(initialState(seed), { type: 'NEW_GAME', seed });
    s = {
      ...s,
      block: 2 as const,
      pendingParty: { day: s.day, block: 2 as const, loc },
      k: { ...s.k, met: true, hasNumber: true, firstTextDone: true, stage: 3, datesCompleted: 1 },
    };
    return reducer(s, { type: 'GO_TO_PARTY' });
  }

  it('pool parties put everyone in swimwear', () => {
    const s = startParty(5, 'pool');
    expect(s.scene?.wardrobe.player).toBe('p-swim');
    expect(s.scene?.wardrobe.k).toBe('k-swim');
  });

  it('every location rolls a truth-or-dare circle, a spice level, and its own id', () => {
    for (const loc of Object.keys(PARTY_LOCATIONS)) {
      const s = startParty(11, loc);
      expect(String(s.scene?.vars.rooms).split(',')).toContain('tod');
      expect([1, 2, 3]).toContain(Number(s.scene?.vars.spice));
      expect(s.scene?.vars.loc).toBe(loc);
    }
  });

  it('strip pong only appears at a spice-3 frat party', () => {
    let s = startParty(7, 'frat');
    s = {
      ...s,
      scene: { ...s.scene!, nodeId: 'pong', vars: { ...s.scene!.vars, spice: 3, rooms: 'tod,pong,keg' } },
    };
    expect(visibleChoices(s, currentNode(s)!).some((c) => c.text.includes('STRIP PONG'))).toBe(true);
    const mild = { ...s, scene: { ...s.scene!, vars: { ...s.scene!.vars, spice: 1 } } };
    expect(visibleChoices(mild, currentNode(mild)!).some((c) => c.text.includes('STRIP PONG'))).toBe(false);
  });

  it('garments are tracked per slot and come off outermost-first', () => {
    let s = startParty(7, 'frat');
    expect(s.scene?.garments?.player).toEqual({
      shirt: 'shirt',
      pants: 'jeans',
      boxers: 'boxers',
    });
    expect(Object.keys(s.scene!.garments!.k)).toEqual(
      expect.arrayContaining(['jacket', 'shirt', 'pants', 'bra', 'panties'])
    );
    // A forfeit takes the outermost item, then the next, in order.
    const drawStrip = (st: GameState): GameState => {
      const at = {
        ...st,
        scene: { ...st.scene!, nodeId: 'dareDraw', vars: { ...st.scene!.vars, spice: 3, dare: 'strip-self' } },
      };
      const idx = visibleChoices(at, currentNode(at)!).findIndex((c) => c.text.startsWith('Take it off'));
      return reducer(at, { type: 'CHOOSE', index: idx });
    };
    s = drawStrip(s);
    expect(s.scene?.garments?.player).toEqual({ pants: 'jeans', boxers: 'boxers' });
    s = drawStrip(s);
    expect(s.scene?.garments?.player).toEqual({ boxers: 'boxers' });
    s = drawStrip(s);
    expect(s.scene?.garments?.player).toEqual({});
  });

  it('dares are drawn at random from a pool gated by heat and inventory', () => {
    const s = startParty(7, 'frat');
    const at = (spice: number, heat: number, over: Partial<Record<string, unknown>> = {}) => ({
      ...s,
      scene: { ...s.scene!, vars: { ...s.scene!.vars, spice, heat, kSpotted: true, ...over } },
    });
    // Tier 1 table: only silly dares are legal.
    expect(eligible(at(1, 0)).every((d) => d.tier === 1)).toBe(true);
    // Tier 3 table with a comfortable date: kiss/strip/dance unlock.
    const hot = at(3, 3);
    hot.scene.date = {
      ...hot.scene.date!,
      meters: { interest: 80, comfort: 80, momentum: 70 },
    };
    const kinds = new Set(eligible(hot).map((d) => d.kind));
    expect(kinds.has('strip')).toBe(true);
    expect(kinds.has('kiss')).toBe(true);
    expect(kinds.has('dance')).toBe(true);
    // Rolling is seeded and produces varied ids across the pool.
    const ids = new Set(Array.from({ length: 20 }, (_, i) => rollDare(hot, i / 20)));
    expect(ids.size).toBeGreaterThan(2);
    // Already-drawn dares don't come back.
    const drawn = { ...hot, scene: { ...hot.scene, vars: { ...hot.scene.vars, drawn: 'strip-self,kiss-lips' } } };
    expect(eligible(drawn).map((d) => d.id)).not.toContain('strip-self');
    expect(eligible(drawn).map((d) => d.id)).not.toContain('kiss-lips');
  });

  it('all four locations play through to the end', () => {
    for (const loc of Object.keys(PARTY_LOCATIONS)) {
      let s = startParty(13, loc);
      let guard = 0;
      while (s.scene && guard++ < 300) {
        const node = currentNode(s);
        if (!node) break;
        const choices = visibleChoices(s, node);
        const leaveIdx = choices.findIndex((c) => c.text.startsWith('Call it a night'));
        const idx = guard > 14 && leaveIdx >= 0 ? leaveIdx : 0;
        s = choices.length > 0 ? reducer(s, { type: 'CHOOSE', index: idx }) : reducer(s, { type: 'CONTINUE' });
      }
      expect(guard, `walk at ${loc}`).toBeLessThan(300);
      expect(s.screen).toBe('life');
    }
  });
});
