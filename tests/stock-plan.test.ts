import { describe, expect, it } from 'vitest';
import { FRESHNESS_NEVER } from '../src/domain/stock-item';
import { effectiveUsageDays, planStock, spoilsBeforeEmpty } from '../src/domain/stock-plan';
import { requirements } from './support/items';

describe('how much the shelf has to hold: the wait', () => {
  it('is the units a fetch would eat while it is on its way', () => {
    // A unit lasts ten days and a fetch takes five: half a unit goes while
    // waiting, and half a unit is not something you can put on a shelf.
    expect(planStock(requirements({ usageDays: 10, leadDays: 5, extraDays: 0 })).waitUnits).toBe(1);
  });

  it('rounds up, so a wait is always covered in whole units', () => {
    expect(planStock(requirements({ usageDays: 4, leadDays: 6, extraDays: 0 })).waitUnits).toBe(2);
  });

  it('is nothing at all when a fetch is instant', () => {
    expect(planStock(requirements({ usageDays: 7, leadDays: 0, extraDays: 0 })).waitUnits).toBe(0);
  });

  it('says nothing about the reserve, which is a different question', () => {
    expect(planStock(requirements({ usageDays: 10, leadDays: 5, extraDays: 90 })).waitUnits).toBe(1);
  });
});

describe('how much is kept on top: the reserve', () => {
  it('turns extra days into whole units', () => {
    expect(planStock(requirements({ extraDays: 30 })).reserveUnits).toBe(1);
    expect(planStock(requirements({ extraDays: 60 })).reserveUnits).toBe(2);
  });

  it('rounds a part-day up too, so nothing is left uncovered', () => {
    expect(planStock(requirements({ extraDays: 31 })).reserveUnits).toBe(2);
  });

  it('keeps a whole roll a fortnight, when that is what the household asked for', () => {
    // The household's own toilet paper: a roll every two days, two weeks spare.
    const plan = planStock(requirements({ usageDays: 2, leadDays: 4, extraDays: 14, packSize: 10 }));

    expect(plan.waitUnits).toBe(2);
    expect(plan.reserveUnits).toBe(7);
  });

  it('keeps nothing at all when no extra days are asked for', () => {
    const plan = planStock(requirements({ extraDays: 0 }));

    expect(plan.reserveUnits).toBe(0);
    expect(plan.reorderPoint).toBe(plan.waitUnits);
  });
});

describe('when to fetch: the shelf level to shop at', () => {
  it('is the wait plus the reserve, which is what an order point means', () => {
    const plan = planStock(requirements({ usageDays: 2, leadDays: 4, extraDays: 14, packSize: 10 }));

    // Nine rolls: the two the wait eats, and the seven that stay spare.
    expect(plan.reorderPoint).toBe(9);
  });

  it('leaves the reserve untouched while the order travels', () => {
    const plan = planStock(requirements({ usageDays: 2, leadDays: 4, extraDays: 14, packSize: 10 }));

    // Shopping at nine and eating two on the way leaves the whole reserve.
    expect(plan.reorderPoint - plan.waitUnits).toBe(plan.reserveUnits);
  });

  it('goes up with the wait, so a slower shop is shopped earlier', () => {
    const quick = planStock(requirements({ usageDays: 2, leadDays: 4, extraDays: 14 }));
    const slow = planStock(requirements({ usageDays: 2, leadDays: 12, extraDays: 14 }));

    expect(slow.reorderPoint).toBeGreaterThan(quick.reorderPoint);
  });

  it('is the wait alone when nothing is kept spare', () => {
    const plan = planStock(requirements({ usageDays: 2, leadDays: 4, extraDays: 0 }));

    expect(plan.reorderPoint).toBe(2);
  });
});

describe('fetching by the pack, which is how a shop sells things', () => {
  const toiletPaper = { usageDays: 2, leadDays: 4, extraDays: 14, packSize: 10 };

  it('brings home the smallest number of packs that covers the reserve', () => {
    expect(planStock(requirements(toiletPaper)).packsPerFetch).toBe(1);
    expect(planStock(requirements({ ...toiletPaper, packSize: 7 })).packsPerFetch).toBe(1);
    expect(planStock(requirements({ ...toiletPaper, packSize: 3 })).packsPerFetch).toBe(3);
  });

  it('brings home the reserve itself when a shop sells them one at a time', () => {
    const plan = planStock(requirements({ usageDays: 2, leadDays: 4, extraDays: 14 }));

    expect(plan.packsPerFetch).toBe(7);
    expect(plan.fetchQuantity).toBe(7);
  });

  it('lands the shelf on the order point plus the pack, and no higher', () => {
    const plan = planStock(requirements(toiletPaper));

    // Max target = order point + pack size: nine rolls plus ten.
    expect(plan.shelfAfterFetch).toBe(19);
  });

  it('brings one package home even when no reserve was asked for', () => {
    const plan = planStock(requirements({ ...toiletPaper, extraDays: 0 }));

    expect(plan.reserveUnits).toBe(0);
    expect(plan.reorderPoint).toBe(2);
    expect(plan.packsPerFetch).toBe(1);
    expect(plan.shelfAfterFetch).toBe(12);
  });

  it('refuses a pack of no units, which is not a thing a shop sells', () => {
    expect(() => planStock(requirements({ packSize: 0 }))).toThrow(/packSize/u);
  });
});

