import { describe, expect, it } from 'vitest';
import { SCENES } from '../src/content/scenes';

describe('scene graph integrity', () => {
  it('every node target exists and every node is reachable', () => {
    const broken: string[] = [];
    const unreachable: string[] = [];
    for (const scene of Object.values(SCENES)) {
      const ids = new Set(Object.keys(scene.nodes));
      const targets = (nodeId: string): string[] => {
        const n = scene.nodes[nodeId];
        const out: string[] = [];
        if (n.next) out.push(n.next);
        for (const c of n.choices ?? []) {
          if (c.goto) out.push(c.goto);
          if (c.moveWin) out.push(c.moveWin);
          if (c.moveLose) out.push(c.moveLose);
          if (c.check) out.push(c.check.onWin, c.check.onLose);
          if (c.judge) out.push(c.judge.onPass, c.judge.onFail);
        }
        return out;
      };
      for (const id of ids) {
        for (const t of targets(id)) {
          if (!ids.has(t)) broken.push(`${scene.id}: ${id} -> ${t}`);
        }
      }
      // reachability from start (+ 'crash', which the engine jumps to)
      const seen = new Set<string>();
      const stack = [scene.start, ...(ids.has('crash') ? ['crash'] : [])];
      while (stack.length) {
        const id = stack.pop()!;
        if (seen.has(id) || !ids.has(id)) continue;
        seen.add(id);
        stack.push(...targets(id));
      }
      for (const id of ids) if (!seen.has(id)) unreachable.push(`${scene.id}: ${id}`);
    }
    expect({ broken, unreachable }).toEqual({ broken: [], unreachable: [] });
  });
});
