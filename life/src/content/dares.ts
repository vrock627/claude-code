// The dare deck. Dares are rolled, not scripted: the circle draws from a pool
// filtered by the party's current spice, the accumulated heat of the game, who
// is actually present, and what everyone still has on. The same seat at the
// same party produces a different night every time.
//
// Tiers:
//   1  silly — the circle is being kind
//   2  bold  — a garment, a cheek, a performance
//   3  hot   — lips, a lap dance, the last layer
// A dare's tier must be <= the table's current heat tier (spice + escalation).

import type { GameState } from '../engine/types';
import { count, isBare, isStripped, outermost, type Garments } from './garments';

export type DareKind = 'silly' | 'strip' | 'kiss' | 'dance';

export interface Dare {
  id: string;
  kind: DareKind;
  tier: 1 | 2 | 3;
  /** Who the dare puts on the spot. */
  target: 'player' | 'k' | 'both' | 'npc';
  /** Read out by the chairman. */
  prompt: (s: GameState) => string;
  /** Extra gate beyond tier (e.g. she has to be here, or comfortable enough). */
  ok?: (s: GameState) => boolean;
}

const g = (s: GameState, who: 'player' | 'k'): Garments =>
  (s.scene!.garments?.[who] ?? {}) as Garments;
const kHere = (s: GameState) => s.scene!.vars.kSpotted === true;
const meters = (s: GameState) => s.scene!.date?.meters ?? { interest: 0, comfort: 0, momentum: 0 };
const loc = (s: GameState) => String(s.scene!.vars.loc ?? 'house');

// The rest of the circle. Dares land on them too — most of the night is
// watching other people answer the deck, which is the actual pleasure of the
// game and gives the player room to breathe between their own turns.
export const CIRCLE: Record<string, string[]> = {
  house: ['Dex', 'the chairman', 'Bex', 'Gus', 'the guy asleep in the beanbag'],
  frat: ['Tanner', 'the chairman', 'Gus', 'a pledge named Milo', 'Dex'],
  pool: ['Priya', 'Dex', 'a man everyone calls Squid', 'the chairman'],
  rooftop: ['Noor', 'Dex', 'the roof philosopher', 'the chairman'],
};

export function rollNpc(s: GameState, r: number): string {
  const cast = CIRCLE[loc(s)] ?? CIRCLE.house;
  return cast[Math.floor(r * cast.length) % cast.length];
}

/** Whoever the current dare landed on, when it isn't you or her. */
const npc = (s: GameState) => String(s.scene!.vars.npc ?? 'the chairman');

/** Table heat tier: base spice, pushed up by how far the game has already gone. */
export function heatTier(s: GameState): 1 | 2 | 3 {
  const spice = Number(s.scene!.vars.spice ?? 1);
  const heat = Number(s.scene!.vars.heat ?? 0);
  return Math.min(3, Math.max(1, spice + (heat >= 4 ? 1 : 0))) as 1 | 2 | 3;
}

const SILLY: Dare[] = [
  {
    id: 'trailer',
    kind: 'silly',
    tier: 1,
    target: 'player',
    prompt: () =>
      'the chairman draws: “Speak only in movie-trailer voice until the bottle comes back to you.”',
  },
  {
    id: 'eulogy',
    kind: 'silly',
    tier: 1,
    target: 'player',
    prompt: (s) =>
      loc(s) === 'pool'
        ? 'the chairman draws: “Deliver a eulogy for the inflatable flamingo. It has passed. Nobody said anything.”'
        : 'the chairman draws: “Deliver a eulogy for the last drink you finished. Full honors.”',
  },
  {
    id: 'serenade',
    kind: 'silly',
    tier: 1,
    target: 'player',
    prompt: (s) =>
      loc(s) === 'frat'
        ? 'the chairman draws: “Serenade the keg. One full verse. It has feelings.”'
        : 'the chairman draws: “Serenade the nearest appliance. One full verse. Mean it.”',
  },
  {
    id: 'documentary',
    kind: 'silly',
    tier: 1,
    target: 'player',
    prompt: () =>
      'the chairman draws: “Narrate this room for two minutes as a nature documentary. Names optional, cruelty encouraged.”',
  },
  {
    id: 'impression',
    kind: 'silly',
    tier: 1,
    target: 'player',
    prompt: () => 'the chairman draws: “Do an impression of someone in this circle until we guess who.”',
  },
  {
    id: 'kimpression',
    kind: 'silly',
    tier: 2,
    target: 'k',
    ok: kHere,
    prompt: () =>
      'the chairman draws, and reads it to Krystalle: “Do an impression of the person to your right.” The person to your right is you.',
  },
];

