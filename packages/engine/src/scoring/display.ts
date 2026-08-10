/**
 * Round a score to 2 decimal places, for display only. Rounded values never
 * feed back into accumulation — a three-way tie for 1st shows 3.33 each and
 * the displayed points won't total 10, which is expected. See scoring.md.
 */
export function roundTo2dp(value: number): number {
  return Math.round(value * 100) / 100;
}
