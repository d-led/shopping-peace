import { FRESHNESS_NEVER, type StockRequirements } from './stock-item';

export interface StockPlan {
  /** Units a wait would eat: the shelf has to hold this much to survive one. */
  readonly waitUnits: number;
  /** Whole units kept above that, from the extra days: the reserve. */
  readonly reserveUnits: number;
  /**
   * Fetch when the shelf is down to this: the wait plus the reserve.
   *
   * `(daily usage × lead time) + buffer`, in whole units — the textbook order
   * point, with the reserve inside it rather than under it, so the reserve is
   * still on the shelf when the order lands.
   */
  readonly reorderPoint: number;
  /** Units to bring home once the shelf is that low: whole packages. */
  readonly fetchQuantity: number;
  /** Units in one package at the shop. One means sold one at a time. */
  readonly packSize: number;
  /** Packages to bring home, which is a whole number of them. */
  readonly packsPerFetch: number;
  /** The level a fetch aims at: the order point plus what came. */
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
 * Turns how fast a thing is used and how long fetching it takes into the
 * numbers a household needs: how much to hold, when to fetch, how much to
 * bring home.
 *
 * The shape is the textbook order point, in whole units:
 *
 *   wait      = days of waiting ÷ days one unit lasts
 *   reserve   = days of reserve ÷ days one unit lasts
 *   fetch at  = wait + reserve
 *   a fetch aims at = order point + packages * pack size
 *
 * A unit lasting longer means *fewer* units cover the same stretch of days:
 * fourteen days of reserve is seven rolls at a roll a fortnight, but two rolls
 * at a roll every ten days. That is days divided by days-per-unit, which is the
 * same number as multiplying by the usage rate — see `unitsFor` for why this
 * code divides.
 *
 * The reserve sits inside the fetch level rather than under it, so a household
 * that shops when the shelf is down to wait + reserve still has its whole
 * reserve when the order lands, which is what a reserve is for. Shopping later
 * means eating into it, and a reserve that gets eaten is not a reserve.
 *
 * Packages come last and only ever change the fetching: what is kept at home is
 * about how the thing is used, and a shop's pack size says nothing about that.
 * A household that wants seven spare rolls and can only buy tens comes home
 * with ten, so the shelf settles above the reserve rather than exactly on it.
 */
export function planStock(requirements: StockRequirements): StockPlan {
  const { usageDays, leadDays, extraDays, freshDays, packSize } = requirements;
  requireAtLeast(usageDays, 1, 'usageDays');
  requireAtLeast(leadDays, 0, 'leadDays');
  requireAtLeast(extraDays, 0, 'extraDays');
  requireAtLeast(freshDays, 0, 'freshDays');
  requireAtLeast(packSize, 1, 'packSize');

  const daysPerUnit = effectiveUsageDays(requirements);

  /**
   * How many whole units cover a stretch of days.
   *
   * Days divided by days-per-unit *is* units — four days of waiting at a unit
   * every two days is two units. Multiplying by `1 / daysPerUnit` computes the
   * same thing, except that it rounds twice: on the 160,400 pairs of days and
   * unit lengths up to 400, the reciprocal form disagrees with the division six
   * times, and a round-up puts a whole extra unit on the shelf each time (273
   * days at 91 days a unit is exactly three units, and 3.0000000000000004 is
   * four).
   */
  const unitsFor = (days: number): number => Math.ceil(days / daysPerUnit);

  const waitUnits = unitsFor(leadDays);
  const reserveUnits = unitsFor(extraDays);
  // At least one package, since that is the smallest thing a shop will sell.
  const packsPerFetch = Math.max(1, Math.ceil(reserveUnits / packSize));
  const fetchQuantity = packsPerFetch * packSize;

  return {
    waitUnits,
    reserveUnits,
    reorderPoint: waitUnits + reserveUnits,
    fetchQuantity,
    packSize,
    packsPerFetch,
    // The level a fetch aims at = order point + what was fetched. It is counted
    // from the level you shop at, which is the figure the headline quotes.
    shelfAfterFetch: waitUnits + reserveUnits + fetchQuantity,
  };
}

function requireAtLeast(value: number, minimum: number, field: string): void {
  if (!Number.isFinite(value) || value < minimum) {
    throw new RangeError(`${field} must be a number of at least ${minimum}, got ${value}.`);
  }
}
