import type { GameState } from './types';

const KEY = 'slowburn_save_v1';

export function saveGame(s: GameState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: 1, state: s }));
  } catch {
    // storage full/unavailable — a lost save beats a crashed game
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.v !== 1 || !parsed.state?.k) return null;
    const state = parsed.state as GameState;
    // Migrate saves from before the intelligence stat / party system.
    if (typeof state.stats.intelligence !== 'number') state.stats.intelligence = 2;
    if (state.pendingParty === undefined) state.pendingParty = null;
    if (state.pendingParty && !state.pendingParty.loc) state.pendingParty.loc = 'house';
    if (state.scene && !state.scene.vars) state.scene.vars = {};
    if (state.scene && !state.scene.wardrobe) state.scene.wardrobe = {};
    return state;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
