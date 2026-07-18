// Core state shapes for Slow Burn. All game logic is pure functions over
// GameState; UI dispatches actions into the reducer.

export const BLOCKS = ['Morning', 'Afternoon', 'Evening', 'Late Night'] as const;
export type TimeBlock = 0 | 1 | 2 | 3;

export type Screen = 'title' | 'life' | 'scene' | 'phone' | 'gameover';

export type Mood =
  | 'neutral'
  | 'warm'
  | 'laughing'
  | 'uneasy'
  | 'annoyed'
  | 'flushed';

export type StatId = 'charm' | 'style' | 'fitness';

export interface PlayerStats {
  charm: number;
  style: number;
  fitness: number;
}

export interface JobState {
  tier: number; // index into JOB_TIERS
  performance: number; // 0-100
  warnings: number;
  shiftsWorked: number;
  fired: boolean;
}

// ---------------------------------------------------------------------------
// Krystalle
// ---------------------------------------------------------------------------

export type FlagId =
  | 'nice'
  | 'funny'
  | 'sexy'
  | 'smart'
  | 'confident'
  | 'gentleman'
  | 'tryhard'
  | 'creep'
  | 'boring';

export const POSITIVE_FLAGS: FlagId[] = [
  'nice',
  'funny',
  'sexy',
  'smart',
  'confident',
  'gentleman',
];
export const NEGATIVE_FLAGS: FlagId[] = ['tryhard', 'creep', 'boring'];

// Relationship stages
export const STAGES = [
  'Stranger',
  'Acquaintance', // met, no number
  'Has her number',
  'Seeing each other',
  'Girlfriend',
] as const;

export interface KrystalleState {
  met: boolean;
  hasNumber: boolean;
  stage: number; // index into STAGES
  datesCompleted: number;
  flags: Partial<Record<FlagId, boolean>>;
  memories: string[]; // fact ids she has shared with you
  usedCallbacks: string[]; // callbacks already cashed in
  enthusiasm: number; // -3..+3, carried into the next date
  routeDead: boolean;
  routeDeadReason?: string;
  pendingDate: { venueId: string; day: number; block: TimeBlock } | null;
  fumbles: number; // blown encounters — makes re-meeting harder
  textedToday: boolean;
  firstTextDone: boolean;
  lastDateDay: number; // -1 if never
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

export interface DateMeters {
  interest: number; // 0-100 does she like you
  comfort: number; // 0-100 gate for escalation
  momentum: number; // 0-100 conversational flow
}

// Ordered escalation ladder. Index matters: higher = bolder.
export const LADDER = [
  'compliment',
  'lightTouch',
  'holdHands',
  'leanClose',
  'kiss',
  'makeOut',
  'inviteHome',
  'bedroom',
] as const;
export type LadderStep = (typeof LADDER)[number];

export interface RollResult {
  kind: 'check' | 'move';
  label: string;
  roll: number; // 1-20
  bonus: number;
  total: number;
  dc: number;
  success: boolean;
  crit: boolean;
  fumble: boolean;
}

export interface DateSession {
  venueId: string;
  dateNumber: number; // 0 = first encounter, 1+ = real dates
  meters: DateMeters;
  strikes: number;
  ladder: number; // highest ladder index achieved (-1 = none)
  recentStrike: boolean;
  recentKiss: boolean;
  turn: number;
  lastRoll: RollResult | null;
  over: boolean;
  outcome: 'success' | 'polite-exit' | 'crash' | 'route-dead' | null;
}

// ---------------------------------------------------------------------------
// Scenes (choose-your-adventure graphs)
// ---------------------------------------------------------------------------

export interface Effects {
  interest?: number;
  comfort?: number;
  momentum?: number;
  money?: number;
  energy?: number;
  mood?: number;
  enthusiasm?: number;
  performance?: number;
}

export interface CheckSpec {
  stat: StatId;
  label: string; // e.g. "Smooth check"
  dc: number;
  onWin: string; // node id
  onLose: string; // node id
  winEffects?: Effects;
  loseEffects?: Effects;
  winFlags?: FlagId[];
  loseFlags?: FlagId[];
}

export interface Choice {
  text: string;
  cond?: (s: GameState) => boolean;
  move?: LadderStep; // escalation attempt, resolved by the date engine
  moveWin?: string; // node on success (move choices only)
  moveLose?: string; // node on rebuff/strike (move choices only)
  check?: CheckSpec;
  effects?: Effects;
  flags?: FlagId[];
  unflags?: FlagId[];
  learn?: string; // memory fact id gained
  callback?: string; // memory fact id spent for a bonus (requires having it)
  event?: string; // engine event, e.g. 'gotNumber', 'schedule:coffee'
  // Conditional branch decided at click time by hidden state — e.g. she only
  // says yes to giving her number if the meters earned it.
  judge?: { pass: (s: GameState) => boolean; onPass: string; onFail: string };
  goto?: string;
  endScene?: boolean;
}

export interface SceneNode {
  id: string;
  text: string | ((s: GameState) => string);
  kLine?: string | ((s: GameState) => string); // Krystalle's spoken line
  mood?: Mood; // portrait override; otherwise derived from meters
  learn?: string; // memory fact shared in this node's narration
  event?: string; // engine event fired when this node is entered
  choices?: Choice[];
  next?: string; // auto-continue node
  nextLabel?: string; // label for the continue button
  endScene?: boolean;
}

export interface Scene {
  id: string;
  title: string;
  art: string; // scene art id
  isDate?: boolean;
  venueId?: string;
  start: string;
  nodes: Record<string, SceneNode>;
}

export interface SceneState {
  sceneId: string;
  nodeId: string;
  date: DateSession | null;
  cue: string | null; // latest body-language cue line
}

// ---------------------------------------------------------------------------
// Top-level game state
// ---------------------------------------------------------------------------

export interface GameState {
  screen: Screen;
  day: number; // 1-based
  block: TimeBlock;
  money: number;
  energy: number; // 0-100
  mood: number; // 0-100
  stats: PlayerStats;
  homeTier: number;
  carTier: number;
  wardrobeTier: number;
  job: JobState;
  rentMissed: number;
  k: KrystalleState;
  scene: SceneState | null;
  seed: number; // RNG state (mulberry32), advanced on each draw
  toasts: string[];
  gameOver: string | null;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
