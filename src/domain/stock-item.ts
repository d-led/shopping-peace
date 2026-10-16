/**
 * The numbers that describe how one thing is used. Every one of them is in
 * days, so nothing on the page has to be converted by hand.
 */
export interface StockRequirements {
  /** How many days a single unit lasts at the usual rate of use. */
  readonly usageDays: number;
  /** How many days it takes to get a replacement home (shop run, delivery). */
  readonly leadDays: number;
  /** Extra days of stock kept on top of the tightly calculated minimum. */
  readonly extraDays: number;
}

/** A named preset: the "THING" plus how it is used. */
export interface StockItem extends StockRequirements {
  readonly id: string;
  readonly name: string;
}

/** Shown instead of a blank title, so a preset is never nameless on screen. */
export const UNNAMED_ITEM = 'Unnamed thing';
