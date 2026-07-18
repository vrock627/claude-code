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
    return parsed.state as GameState;
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
