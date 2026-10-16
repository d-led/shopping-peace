import { describe, expect, it } from 'vitest';
import { planStock } from '../src/domain/stock-plan';

describe('when to fetch more: the tight level', () => {
  it('is the stock that would be used up while a replacement is on its way', () => {
    // A unit lasts 10 days and a fetch takes 5, so half a unit goes while
    // waiting — and half a unit is not something you can put on a shelf.
    expect(planStock({ usageDays: 10, leadDays: 5, extraDays: 0 }).reorderPoint).toBe(1);
  });

  it('rounds up, so the wait is always covered', () => {
    expect(planStock({ usageDays: 4, leadDays: 6, extraDays: 0 }).reorderPoint).toBe(2);
  });

  it('runs down to nothing when a fetch is instant', () => {
    expect(planStock({ usageDays: 7, leadDays: 0, extraDays: 0 }).reorderPoint).toBe(0);
  });

  it('leaves the spare out of it, however big the spare is', () => {
    expect(planStock({ usageDays: 10, leadDays: 5, extraDays: 90 }).reorderPoint).toBe(1);
  });
});

describe('how many to keep: the spare on top', () => {
  it('turns extra days into whole units', () => {
    expect(planStock({ usageDays: 30, leadDays: 3, extraDays: 30 }).spareUnits).toBe(1);
    expect(planStock({ usageDays: 30, leadDays: 3, extraDays: 60 }).spareUnits).toBe(2);
  });

  it('rounds a part-day up too, so nothing is left uncovered', () => {
    expect(planStock({ usageDays: 30, leadDays: 3, extraDays: 31 }).spareUnits).toBe(2);
  });

  it('keeps nothing spare when no extra days are asked for', () => {
    const plan = planStock({ usageDays: 30, leadDays: 3, extraDays: 0 });
    expect(plan.spareUnits).toBe(0);
    expect(plan.targetStock).toBe(plan.reorderPoint);
    expect(plan.fetchQuantity).toBe(0);
  });

  it('fetches exactly the spare, because the tight level is used up by then', () => {
    const plan = planStock({ usageDays: 30, leadDays: 3, extraDays: 60 });
    expect(plan.reorderPoint).toBe(1);
    expect(plan.targetStock).toBe(3);
    expect(plan.fetchQuantity).toBe(2);
  });

  it('adds the spare to the tight level instead of blurring the two together', () => {
    const plan = planStock({ usageDays: 10, leadDays: 5, extraDays: 90 });
    expect(plan.targetStock).toBe(plan.reorderPoint + plan.spareUnits);
    expect(plan.targetStock).toBe(10);
  });
});

describe('numbers that cannot work', () => {
  it('refuses a unit that lasts no time at all', () => {
    expect(() => planStock({ usageDays: 0, leadDays: 3, extraDays: 30 })).toThrow(/usageDays/);
  });

  it('refuses a negative waiting time', () => {
    expect(() => planStock({ usageDays: 30, leadDays: -1, extraDays: 30 })).toThrow(RangeError);
  });

  it('refuses negative extra days', () => {
    expect(() => planStock({ usageDays: 30, leadDays: 3, extraDays: -1 })).toThrow(/extraDays/);
  });
});
