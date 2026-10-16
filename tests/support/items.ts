import {
  FRESHNESS_NEVER,
  type StockItem,
  type StockRequirements,
} from '../../src/domain/stock-item';

/**
 * The numbers for a thing, with everything a test does not care about filled
 * in: a unit a month, a three-day wait, a month spare, nothing that spoils, and
 * sold one at a time.
 */
export function requirements(overrides: Partial<StockRequirements> = {}): StockRequirements {
  return {
    usageDays: 30,
    leadDays: 3,
    extraDays: 30,
    freshDays: FRESHNESS_NEVER,
    packSize: 1,
    ...overrides,
  };
}

/** A named preset, so a test only spells out what it is actually about. */
export function thing(overrides: Partial<StockItem> = {}): StockItem {
  return { id: 'the-thing', name: 'The thing', emoji: '', ...requirements(), ...overrides };
}
