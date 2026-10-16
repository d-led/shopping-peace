import { FRESHNESS_NEVER, type StockRequirements } from './stock-item';

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
 * How long a unit effectively takes to get through, which is not the same as
 * how long it lasts.
 *
 * A thing that spoils E days after opening cannot outlive E even when the
 * household's own habit would take longer over it: butter that would last a
 * fortnight but turns after a week is gone in a week, whether it was eaten or
 * thrown away. Planning on the shorter of the two is what keeps the plan from
 * quietly counting on eating something that is no longer there.
 */
export function effectiveUsageDays(requirements: StockRequirements): number {
  const { usageDays, freshDays } = requirements;
  if (freshDays >= FRESHNESS_NEVER) {
    return usageDays;
  }
  // Nothing is gone in less than a day: something that will not keep at all is
  // a day's worth of use, not a division by zero.
  return Math.max(1, Math.min(usageDays, freshDays));
}

/** True when a unit would turn before the household gets through it. */
export function spoilsBeforeEmpty(requirements: StockRequirements): boolean {
  return requirements.freshDays < FRESHNESS_NEVER && requirements.freshDays < requirements.usageDays;
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
  const { usageDays, leadDays, extraDays, freshDays } = requirements;
  requireAtLeast(usageDays, 1, 'usageDays');
  requireAtLeast(leadDays, 0, 'leadDays');
  requireAtLeast(extraDays, 0, 'extraDays');
  requireAtLeast(freshDays, 0, 'freshDays');

  const lifespan = effectiveUsageDays(requirements);
  const reorderPoint = Math.ceil(leadDays / lifespan);
  const spareUnits = Math.ceil(extraDays / lifespan);

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