describe('the reserve as it sits on the shelf', () => {
  it('counts whole packs first, then the units outside one', () => {
    // Twenty-three units of reserve, sold ten at a time: two packs and three
    // units that are on their own.
    const plan = planStock(requirements({ usageDays: 1, extraDays: 23, packSize: 10 }));

    expect(plan.reservePacks).toBe(2);
    expect(plan.reserveLooseUnits).toBe(3);
  });

  it('leaves nothing outside the packs when they cover the reserve exactly', () => {
    const plan = planStock(requirements({ usageDays: 1, extraDays: 20, packSize: 10 }));

    expect(plan.reservePacks).toBe(2);
    expect(plan.reserveLooseUnits).toBe(0);
  });

  it('counts every unit as a package when the shop sells one at a time', () => {
    const plan = planStock(requirements({ usageDays: 10, extraDays: 30 }));

    // No bulk: each unit is a pack of one, and nothing sits outside a pack.
    expect(plan.reservePacks).toBe(3);
    expect(plan.reserveLooseUnits).toBe(0);
  });
});

describe('how long a unit effectively lasts', () => {
  it('is how long the thing lasts when nothing spoils', () => {
    expect(effectiveUsageDays(requirements({ usageDays: 30, freshDays: FRESHNESS_NEVER }))).toBe(
      30,
    );
  });

  it('is the shorter of the two when a thing turns before it is finished', () => {
    // Butter eaten over a fortnight that goes off after a week is gone in a week.
    expect(effectiveUsageDays(requirements({ usageDays: 14, freshDays: 7 }))).toBe(7);
  });

  it('is still a day for something that will not keep at all', () => {
    expect(effectiveUsageDays(requirements({ usageDays: 14, freshDays: 0 }))).toBe(1);
  });

  it('ignores a shelf life longer than the thing takes to get through', () => {
    expect(effectiveUsageDays(requirements({ usageDays: 7, freshDays: 30 }))).toBe(7);
  });
});

describe('a thing that turns before it is finished', () => {
  it('is fetched sooner, because a unit disappears faster than it is eaten', () => {
    // A ten-day wait, a unit eaten over a fortnight — but sour after a week.
    const keeps = { usageDays: 14, leadDays: 10, extraDays: 0, freshDays: FRESHNESS_NEVER, packSize: 1 };
    const perishes = { ...keeps, freshDays: 7 };

    expect(planStock(keeps).reorderPoint).toBe(1);
    expect(planStock(perishes).reorderPoint).toBe(2);
  });

  it('is kept in proportion to how fast it disappears, not how fast it is eaten', () => {
    const plan = planStock(
      requirements({ usageDays: 14, leadDays: 2, extraDays: 7, freshDays: 7 }),
    );

    // A week a unit, a two-day wait, a week of reserve: shop at two units.
    expect(plan.waitUnits).toBe(1);
    expect(plan.reserveUnits).toBe(1);
    expect(plan.reorderPoint).toBe(2);
  });

  it('says so, so the household is not left wondering about the bigger numbers', () => {
    expect(spoilsBeforeEmpty(requirements({ usageDays: 14, freshDays: 7 }))).toBe(true);
  });

  it('says nothing about a thing that keeps, or keeps long enough to finish', () => {
    expect(spoilsBeforeEmpty(requirements({ usageDays: 14, freshDays: FRESHNESS_NEVER }))).toBe(
      false,
    );
    expect(spoilsBeforeEmpty(requirements({ usageDays: 7, freshDays: 30 }))).toBe(false);
  });
});

describe('numbers that cannot work', () => {
  it('refuses a unit that lasts no time at all', () => {
    expect(() => planStock(requirements({ usageDays: 0 }))).toThrow(/usageDays/u);
  });

  it('refuses a negative waiting time', () => {
    expect(() => planStock(requirements({ leadDays: -1 }))).toThrow(RangeError);
  });

  it('refuses negative extra days', () => {
    expect(() => planStock(requirements({ extraDays: -1 }))).toThrow(/extraDays/u);
  });

  it('refuses a negative shelf life', () => {
    expect(() => planStock(requirements({ freshDays: -1 }))).toThrow(/freshDays/u);
  });
});
