/** Helpers to (de)serialize JSON-stored discount arrays and normalize records. */

export function parseDiscountArray(json: string | null | undefined): number[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      return parsed.filter((n) => typeof n === "number" && Number.isFinite(n));
    }
    return [];
  } catch {
    return [];
  }
}

export function stringifyDiscountArray(steps: number[]): string {
  return JSON.stringify(steps ?? []);
}
