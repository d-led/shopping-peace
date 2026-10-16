import type { StockRequirements } from './stock-item';

export interface StockPlan {
  /** The tight level: the units needed to outlast a fetch, nothing more. */
  readonly reorderPoint: number;
  /** Whole units kept on top of that tight level, from the extra days. */
  readonly spareUnits: number;
  /** What to hold after a top-up: the tight level plus the spare. */
  readonly targetStock: number;
  /** Units to bring home once the reorder point is reached. */
  readonly fetchQuantity: number;
}

/**
 * Turns how fast a thing is used and how long fetching it takes into the three
 * numbers a household needs: when to fetch, how many to fetch, how many to
 * keep.
 *
 * The stock level is kept deliberately tight — the units used up while a
 * replacement is on its way — and the spare days are added on top of it rather
 * than blurred into it, so the household can see which half is which. Whole
 * units cannot be split, so each half is rounded up on its own.
 */
export function planStock(requirements: StockRequirements): StockPlan {
  const { usageDays, leadDays, extraDays } = requirements;
  requireAtLeast(usageDays, 1, 'usageDays');
  requireAtLeast(leadDays, 0, 'leadDays');
  requireAtLeast(extraDays, 0, 'extraDays');

  const reorderPoint = Math.ceil(leadDays / usageDays);
  const spareUnits = Math.ceil(extraDays / usageDays);

  return {
    reorderPoint,
    spareUnits,
    targetStock: reorderPoint + spareUnits,
    fetchQuantity: spareUnits,
  };
}

function requireAtLeast(value: number, minimum: number, field: string): void {
  if (!Number.isFinite(value) || value < minimum) {
    throw new RangeError(`${field} must be a number of at least ${minimum}, got ${value}.`);
  }
}