const STRIP: Dare[] = [
  {
    id: 'strip-self',
    kind: 'strip',
    tier: 2,
    target: 'player',
    ok: (s) => count(g(s, 'player')) > 0,
    prompt: (s) => {
      const slot = outermost(g(s, 'player'));
      return `the chairman draws: “Lose a layer. Dealer’s choice is no choice — outermost goes.” For you, that is the ${slot}.`;
    },
  },
  {
    id: 'strip-k',
    kind: 'strip',
    tier: 2,
    target: 'k',
    ok: (s) => kHere(s) && count(g(s, 'k')) > 0,
    prompt: (s) => {
      const slot = outermost(g(s, 'k'));
      return `the chairman draws, and turns the card toward Krystalle: “Lose a layer.” Hers is the ${slot}. The circle inhales.`;
    },
  },
  {
    id: 'strip-both',
    kind: 'strip',
    tier: 3,
    target: 'both',
    ok: (s) => kHere(s) && count(g(s, 'player')) > 0 && count(g(s, 'k')) > 0,
    prompt: () =>
      'the chairman draws and holds it up with both hands: “Matched pair. Both of you, one layer, at the same time. The circle counts it down.”',
  },
  {
    id: 'strip-last',
    kind: 'strip',
    tier: 3,
    target: 'player',
    ok: (s) => isStripped(g(s, 'player')),
    prompt: () =>
      'the chairman draws, reads it, and lets out a low whistle: “Last layer. That’s the card. That’s all it says.”',
  },
];

const KISS: Dare[] = [
  {
    id: 'kiss-cheek',
    kind: 'kiss',
    tier: 2,
    target: 'k',
    ok: (s) => kHere(s) && meters(s).comfort >= 35,
    prompt: () => 'the chairman draws: “Kiss someone in this circle on the cheek. You pick. We all know.”',
  },
  {
    id: 'kiss-lips',
    kind: 'kiss',
    tier: 3,
    target: 'k',
    ok: (s) => kHere(s) && meters(s).comfort >= 55 && meters(s).interest >= 50,
    prompt: () =>
      'the chairman draws, and the circle reads his face before he reads the card: “On the mouth. Circle as witness. No negotiating with the deck.”',
  },
  {
    id: 'kiss-long',
    kind: 'kiss',
    tier: 3,
    target: 'k',
    ok: (s) =>
      kHere(s) &&
      meters(s).comfort >= 70 &&
      meters(s).interest >= 65 &&
      Number(s.scene!.vars.heat ?? 0) >= 3,
    prompt: () =>
      'the chairman draws and simply turns the card around so everyone can read it at once: “Ten seconds. Timed out loud. Try to remember there are witnesses.”',
  },
];

const DANCE: Dare[] = [
  {
    id: 'dance-solo',
    kind: 'dance',
    tier: 2,
    target: 'player',
    prompt: () =>
      'the chairman draws: “Thirty seconds of whatever you call dancing. Someone will queue something cruel.”',
  },
  {
    id: 'dance-lap',
    kind: 'dance',
    tier: 3,
    target: 'k',
    ok: (s) => kHere(s) && meters(s).comfort >= 60 && meters(s).interest >= 55,
    prompt: () =>
      'the chairman draws, reads it, and for the first time all night hesitates before saying it out loud: “Lap dance. One song. The circle picks the song and the circle is not merciful.”',
  },
];

