import fc from 'fast-check';
import { FRESHNESS_NEVER, type StockRequirements } from '../../src/domain/stock-item';

/**
 * How many cases each property gets.
 *
 * A hundred is plenty while writing a property; the quality gate runs the same
 * properties a thousand times, which is where the awkward combinations come
 * up. Importing this file is what applies the setting, so a property test
 * starts with `import './support/property';` and nothing else.
 */
fc.configureGlobal({ numRuns: Number(process.env.FC_RUNS ?? 100) });

/**
 * The numbers a household sets, one generator each: a unit that lasts a day or a
 * year, a wait of up to sixty days, a reserve of up to a year, a shelf life
 * anywhere the slider goes, and packs of up to four dozen.
 *
 * Flat rather than one record, so a generator for something that *has* these
 * numbers can spread them into its own.
 */
export const NUMBERS = {
  usageUnits: fc.integer({ min: 1, max: 24 }),
  usageDays: fc.integer({ min: 1, max: 365 }),
  leadDays: fc.integer({ min: 0, max: 60 }),
  extraDays: fc.integer({ min: 0, max: 365 }),
  freshDays: fc.integer({ min: 0, max: FRESHNESS_NEVER }),
  packSize: fc.integer({ min: 1, max: 48 }),
} as const;

/** A household's numbers on their own, for the maths that needs nothing else. */
export const requirements: fc.Arbitrary<StockRequirements> = fc.record(NUMBERS);
