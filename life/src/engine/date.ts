// The date engine: expectation ladder, move resolution, body-language cues,
// and end-of-date scoring. Her numbers are hidden — the UI only ever shows
// prose cues and the portrait mood.

import {
  clamp,
  LADDER,
  type DateMeters,
  type DateSession,
  type FlagId,
  type GameState,
  type LadderStep,
  type Mood,
  type RollResult,
} from './types';
import { momentumBonus, rollD20, statBonus, nextRand } from './rolls';
import { CUES } from '../content/krystalle';

// ---------------------------------------------------------------------------
// Ladder requirements
// ---------------------------------------------------------------------------

interface StepReq {
  comfort: number; // base comfort needed
  interest: number; // interest floor — below this she's just not into it
  minDate: number; // earliest date number (0 = the first encounter)
  minStage: number; // relationship stage gate
  needsAll?: FlagId[]; // hard flag requirements
  needsAny?: FlagId[];
}

export const STEP_REQS: Record<LadderStep, StepReq> = {
  compliment: { comfort: 12, interest: 10, minDate: 0, minStage: 0 },
  lightTouch: { comfort: 30, interest: 25, minDate: 0, minStage: 0 },
  holdHands: { comfort: 45, interest: 40, minDate: 1, minStage: 2 },
  leanClose: { comfort: 55, interest: 50, minDate: 1, minStage: 2 },
  kiss: { comfort: 68, interest: 60, minDate: 1, minStage: 2 },
  makeOut: {
    comfort: 78,
    interest: 68,
    minDate: 2,
    minStage: 3,
    needsAny: ['sexy', 'confident'],
  },
  inviteHome: {
    comfort: 85,
    interest: 74,
    minDate: 2,
    minStage: 3,
    needsAll: ['sexy'],
    needsAny: ['confident', 'gentleman'],
  },
  bedroom: {
    comfort: 92,
    interest: 82,
    minDate: 3,
    minStage: 3,
    needsAll: ['sexy', 'confident'],
  },
};

export function stepIndex(step: LadderStep): number {
  return LADDER.indexOf(step);
}

// Effective comfort requirement after flags, enthusiasm, and skipped rungs.
export function effectiveRequirement(s: GameState, step: LadderStep): number {
  const d = s.scene!.date!;
  const req = STEP_REQS[step];
  let need = req.comfort;

  const f = s.k.flags;
  if (f.confident) need -= 3;
  if (f.gentleman && (step === 'inviteHome' || step === 'bedroom')) need -= 5;
  if (f.tryhard) need += 5;
  if (f.creep) need += 15;

  need -= s.k.enthusiasm * 2;

  // Escalating gradually is smooth; vaulting rungs is not.
  const skipped = Math.max(0, stepIndex(step) - (d.ladder + 1));
  need += skipped * 8;

  return need;
}

// Spontaneity window: when the night is electric she'll go off-script — hard
// date-number gates soften by one date. Confidence, rewarded.
export function spontaneityActive(d: DateSession): boolean {
  return d.meters.momentum >= 80 && d.meters.interest >= 70;
}

export type MoveVerdict =
  | { kind: 'auto-success' }
  | { kind: 'risky'; dc: number }
  | { kind: 'rebuff' } // interest floor not met — a kind no
  | { kind: 'too-fast'; severe: boolean };

