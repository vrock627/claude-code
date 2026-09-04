import { describe, expect, it } from 'vitest';
import { currentNode, initialState, reducer, visibleChoices } from '../src/engine/reducer';
import { DARE_BY_ID } from '../src/content/dares';

const gfParty = (seed: number) => {
  let s = reducer(initialState(seed), { type: 'NEW_GAME', seed });
  s = { ...s, k: { ...s.k, met: true, hasNumber: true, stage: 4, datesCompleted: 3, enthusiasm: 3,
        flags: { nice: true, confident: true, sexy: true, funny: true } } };
  s = reducer(s, { type: 'DEBUG_PARTY', loc: 'house', spice: 3 });
  return { ...s, scene: { ...s.scene!, vars: { ...s.scene!.vars, kSpotted: true } } };
};

describe('npc dares resolve end-to-end', () => {
  it('every dare in the deck renders a prompt and has a resolving choice', () => {
    const s = gfParty(11);
    const missing: string[] = [];
    for (const d of Object.values(DARE_BY_ID)) {
      const at = { ...s, scene: { ...s.scene!, nodeId: 'dareDraw',
        vars: { ...s.scene!.vars, dare: d.id, npc: 'Gus', heat: 3, draws: 1, dareReturn: 'todR2' } } };
      const prompt = d.prompt(at);
      if (!prompt || prompt.length < 10) missing.push(`${d.id}: no prompt`);
      const choices = visibleChoices(at, currentNode(at)!);
      // every dare must offer at least one non-refusal way to answer it
      const answers = choices.filter((c) => !/^Refuse/.test(c.text));
      if (answers.length === 0) missing.push(`${d.id}: no way to answer`);
      // and taking the first answer must land on a real node
      const next = reducer(at, { type: 'CHOOSE', index: choices.indexOf(answers[0]) });
      if (!currentNode(next)) missing.push(`${d.id}: dead end`);
    }
    expect(missing).toEqual([]);
  });

  it('npc dares route to the spectator branch, not the player branch', () => {
    const s = gfParty(11);
    for (const id of ['npc-truth', 'npc-strip', 'npc-kiss', 'npc-dance', 'npc-strip-hot']) {
      const at = { ...s, scene: { ...s.scene!, nodeId: 'dareDraw',
        vars: { ...s.scene!.vars, dare: id, npc: 'Bex', heat: 3, dareReturn: 'todR2' } } };
      const choices = visibleChoices(at, currentNode(at)!);
      expect(choices.some((c) => c.text.startsWith('Watch it happen')), id).toBe(true);
      expect(choices.some((c) => c.text.startsWith('Heckle')), id).toBe(true);
      const out = reducer(at, { type: 'CHOOSE', index: choices.findIndex((c) => c.text.startsWith('Watch')) });
      expect(out.scene!.nodeId, id).toBe('dareNpc');
      // the resolution names whoever it landed on
      expect(String((currentNode(out)!.text as (x: unknown) => string)(out))).toContain('Bex');
    }
  });

  it('the dealer-choice card hands the player the pen', () => {
    const s = gfParty(11);
    const at = { ...s, scene: { ...s.scene!, nodeId: 'dareDraw',
      vars: { ...s.scene!.vars, dare: 'npc-assign', npc: 'Gus', heat: 3, dareReturn: 'todR2' } } };
    const choices = visibleChoices(at, currentNode(at)!);
    const labels = choices.map((c) => c.text);
    expect(labels.some((t) => /gentle/.test(t))).toBe(true);
    expect(labels.some((t) => /devastating/.test(t))).toBe(true);
    expect(labels.some((t) => /Everyone\. Same dare/.test(t))).toBe(true);
  });
});
