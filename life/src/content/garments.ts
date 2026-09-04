// Objective clothing tracker.
//
// A character's state is just the set of garments currently on them, by slot.
// Nothing is "an outfit" — it's a jacket, a shirt, jeans, a bra. Dares and
// events remove specific items, outermost first, and every piece of UI and
// prose reads the same list. When a slot is gone it is gone for the scene.

export type Slot = 'jacket' | 'shirt' | 'pants' | 'bra' | 'panties' | 'boxers';

// Removal order: outermost first. Underwear is last, and bra comes off before
// panties only because that's the order the layer sits in over a torso shot.
export const REMOVAL_ORDER: Slot[] = ['jacket', 'shirt', 'pants', 'bra', 'panties', 'boxers'];

export type Garments = Partial<Record<Slot, string>>;

export const UNDERWEAR: Slot[] = ['bra', 'panties', 'boxers'];

export function slots(g: Garments): Slot[] {
  return REMOVAL_ORDER.filter((s) => !!g[s]);
}

export function count(g: Garments): number {
  return slots(g).length;
}

/** The next thing that would come off. */
export function outermost(g: Garments): Slot | null {
  return slots(g)[0] ?? null;
}

/** Items down to (and including) the last layer — i.e. anything left. */
export function isBare(g: Garments): boolean {
  return count(g) === 0;
}

/** Only underwear left. */
export function isStripped(g: Garments): boolean {
  const left = slots(g);
  return left.length > 0 && left.every((s) => UNDERWEAR.includes(s));
}

export function remove(g: Garments, slot: Slot): Garments {
  const out = { ...g };
  delete out[slot];
  return out;
}

/** "leather jacket, tee, jeans, bra, panties" — or "nothing". */
export function describe(g: Garments): string {
  const list = slots(g).map((s) => g[s]!);
  return list.length ? list.join(', ') : 'nothing';
}

/** Short slot names for the objective tracker line. */
export const SLOT_LABEL: Record<Slot, string> = {
  jacket: 'jacket',
  shirt: 'shirt',
  pants: 'pants',
  bra: 'bra',
  panties: 'panties',
  boxers: 'boxers',
};

// ---------------------------------------------------------------------------
// Starting sets
// ---------------------------------------------------------------------------

// What each party venue puts people in. Pool parties start near the bottom of
// the stack by nature, which is exactly why they escalate fastest.
export const PARTY_GARMENTS: Record<string, { player: Garments; k: Garments }> = {
  house: {
    player: { shirt: 'shirt', pants: 'jeans', boxers: 'boxers' },
    k: { jacket: 'leather jacket', shirt: 'soft tee', pants: 'jeans', bra: 'bra', panties: 'panties' },
  },
  frat: {
    player: { shirt: 'shirt', pants: 'jeans', boxers: 'boxers' },
    k: { jacket: 'cropped jacket', shirt: 'tank top', pants: 'high-waist jeans', bra: 'bra', panties: 'panties' },
  },
  rooftop: {
    player: { jacket: 'jacket', shirt: 'shirt', pants: 'chinos', boxers: 'boxers' },
    k: { jacket: 'borrowed blanket', shirt: 'wrap dress', pants: 'tights', bra: 'bra', panties: 'panties' },
  },
  pool: {
    player: { pants: 'swim trunks' },
    k: { bra: 'emerald bikini top', panties: 'bikini bottoms' },
  },
};

export function partyGarments(loc: string): { player: Garments; k: Garments } {
  const set = PARTY_GARMENTS[loc] ?? PARTY_GARMENTS.house;
  return { player: { ...set.player }, k: { ...set.k } };
}

// ---------------------------------------------------------------------------
// Portrait mapping — the drawing follows the tracker, not a named outfit.
// ---------------------------------------------------------------------------

export function portraitTop(g: Garments): 'jacket' | 'dress' | 'tee' | 'swim' | 'bare' {
  if (g.jacket) return 'jacket';
  if (g.shirt) return /dress/i.test(g.shirt) ? 'dress' : 'tee';
  if (g.bra) return 'swim';
  return 'bare';
}