export function judgeMove(s: GameState, step: LadderStep): MoveVerdict {
  const d = s.scene!.date!;
  const req = STEP_REQS[step];
  const idx = stepIndex(step);

  // Hard gates: relationship stage, date number, required flags.
  const minDate = spontaneityActive(d) ? Math.max(0, req.minDate - 1) : req.minDate;
  const gated =
    d.dateNumber < minDate ||
    s.k.stage < req.minStage ||
    (req.needsAll ?? []).some((fl) => !s.k.flags[fl]) ||
    (req.needsAny ? !req.needsAny.some((fl) => s.k.flags[fl]) : false);
  if (gated) {
    return { kind: 'too-fast', severe: idx >= stepIndex('inviteHome') };
  }

  if (d.meters.interest < req.interest) return { kind: 'rebuff' };

  const need = effectiveRequirement(s, step);
  const margin = d.meters.comfort - need;
  if (margin >= 0) return { kind: 'auto-success' };
  if (margin >= -12) return { kind: 'risky', dc: 10 + Math.ceil(-margin / 2) };
  return { kind: 'too-fast', severe: margin < -26 || idx >= stepIndex('inviteHome') };
}

export interface MoveOutcome {
  session: DateSession;
  flags: FlagId[]; // flags earned/incurred
  seed: number;
  success: boolean;
  strike: boolean;
  routeDead: boolean;
  roll: RollResult | null;
}

export function resolveMove(s: GameState, step: LadderStep): MoveOutcome {
  const d = s.scene!.date!;
  const idx = stepIndex(step);
  const verdict = judgeMove(s, step);
  const m = { ...d.meters };
  let seed = s.seed;
  let roll: RollResult | null = null;
  let success = false;
  let strike = false;
  let routeDead = false;
  const flags: FlagId[] = [];

  const applySuccess = () => {
    success = true;
    m.interest = clamp(m.interest + 4 + idx * 1.5, 0, 100);
    m.momentum = clamp(m.momentum + 10, 0, 100);
    m.comfort = clamp(m.comfort + 4, 0, 100);
    if (idx >= stepIndex('kiss')) flags.push('sexy');
    if (idx >= stepIndex('leanClose')) flags.push('confident');
  };

  switch (verdict.kind) {
    case 'auto-success':
      applySuccess();
      break;
    case 'risky': {
      const r = rollD20(seed);
      seed = r.seed;
      const bonus = statBonus(s, 'charm') + momentumBonus(m.momentum);
      const total = r.roll + bonus;
      const crit = r.roll === 20;
      const fumble = r.roll === 1;
      const ok = !fumble && (crit || total >= verdict.dc);
      roll = {
        kind: 'move',
        label: `Bold move: ${step}`,
        roll: r.roll,
        bonus,
        total,
        dc: verdict.dc,
        success: ok,
        crit,
        fumble,
      };
      if (ok) {
        applySuccess();
        // Pulling it off when it wasn't a sure thing is what smooth means.
        m.interest = clamp(m.interest + 4, 0, 100);
        flags.push('confident');
      } else if (fumble) {
        strike = true;
        m.comfort = clamp(m.comfort - 15, 0, 100);
        m.momentum = clamp(m.momentum - 20, 0, 100);
        m.interest = clamp(m.interest - 5, 0, 100);
      } else {
        // Soft rebuff — she deflects with wit, no strike, but the air cools.
        m.comfort = clamp(m.comfort - 6, 0, 100);
        m.momentum = clamp(m.momentum - 10, 0, 100);
      }
      break;
    }
    case 'rebuff':
      m.momentum = clamp(m.momentum - 8, 0, 100);
      m.comfort = clamp(m.comfort - 4, 0, 100);
      break;
    case 'too-fast': {
      strike = true;
      const severe = verdict.severe;
      m.comfort = clamp(m.comfort - (severe ? 24 : 15), 0, 100);
      m.momentum = clamp(m.momentum - 20, 0, 100);
      m.interest = clamp(m.interest - (severe ? 10 : 5), 0, 100);
      if (severe) {
        flags.push('creep');
        if (s.k.flags.creep) routeDead = true; // twice past the line — done
      }
      break;
    }
  }

  const strikes = d.strikes + (strike ? 1 : 0);
  const session: DateSession = {
    ...d,
    meters: m,
    strikes,
    ladder: success ? Math.max(d.ladder, idx) : d.ladder,
    recentStrike: strike,
    recentKiss: success && idx >= stepIndex('kiss'),
    lastRoll: roll,
  };
  if (strikes >= 3) {
    session.over = true;
    session.outcome = routeDead ? 'route-dead' : 'crash';
  }
  if (routeDead) {
    session.over = true;
    session.outcome = 'route-dead';
  }
  return { session, flags, seed, success, strike, routeDead, roll };
}

