// Playtest debug mode. Turn on by opening the game with ?debug in the URL
// (sticky for the session via localStorage; ?nodebug turns it off).
// Effects: her hidden meters render as numbers, and Krystalle attends every
// party (presence roll skipped unless the route is dead).

export function isDebug(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const q = new URLSearchParams(window.location.search);
    if (q.has('nodebug')) {
      window.localStorage.removeItem('slowburn_debug');
      return false;
    }
    if (q.has('debug')) {
      window.localStorage.setItem('slowburn_debug', '1');
      return true;
    }
    return window.localStorage.getItem('slowburn_debug') === '1';
  } catch {
    return false;
  }
}
