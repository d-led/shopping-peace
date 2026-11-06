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
  /** Whole packages the reserve sits in once it is on the shelf. */
  readonly reservePacks: number;
  /** Reserve units that are outside a whole package: the ones on their own. */
  readonly reserveLooseUnits: number;
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
 *
 * This is the rate as the words on the screen want it — days per unit. The
 * arithmetic itself never divides by it; see `Rate`.
 */
export function effectiveUsageDays(requirements: StockRequirements): number {
  const rate = effectiveRate(requirements);
  return rate.days / rate.units;
}

/**
 * True when a unit would turn before the household gets through it: the shelf
 * life is shorter than the time one unit takes to use up.
 *
 * Decided by cross-multiplying rather than by dividing, so a third of a day is
 * never asked for as a number.
 */
export function spoilsBeforeEmpty(requirements: StockRequirements): boolean {
  const { usageUnits, usageDays, freshDays } = requirements;
  return freshDays < FRESHNESS_NEVER && freshDays * usageUnits < usageDays;
}

/**
 * A rate of use: `units` units every `days` days, both whole.
 *
 * Kept as a pair rather than as one number because the one number it could be —
 * the life of a unit — is not a number a machine holds for the interesting
 * cases: a third of a day is 0.333…, and rounding a quotient by it puts a whole
 * extra unit on the shelf (forty-five days at three a day is exactly 135, and
 * 136 is one too many). Multiplied out by whole units over whole days, every
 * comparison and every rounding-up is exact.
 */
export interface Rate {
  readonly units: number;
  readonly days: number;
}

/** A unit a day: the rate anything slower than a day is really asking for. */
const ONE_A_DAY: Rate = { units: 1, days: 1 };

/** The faster of two rates, decided by cross-multiplying: 2/3 beats 3/5. */
function faster(a: Rate, b: Rate): Rate {
  return a.units * b.days >= b.units * a.days ? a : b;
}

/** The slower of two rates, decided the same way. */
function slower(a: Rate, b: Rate): Rate {
  return a.units * b.days <= b.units * a.days ? a : b;
}

/** Whole units that cover a stretch of days at this rate, rounded up. */
function unitsCovering(days: number, rate: Rate): number {
  return Math.ceil((days * rate.units) / rate.days);
}

/**
 * The rate the shelf really goes down at: the household's own rate, made faster
 * by spoilage and by nothing else.
 *
 * Nothing is counted as gone in less than a day — a thing that will not keep at
 * all is a day's worth of use, not a division by zero — unless the household
 * gets through a unit faster than that anyway, which is what a thing used twice
 * a day is. That floor is why a thing that spoils at once is planned at the rate
 * it is used rather than at an infinity of units.
 *
 * Exported as the pair it is, so nothing has to divide by it to reason about it:
 * whole units over whole days compare and round exactly.
 */
export function effectiveRate(requirements: StockRequirements): Rate {
  const usage: Rate = { units: requirements.usageUnits, days: requirements.usageDays };
  if (requirements.freshDays >= FRESHNESS_NEVER) {
    return usage;
  }
  const floor = faster(usage, ONE_A_DAY);
  if (requirements.freshDays === 0) {
    return floor;
  }
  const spoilage: Rate = { units: 1, days: requirements.freshDays };
  return slower(faster(usage, spoilage), floor);
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
 * at a roll every ten days. That is days multiplied by units-a-day, which is
 * why the rate is kept as whole units over whole days: see `Rate`.
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
 *
 * The reserve is also counted the way a shelf holds it — whole packages, then
 * the units outside one — because a household checks that stock by looking at
 * it, not by subtracting what it has used.
 */
export function planStock(requirements: StockRequirements): StockPlan {
  const { usageUnits, usageDays, leadDays, extraDays, freshDays, packSize } = requirements;
  requireAtLeast(usageUnits, 1, 'usageUnits');
  requireAtLeast(usageDays, 1, 'usageDays');
  requireAtLeast(leadDays, 0, 'leadDays');
  requireAtLeast(extraDays, 0, 'extraDays');
  requireAtLeast(freshDays, 0, 'freshDays');
  requireAtLeast(packSize, 1, 'packSize');

  const rate = effectiveRate(requirements);
  const unitsFor = (days: number): number => unitsCovering(days, rate);

  const waitUnits = unitsFor(leadDays);
  const reserveUnits = unitsFor(extraDays);
  // At least one package, since that is the smallest thing a shop will sell.
  const packsPerFetch = Math.max(1, Math.ceil(reserveUnits / packSize));
  const fetchQuantity = packsPerFetch * packSize;
  // The reserve as it sits on the shelf: whole packs, then singles — how it is
  // stored, as opposed to how a shop sells it.
  const reservePacks = Math.floor(reserveUnits / packSize);
  const reserveLooseUnits = reserveUnits - reservePacks * packSize;

  return {
    waitUnits,
    reserveUnits,
    reorderPoint: waitUnits + reserveUnits,
    fetchQuantity,
    packSize,
    packsPerFetch,
    reservePacks,
    reserveLooseUnits,
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
