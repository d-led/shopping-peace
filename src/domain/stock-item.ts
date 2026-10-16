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
  /**
   * How many days the thing stays good once it is opened. Butter eaten over a
   * fortnight but turned after a week is gone in a week, however it went.
   * Zero is for things that will not keep at all — fresh bread, milk.
   */
  readonly freshDays: number;
  /**
   * How many units arrive in one package at the shop: 10 rolls of toilet paper,
   * 24 tins, 6 bottles. One means the thing is sold one at a time.
   *
   * It is not how the thing is used, so it does not touch the level kept at
   * home — it only decides how that level gets topped up, since a shop sells
   * packages and nobody sells three quarters of one.
   */
  readonly packSize: number;
}

/** A named preset: the "THING", how it is used, and the picture in front of it. */
export interface StockItem extends StockRequirements {
  readonly id: string;
  readonly name: string;
  /**
   * The character in front of the name, or an empty string for none.
   *
   * Kept apart from the name so the picture can be swapped without touching
   * what the thing is called, and so a file carries it as data rather than as
   * part of a sentence. A picture from an icon set would arrive as its own
   * field beside this one rather than as a second kind of name.
   */
  readonly emoji: string;
}

/** Shown instead of a blank title, so a preset is never nameless on screen. */
export const UNNAMED_ITEM = 'Unnamed thing';

/**
 * The top of the freshness slider, and the same maximum the usage slider has.
 * A year of shelf life changes nothing about how a household plans, so that
 * position means "never spoils" rather than a shelf life of exactly 365 days.
 */
export const FRESHNESS_NEVER = 365;
