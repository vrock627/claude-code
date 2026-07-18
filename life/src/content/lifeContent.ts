// Life-layer content: job ladder, home/car/wardrobe tiers, daily activities.

import type { GameState, TimeBlock } from '../engine/types';

export interface JobTier {
  name: string;
  pay: number; // per shift
  energyCost: number;
}

export const JOB_TIERS: JobTier[] = [
  { name: 'Café Barista', pay: 48, energyCost: 30 },
  { name: 'Shift Lead', pay: 70, energyCost: 30 },
  { name: 'Assistant Manager', pay: 95, energyCost: 25 },
];

export interface HomeTier {
  name: string;
  desc: string;
  rent: number; // weekly
  moveCost: number;
  rest: number; // energy on waking
  dateModifier: number; // comfort delta if she ever comes over
}

export const HOME_TIERS: HomeTier[] = [
  {
    name: 'Shabby studio',
    desc: 'The radiator has opinions. The window faces a wall.',
    rent: 110,
    moveCost: 0,
    rest: 55,
    dateModifier: -8,
  },
  {
    name: 'Decent one-bedroom',
    desc: 'Actual daylight. A couch you didn’t find on the curb.',
    rent: 210,
    moveCost: 450,
    rest: 70,
    dateModifier: 0,
  },
  {
    name: 'Skyline loft',
    desc: 'Brick, glass, and a view that does half your talking for you.',
    rent: 380,
    moveCost: 1400,
    rest: 85,
    dateModifier: 8,
  },
];

export interface CarTier {
  name: string;
  desc: string;
  cost: number;
  lateChance: number; // odds the ride makes you late to a date
  styleBonus: number;
}

export const CAR_TIERS: CarTier[] = [
  {
    name: 'Bus pass',
    desc: 'The 42 crosstown. Character-building. Frequently late.',
    cost: 0,
    lateChance: 0.25,
    styleBonus: 0,
  },
  {
    name: "'97 beater",
    desc: 'Runs, mostly. The passenger door opens from inside only.',
    cost: 700,
    lateChance: 0.08,
    styleBonus: 0,
  },
  {
    name: 'Clean sedan',
    desc: 'Quiet, waxed, smells like a person with a plan.',
    cost: 2000,
    lateChance: 0.02,
    styleBonus: 1,
  },
  {
    name: 'Slate-grey coupe',
    desc: 'You don’t need it. That’s the point.',
    cost: 4800,
    lateChance: 0.01,
    styleBonus: 2,
  },
];

export interface WardrobeTier {
  name: string;
  cost: number;
}

// wardrobeTier feeds the style roll bonus (see rolls.ts) and first impressions.
export const WARDROBE_TIERS: WardrobeTier[] = [
  { name: 'Whatever’s clean', cost: 0 },
  { name: 'Fitted basics', cost: 160 },
  { name: 'Sharp casual', cost: 420 },
  { name: 'Tailored', cost: 950 },
];

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------

export interface Activity {
  id: string;
  name: string;
  desc: string;
  blocks: TimeBlock[]; // when it's available
  cost: number;
  energy: number; // negative = spends
  available?: (s: GameState) => boolean;
  encounterVenue?: string; // venue id for possible Krystalle encounters
}

export const ACTIVITIES: Activity[] = [
  {
    id: 'work',
    name: 'Work a shift',
    desc: 'Pull espresso, earn rent, stack performance.',
    blocks: [0, 1],
    cost: 0,
    energy: 0, // handled by job tier
    available: (s) => !s.job.fired,
  },
  {
    id: 'beg-job',
    name: 'Ask for your job back',
    desc: 'Swallow pride. It goes down dry.',
    blocks: [0, 1],
    cost: 0,
    energy: -10,
    available: (s) => s.job.fired,
  },
  {
    id: 'gym',
    name: 'Gym session',
    desc: 'Iron therapy. Fitness up.',
    blocks: [0, 1, 2],
    cost: 12,
    energy: -22,
  },
  {
    id: 'read',
    name: 'Bookstore + podcasts',
    desc: 'Sharpen the banter. Charm up.',
    blocks: [0, 1, 2],
    cost: 6,
    energy: -12,
  },
  {
    id: 'cafe',
    name: 'Hang at Driftwood Café',
    desc: 'Good light, better people-watching.',
    blocks: [0, 1],
    cost: 8,
    energy: -8,
    encounterVenue: 'cafe',
  },
  {
    id: 'park',
    name: 'Run the riverside park',
    desc: 'Fresh air, joggers, dogs with agendas. A little fitness too.',
    blocks: [0, 1],
    cost: 0,
    energy: -14,
    encounterVenue: 'park',
  },
  {
    id: 'bar',
    name: 'Neon Palms bar',
    desc: 'Sticky floors, live karaoke on weekends.',
    blocks: [2, 3],
    cost: 20,
    energy: -14,
    encounterVenue: 'bar',
  },
  {
    id: 'rest',
    name: 'Rest at home',
    desc: 'Couch. Ceiling. Recovery.',
    blocks: [0, 1, 2, 3],
    cost: 0,
    energy: 26,
  },
];

// Venue/block windows where Krystalle can turn up before you've met her.
export const ENCOUNTER_WINDOWS: Record<string, TimeBlock[]> = {
  cafe: [0, 1],
  park: [0],
  bar: [2, 3],
};

export const ENCOUNTER_SCENES: Record<string, string> = {
  cafe: 'enc-cafe',
  park: 'enc-park',
  bar: 'enc-bar',
};

// Date venues you can propose over text.
export interface DateVenue {
  id: string;
  name: string;
  sceneId: string;
  block: TimeBlock;
  minDates: number; // dates completed before this venue unlocks
  cost: number; // walking-around money you should bring
}

export const DATE_VENUES: DateVenue[] = [
  { id: 'coffee', name: 'Coffee at Driftwood', sceneId: 'date-coffee', block: 1, minDates: 0, cost: 25 },
  { id: 'dinner', name: 'Dinner at Salt & Ember', sceneId: 'date-dinner', block: 2, minDates: 1, cost: 90 },
  { id: 'barnight', name: 'Karaoke night at Neon Palms', sceneId: 'date-bar', block: 2, minDates: 2, cost: 60 },
];
