// Life-layer mechanics: working, training, rent week, sleeping, and the
// odds that Krystalle turns up somewhere.

import { clamp, type GameState } from './types';
import { nextRand } from './rolls';
import { JOB_TIERS, HOME_TIERS } from '../content/lifeContent';

export const SHIFTS_REQUIRED_PER_WEEK = 3;

export function workShift(s: GameState): GameState {
  const tier = JOB_TIERS[s.job.tier];
  const strongShift = s.energy >= 60;
  let performance = s.job.performance + (strongShift ? 10 : 6);
  let jobTier = s.job.tier;
  const toasts: string[] = [
    `Shift done. +$${tier.pay}${strongShift ? ' — sharp work today.' : '.'}`,
  ];
  if (performance >= 100 && jobTier < JOB_TIERS.length - 1) {
    jobTier += 1;
    performance = 40;
    toasts.push(`Promoted: ${JOB_TIERS[jobTier].name}.`);
  } else {
    performance = clamp(performance, 0, 100);
  }
  return {
    ...s,
    money: s.money + tier.pay,
    energy: clamp(s.energy - tier.energyCost, 0, 100),
    job: {
      ...s.job,
      tier: jobTier,
      performance,
      shiftsWorked: s.job.shiftsWorked + 1,
    },
    toasts: [...s.toasts, ...toasts],
  };
}

export function begForJob(s: GameState): GameState {
  return {
    ...s,
    job: { ...s.job, fired: false, performance: 25, warnings: 0, shiftsWorked: 0 },
    mood: clamp(s.mood - 10, 0, 100),
    toasts: [...s.toasts, 'Marco takes you back. Base of the ladder. Again.'],
  };
}

// Weekly settle-up, run on the morning a new week starts (day 8, 15, ...).
export function weeklySettleUp(s: GameState): GameState {
  let out = { ...s, toasts: [...s.toasts] };
  const rent = HOME_TIERS[out.homeTier].rent;

  if (out.money >= rent) {
    out.money -= rent;
    out.toasts.push(`Rent paid: -$${rent}.`);
    out.rentMissed = 0;
  } else {
    out.rentMissed += 1;
    out.mood = clamp(out.mood - 20, 0, 100);
    out.toasts.push(
      out.rentMissed >= 2
        ? 'Second missed rent. The locks change while you’re out.'
        : `You can’t make rent ($${rent}). One more miss and you’re out.`
    );
    if (out.rentMissed >= 2) {
      out.gameOver =
        'Evicted. The life fell apart before the love life could. Game over.';
      out.screen = 'gameover';
      return out;
    }
  }

  if (!out.job.fired) {
    if (out.job.shiftsWorked < SHIFTS_REQUIRED_PER_WEEK) {
      const warnings = out.job.warnings + 1;
      if (warnings >= 2) {
        out.job = { ...out.job, fired: true, warnings };
        out.toasts.push('Fired. Marco didn’t even yell. That was worse.');
      } else {
        out.job = { ...out.job, warnings };
        out.toasts.push('Written up for missing shifts. Strike one at work.');
      }
    } else {
      out.job = { ...out.job, warnings: Math.max(0, out.job.warnings) };
    }
    out.job = { ...out.job, shiftsWorked: 0 };
  }

  return out;
}

export function sleep(s: GameState): GameState {
  let out: GameState = {
    ...s,
    day: s.day + 1,
    block: 0,
    energy: clamp(HOME_TIERS[s.homeTier].rest + (s.block <= 2 ? 8 : -6), 0, 100),
    mood: clamp(s.mood + 8, 0, 100),
    toasts: [],
    k: { ...s.k, textedToday: false },
  };

  // Stood her up?
  const pd = out.k.pendingDate;
  if (pd && pd.day < out.day) {
    out.k = {
      ...out.k,
      pendingDate: null,
      enthusiasm: clamp(out.k.enthusiasm - 3, -3, 3),
      flags: { ...out.k.flags },
    };
    out.toasts.push(
      'Krystalle: "so that happened. or didn’t. 🙃" — you stood her up.'
    );
    if (out.k.enthusiasm <= -3) {
      out.k = {
        ...out.k,
        routeDead: true,
        routeDeadReason: 'She stopped replying. Fair enough.',
      };
    }
  }

  if ((out.day - 1) % 7 === 0 && out.day > 1) {
    out = weeklySettleUp(out);
  }
  return out;
}

// Does Krystalle turn up at this venue right now?
export function encounterRoll(
  s: GameState,
  venue: string
): { hit: boolean; seed: number } {
  if (s.k.routeDead || s.k.hasNumber) return { hit: false, seed: s.seed };
  const base = s.k.met ? 0.35 : 0.45;
  const chance = Math.max(0.12, base - s.k.fumbles * 0.12);
  const { value, seed } = nextRand(s.seed);
  return { hit: value < chance, seed };
}
