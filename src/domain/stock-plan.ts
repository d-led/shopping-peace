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
  /** Units in one package at the shop. One means sold one at a time. */
  readonly packSize: number;
  /** Packages to bring home, which is a whole number of them. */
  readonly packsPerFetch: number;
  /** What the shelf really holds straight after a fetch, packs and all. */
  readonly shelfAfterFetch: number;
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
 *
 * Packages are the last step, and they only ever change the fetching: the level
 * kept at home is about how the thing is used, and a shop's pack size says
 * nothing about that. A household that wants three spare units and can only buy
 * tens comes home with ten — the shelf settles above the target instead of
 * below it, which is the honest answer to "they only sell them in tens".
 */
export function planStock(requirements: StockRequirements): StockPlan {
  const { usageDays, leadDays, extraDays, freshDays, packSize } = requirements;
  requireAtLeast(usageDays, 1, 'usageDays');
  requireAtLeast(leadDays, 0, 'leadDays');
  requireAtLeast(extraDays, 0, 'extraDays');
  requireAtLeast(freshDays, 0, 'freshDays');
  requireAtLeast(packSize, 1, 'packSize');

  const lifespan = effectiveUsageDays(requirements);
  const reorderPoint = Math.ceil(leadDays / lifespan);
  const spareUnits = Math.ceil(extraDays / lifespan);
  // At least one package, since that is the smallest thing a shop will sell.
  const packsPerFetch = Math.max(1, Math.ceil(spareUnits / packSize));

  return {
    reorderPoint,
    spareUnits,
    targetStock: reorderPoint + spareUnits,
    fetchQuantity: spareUnits,
    packSize,
    packsPerFetch,
    shelfAfterFetch: reorderPoint + packsPerFetch * packSize,
  };
}

function requireAtLeast(value: number, minimum: number, field: string): void {
  if (!Number.isFinite(value) || value < minimum) {
    throw new RangeError(`${field} must be a number of at least ${minimum}, got ${value}.`);
  }
}
