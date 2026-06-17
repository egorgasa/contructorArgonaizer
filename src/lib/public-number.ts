/**
 * Generate a human-readable public order number, e.g. ORD-2026-0001234.
 *
 * Counter is derived from the total number of existing requests + 1.
 * Not collision-proof under high concurrency, but fine for the MVP.
 */
export function buildPublicNumber(year: number, sequence: number): string {
  const padded = String(sequence).padStart(7, "0");
  return `ORD-${year}-${padded}`;
}