// Per-turn drift: conversation flow fades unless fed.
export function turnDecay(d: DateSession): DateSession {
  return {
    ...d,
    turn: d.turn + 1,
    recentStrike: false,
    meters: { ...d.meters, momentum: clamp(d.meters.momentum - 3, 0, 100) },
  };
}

// ---------------------------------------------------------------------------
// Cues + portrait mood — the only window into her state
// ---------------------------------------------------------------------------

export function deriveMood(d: DateSession): Mood {
  const { interest, comfort, momentum } = d.meters;
  if (d.recentStrike) return comfort < 35 ? 'uneasy' : 'annoyed';
  if (comfort < 28) return 'uneasy';
  if (d.recentKiss || (d.ladder >= stepIndex('kiss') && comfort >= 70)) return 'flushed';
  if (momentum >= 70 && interest >= 45) return 'laughing';
  if (interest >= 60) return 'warm';
  return 'neutral';
}

export function pickCue(d: DateSession, seed: number): { cue: string; seed: number } {
  const { interest, comfort, momentum } = d.meters;
  let pool: string[];
  if (d.recentStrike) pool = CUES.afterStrike;
  else if (comfort < 32) pool = CUES.comfortLow;
  else if (interest < 30) pool = CUES.interestLow;
  else if (momentum >= 72) pool = CUES.momentumHigh;
  else if (comfort >= 72) pool = CUES.comfortHigh;
  else if (interest >= 65) pool = CUES.interestHigh;
  else if (momentum < 25) pool = CUES.momentumLow;
  else pool = CUES.comfortMid;
  const { value, seed: s2 } = nextRand(seed);
  return { cue: pool[Math.floor(value * pool.length)], seed: s2 };
}

// ---------------------------------------------------------------------------
// Starting meters + scoring
// ---------------------------------------------------------------------------

export function startMeters(s: GameState, dateNumber: number): DateMeters {
  const f = s.k.flags;
  let interest = 34 + s.k.enthusiasm * 3 + (f.funny ? 4 : 0) + (f.smart ? 3 : 0);
  let comfort = 26 + s.k.enthusiasm * 3 + (f.nice ? 5 : 0) + (f.gentleman ? 4 : 0);
  if (dateNumber >= 2) {
    interest += 8;
    comfort += 10;
  }
  if (f.creep) comfort -= 15;
  if (f.boring) interest -= 8;
  // Showing up put together matters most early.
  comfort += Math.min(6, s.wardrobeTier * 2);
  return {
    interest: clamp(interest, 5, 70),
    comfort: clamp(comfort, 5, 70),
    // Arriving in a good headspace shows: mood feeds opening momentum.
    momentum: clamp(40 + Math.round((s.mood - 50) / 5), 20, 60),
  };
}

export interface DateScore {
  score: number;
  grade: 'amazing' | 'good' | 'okay' | 'bad';
}

export function scoreDate(s: GameState, d: DateSession): DateScore {
  const f = s.k.flags;
  let score = d.meters.interest + d.meters.comfort / 2 + Math.max(0, d.ladder) * 5;
  for (const fl of ['nice', 'funny', 'sexy', 'smart', 'confident', 'gentleman'] as const) {
    if (f[fl]) score += 4;
  }
  for (const fl of ['tryhard', 'creep', 'boring'] as const) {
    if (f[fl]) score -= 10;
  }
  score -= d.strikes * 12;
  const grade =
    score >= 110 ? 'amazing' : score >= 85 ? 'good' : score >= 60 ? 'okay' : 'bad';
  return { score: Math.round(score), grade };
}
