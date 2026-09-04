import { describe, expect, it } from 'vitest';
import { currentNode, initialState, reducer, visibleChoices } from '../src/engine/reducer';

// A party with a forced kiss-lips card on the table.
const kissCard = (stage: number, dates: number, seed: number) => {
  let s = reducer(initialState(seed), { type: 'NEW_GAME', seed });
  s = {
    ...s,
    k: {
      ...s.k,
      met: true,
      hasNumber: true,
      stage,
      datesCompleted: dates,
      enthusiasm: 3,
      flags: stage >= 4 ? { nice: true, confident: true, sexy: true, funny: true } : {},
    },
  };
  s = reducer(s, { type: 'DEBUG_PARTY', loc: 'house', spice: 3 });
  if (!s.scene!.date) return null; // she didn't come to this one
  return {
    ...s,
    scene: {
      ...s.scene!,
      nodeId: 'dareDraw',
      vars: { ...s.scene!.vars, kSpotted: true, heat: 3, dareReturn: 'todR2', dare: 'kiss-lips' },
    },
  };
};

describe('the kiss dare on the real dare path', () => {
  it('lands every time for a girlfriend, at every party she attends', () => {
    const outcomes: string[] = [];
    for (let seed = 1; seed <= 40; seed++) {
      const s = kissCard(4, 3, seed);
      if (!s) continue;
      const choices = visibleChoices(s, currentNode(s)!);
      const idx = choices.findIndex((c) => c.text.startsWith('Look at her first'));
      expect(idx, `seed ${seed}: the ask-first choice must be offered`).toBeGreaterThanOrEqual(0);
      outcomes.push(reducer(s, { type: 'CHOOSE', index: idx }).scene!.nodeId);
    }
    expect(outcomes.length).toBeGreaterThan(10);
    expect(new Set(outcomes)).toEqual(new Set(['dareKissLips']));
  });

  it('still turns down a near-stranger holding the same card', () => {
    const s = kissCard(1, 0, 11);
    if (!s) return;
    const choices = visibleChoices(s, currentNode(s)!);
    const idx = choices.findIndex((c) => c.text.startsWith('Look at her first'));
    if (idx < 0) return; // card not even offered at this stage — also a pass
    expect(reducer(s, { type: 'CHOOSE', index: idx }).scene!.nodeId).not.toBe('dareKissLips');
  });

  it('reading her state never throws at a party she skipped', () => {
    for (let seed = 1; seed <= 40; seed++) {
      let s = reducer(initialState(seed), { type: 'NEW_GAME', seed });
      s = { ...s, k: { ...s.k, met: true, hasNumber: true, stage: 3, datesCompleted: 2 } };
      s = reducer(s, { type: 'DEBUG_PARTY', loc: 'house', spice: 3 });
      if (s.scene!.date) continue;
      const at = { ...s, scene: { ...s.scene!, nodeId: 'flow', vars: { ...s.scene!.vars, beats: 2 } } };
      expect(() => visibleChoices(at, currentNode(at)!).map((c) => c.text)).not.toThrow();
    }
  });
});
