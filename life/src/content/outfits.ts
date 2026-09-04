// Outfit registry. Scenes set a wardrobe at start (SceneState.wardrobe) and
// choices can change it mid-scene (choice.setOutfit) — a lost bet, a pool, a
// dare. Narration and the portrait read from the wardrobe so what people wear
// stays consistent for the whole scene.

import type { GameState } from '../engine/types';

// How the portrait renders a top. 'swim' bares the shoulders.
export type PortraitTop = 'jacket' | 'sweater' | 'dress' | 'swim' | 'scrubs' | 'tee' | 'windbreaker';

export interface Outfit {
  id: string;
  label: string; // shown in UI: "wearing …"
  top: PortraitTop;
  color: string; // main garment color for the portrait
}

export const OUTFITS: Record<string, Outfit> = {
  // Krystalle
  'k-scrubs': { id: 'k-scrubs', label: 'sea-glass scrubs, pen in her hair', top: 'scrubs', color: '#7fb4a8' },
  'k-windbreaker': { id: 'k-windbreaker', label: 'running gear + sea-glass windbreaker', top: 'windbreaker', color: '#8fc2b8' },
  'k-leather': { id: 'k-leather', label: 'leather jacket over a soft tee', top: 'jacket', color: '#2a2226' },
  'k-sweater': { id: 'k-sweater', label: 'soft green sweater, hair down', top: 'sweater', color: '#3d5a4f' },
  'k-reddress': { id: 'k-reddress', label: 'the dark red jacket, gold hoops', top: 'dress', color: '#8e2f3c' },
  'k-crop': { id: 'k-crop', label: 'cropped jacket, high-waist jeans', top: 'jacket', color: '#4a3b55' },
  'k-swim': { id: 'k-swim', label: 'emerald one-piece, denim shorts', top: 'swim', color: '#1f8a70' },
  'k-swim-wet': { id: 'k-swim-wet', label: 'emerald one-piece, hair dripping', top: 'swim', color: '#17755f' },
  'k-wrap': { id: 'k-wrap', label: 'wrap dress + somebody’s borrowed blanket', top: 'dress', color: '#6b4a7a' },

  // Player
  'p-basic': { id: 'p-basic', label: 'whatever was clean', top: 'tee', color: '#5a6472' },
  'p-fitted': { id: 'p-fitted', label: 'fitted basics', top: 'tee', color: '#46617a' },
  'p-sharp': { id: 'p-sharp', label: 'sharp casual', top: 'jacket', color: '#3a4a63' },
  'p-tailored': { id: 'p-tailored', label: 'tailored, obviously', top: 'jacket', color: '#2e3b52' },
  'p-swim': { id: 'p-swim', label: 'trunks and optimism', top: 'swim', color: '#2f6a8a' },
  'p-shirtless': { id: 'p-shirtless', label: 'no shirt — long story, lost fairly', top: 'swim', color: '#c98e6d' },
  'p-soaked': { id: 'p-soaked', label: 'street clothes, completely soaked', top: 'tee', color: '#33475c' },
};

// The player's default outfit follows their wardrobe tier.
export function playerDefaultOutfit(s: GameState): string {
  return ['p-basic', 'p-fitted', 'p-sharp', 'p-tailored'][s.wardrobeTier] ?? 'p-basic';
}

export function outfitLabel(id: string | undefined): string {
  return id ? OUTFITS[id]?.label ?? id : '';
}
