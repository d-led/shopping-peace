import { FRESHNESS_NEVER } from '../domain/stock-item';

/**
 * Slider limits: wide enough for a year's worth of a slow item, tight enough to
 * stay usable with a thumb. Every one starts where the plan starts making
 * sense — no reserve is a choice a household is allowed to make, and the
 * arithmetic has always handled it.
 */
export const LIMITS = {
  /** Days one unit lasts, for a thing used slower than one a day. */
  usageDays: { min: 1, max: 365 },
  /** Units a day, for a thing used quicker than that. */
  usagePerDay: { min: 1, max: 24 },
  leadDays: { min: 0, max: 60 },
  extraDays: { min: 0, max: 180 },
  freshDays: { min: 0, max: FRESHNESS_NEVER },
  // A case of 48 is about as big as a household buys of anything.
  packSize: { min: 1, max: 48 },
} as const;
