import { FRESHNESS_NEVER, type StockItem } from '../../../src/domain/stock-item';

/**
 * The things the browser tests put on a shelf. They live here rather than in
 * each spec so that "the same preset" means the same numbers everywhere, and so
 * that the arithmetic a test asserts against can be read in one place.
 */

/** 1 unit lasts 30 days, 3 days to fetch, 30 extra: one tight, one spare. */
export const detergent: StockItem = {
  id: 'detergent',
  name: 'Laundry detergent',
  emoji: '🧴',
  usageDays: 30,
  leadDays: 3,
  extraDays: 30,
  freshDays: FRESHNESS_NEVER,
};

/** Fast used, slow to fetch: 5 for the wait, 3 spare. */
export const tabs: StockItem = {
  id: 'tabs',
  name: 'Dishwasher tabs',
  emoji: '🧽',
  usageDays: 10,
  leadDays: 45,
  extraDays: 30,
  freshDays: FRESHNESS_NEVER,
};

/** Eaten over a fortnight, but sour a week after opening: the plan counts 7. */
export const perishable: StockItem = {
  id: 'butter',
  name: 'Butter',
  emoji: '🧈',
  usageDays: 14,
  leadDays: 2,
  extraDays: 7,
  freshDays: 7,
};