// Dares that land on other people in the circle. You're the audience — but
// the deck is the same deck, so the circle escalates alongside you.
const NPC: Dare[] = [
  {
    id: 'npc-truth',
    kind: 'silly',
    tier: 1,
    target: 'npc',
    prompt: (s) =>
      `the bottle stops on ${npc(s)}. The chairman draws: “Worst thing you’ve ever done at a party in this house.”`,
  },
  {
    id: 'npc-silly',
    kind: 'silly',
    tier: 1,
    target: 'npc',
    prompt: (s) =>
      `the bottle stops on ${npc(s)}. The chairman draws: “Text the fifth person in your recents, right now, the words ‘I know what you did.’ No context. No follow-up.”`,
  },
  {
    id: 'npc-strip',
    kind: 'strip',
    tier: 2,
    target: 'npc',
    prompt: (s) => `the bottle stops on ${npc(s)}. The chairman draws: “Lose a layer.” No further comment is offered or needed.`,
  },
  {
    id: 'npc-kiss',
    kind: 'kiss',
    tier: 2,
    target: 'npc',
    prompt: (s) =>
      `the bottle stops on ${npc(s)}, and the second spin — the one that decides who — takes an agonizingly long time before landing on the chairman’s ex-wife, Bex, who has been quietly winning at this game all night.`,
  },
  {
    id: 'npc-dance',
    kind: 'dance',
    tier: 2,
    target: 'npc',
    prompt: (s) => `the bottle stops on ${npc(s)}. The chairman draws: “Sixty seconds of interpretive dance. The circle picks the theme. The theme is ‘rent.’”`,
  },
  {
    id: 'npc-assign',
    kind: 'silly',
    tier: 2,
    target: 'npc',
    prompt: (s) =>
      `the bottle stops on ${npc(s)} — and the card is the one everyone dreads: “DEALER’S CHOICE. The person to the spinner’s left writes the dare.” The person to the left is you. Twelve faces turn.`,
  },
  {
    id: 'npc-strip-hot',
    kind: 'strip',
    tier: 3,
    target: 'npc',
    prompt: (s) =>
      `the bottle stops on ${npc(s)}, who has already lost more than anyone at this table and reacts to the card with the calm of a man beyond further loss: “Two layers. The deck apologizes for nothing.”`,
  },
];

export const DARES: Dare[] = [...SILLY, ...STRIP, ...KISS, ...DANCE, ...NPC];
export const DARE_BY_ID: Record<string, Dare> = Object.fromEntries(DARES.map((d) => [d.id, d]));

/** Everything the table could legally throw at you right now. */
export function eligible(s: GameState): Dare[] {
  const tier = heatTier(s);
  const drawn = String(s.scene!.vars.drawn ?? '').split(',').filter(Boolean);
  const pool = DARES.filter(
    (d) => d.tier <= tier && !drawn.includes(d.id) && (d.ok ? d.ok(s) : true)
  );
  // Never leave the deck empty — the silly tier is always legal.
  return pool.length ? pool : SILLY.filter((d) => d.tier === 1);
}

/** Draw one, weighted toward the hottest tier the table has unlocked. */
export function rollDare(s: GameState, r: number): string {
  const pool = eligible(s);
  const tier = heatTier(s);
  const weight = (d: Dare) => (d.tier === tier ? 3 : d.tier === tier - 1 ? 2 : 1);
  const total = pool.reduce((acc, d) => acc + weight(d), 0);
  let pick = r * total;
  for (const d of pool) {
    pick -= weight(d);
    if (pick <= 0) return d.id;
  }
  return pool[pool.length - 1].id;
}

/** Both down to nothing: the circle is no longer the right venue. */
export function bothBare(s: GameState): boolean {
  return kHere(s) && isBare(g(s, 'player')) && isBare(g(s, 'k'));
}
