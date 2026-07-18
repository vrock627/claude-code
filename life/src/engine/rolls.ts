import type { GameState, RollResult, StatId } from './types';

// Deterministic RNG (mulberry32). The seed lives in GameState and every draw
// returns the advanced seed, keeping the reducer pure and tests reproducible.
export function nextRand(seed: number): { value: number; seed: number } {
  let t = (seed + 0x6d2b79f5) | 0;
  let x = Math.imul(t ^ (t >>> 15), 1 | t);
  x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
  const value = ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  return { value, seed: t };
}

export function rollD20(seed: number): { roll: number; seed: number } {
  const { value, seed: s } = nextRand(seed);
  return { roll: 1 + Math.floor(value * 20), seed: s };
}

// Stat bonus: every 2 points of a stat = +1, plus momentum flow bonus on dates.
export function statBonus(s: GameState, stat: StatId): number {
  let bonus = Math.floor(s.stats[stat] / 2);
  if (stat === 'style') bonus += Math.floor(s.wardrobeTier / 2);
  return bonus;
}

export function momentumBonus(momentum: number): number {
  if (momentum >= 75) return 3;
  if (momentum >= 50) return 1;
  if (momentum >= 25) return 0;
  return -2;
}

export interface ResolvedRoll {
  result: RollResult;
  seed: number;
}

export function resolveCheck(
  s: GameState,
  stat: StatId,
  dc: number,
  label: string,
  kind: RollResult['kind'] = 'check'
): ResolvedRoll {
  const { roll, seed } = rollD20(s.seed);
  const momentum = s.scene?.date ? s.scene.date.meters.momentum : 50;
  const bonus = statBonus(s, stat) + momentumBonus(momentum);
  const total = roll + bonus;
  const crit = roll === 20;
  const fumble = roll === 1;
  const success = !fumble && (crit || total >= dc);
  return {
    result: { kind, label, roll, bonus, total, dc, success, crit, fumble },
    seed,
  };
}
