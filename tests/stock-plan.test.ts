import { describe, expect, it } from 'vitest';
import { FRESHNESS_NEVER } from '../src/domain/stock-item';
import { effectiveUsageDays, planStock, spoilsBeforeEmpty } from '../src/domain/stock-plan';
import { requirements } from './support/items';

describe('when to fetch more: the tight level', () => {
  it('is the stock that would be used up while a replacement is on its way', () => {
    // A unit lasts 10 days and a fetch takes 5, so half a unit goes while
    // waiting — and half a unit is not something you can put on a shelf.
    const plan = planStock(requirements({ usageDays: 10, leadDays: 5, extraDays: 0 }));
    expect(plan.reorderPoint).toBe(1);
  });

  it('rounds up, so the wait is always covered', () => {
    expect(planStock(requirements({ usageDays: 4, leadDays: 6, extraDays: 0 })).reorderPoint).toBe(
      2,
    );
  });

  it('runs down to nothing when a fetch is instant', () => {
    expect(planStock(requirements({ usageDays: 7, leadDays: 0, extraDays: 0 })).reorderPoint).toBe(
      0,
    );
  });

  it('leaves the spare out of it, however big the spare is', () => {
    const plan = planStock(requirements({ usageDays: 10, leadDays: 5, extraDays: 90 }));
    expect(plan.reorderPoint).toBe(1);
  });
});

describe('how many to keep: the spare on top', () => {
  it('turns extra days into whole units', () => {
    expect(planStock(requirements({ extraDays: 30 })).spareUnits).toBe(1);
    expect(planStock(requirements({ extraDays: 60 })).spareUnits).toBe(2);
  });

  it('rounds a part-day up too, so nothing is left uncovered', () => {
    expect(planStock(requirements({ extraDays: 31 })).spareUnits).toBe(2);
  });

  it('keeps nothing spare when no extra days are asked for', () => {
    const plan = planStock(requirements({ extraDays: 0 }));
    expect(plan.spareUnits).toBe(0);
    expect(plan.targetStock).toBe(plan.reorderPoint);
    expect(plan.fetchQuantity).toBe(0);
  });

  it('fetches exactly the spare, because the tight level is used up by then', () => {
    const plan = planStock(requirements({ extraDays: 60 }));
    expect(plan.reorderPoint).toBe(1);
    expect(plan.targetStock).toBe(3);
    expect(plan.fetchQuantity).toBe(2);
  });

  it('adds the spare to the tight level instead of blurring the two together', () => {
    const plan = planStock(requirements({ usageDays: 10, leadDays: 5, extraDays: 90 }));
    expect(plan.targetStock).toBe(plan.reorderPoint + plan.spareUnits);
    expect(plan.targetStock).toBe(10);
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
    const keeps = { usageDays: 14, leadDays: 10, extraDays: 0, freshDays: FRESHNESS_NEVER };
    const perishes = { ...keeps, freshDays: 7 };

    expect(planStock(keeps).reorderPoint).toBe(1);
    expect(planStock(perishes).reorderPoint).toBe(2);
  });

  it('is kept in proportion to how fast it disappears, not how fast it is eaten', () => {
    const plan = planStock(
      requirements({ usageDays: 14, leadDays: 2, extraDays: 7, freshDays: 7 }),
    );
    expect(plan.reorderPoint).toBe(1);
    expect(plan.spareUnits).toBe(1);
    expect(plan.targetStock).toBe(2);
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
