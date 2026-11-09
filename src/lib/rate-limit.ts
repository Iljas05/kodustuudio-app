// Very small in-memory rate limiter (fixed time window per visitor).
// Good enough for one Railway instance of a homework demo. It resets when the app restarts.

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();
const MAX_TRACKED = 5000;

/**
 * Returns 0 if the request is allowed, otherwise the number of seconds to wait.
 * `now` is a parameter only so tests can control time.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number, now: number = Date.now()): number {
  if (windows.size > MAX_TRACKED) {
    for (const [storedKey, window] of windows) {
      if (window.resetAt <= now) windows.delete(storedKey);
    }
  }

  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return 0;
  }
  if (current.count >= limit) {
    return Math.max(1, Math.ceil((current.resetAt - now) / 1000));
  }
  current.count++;
  return 0;
}

/** Clears all counters. Only used by tests. */
export function resetRateLimits(): void {
  windows.clear();
}
