const BACKOFF_STEPS_MS = [500, 1000, 2000, 4000, 10000] as const;

export function getBackoffDelayMs(attempt: number): number {
  const index = Math.min(Math.max(attempt, 0), BACKOFF_STEPS_MS.length - 1);
  return BACKOFF_STEPS_MS[index];
}

export function createBackoffSchedule(maxAttempts = 50): number[] {
  return Array.from({ length: maxAttempts }, (_, attempt) =>
    getBackoffDelayMs(attempt),
  );
}
