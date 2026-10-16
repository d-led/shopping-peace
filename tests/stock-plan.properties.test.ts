import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { FRESHNESS_NEVER } from '../src/domain/stock-item';
import { effectiveUsageDays, planStock } from '../src/domain/stock-plan';
import './support/property';

/** Any household's numbers: a unit lasting a day or a year, a wait up to 60 days. */
const wanted = fc.record({
  usageDays: fc.integer({ min: 1, max: 365 }),
  leadDays: fc.integer({ min: 0, max: 60 }),
  extraDays: fc.integer({ min: 0, max: 365 }),
  freshDays: fc.integer({ min: 0, max: FRESHNESS_NEVER }),
});

describe('the plan, for every household you could think of', () => {
  it('always keeps enough to outlast the wait', () => {
    fc.assert(
      fc.property(wanted, (numbers) => {
        const plan = planStock(numbers);
        expect(plan.reorderPoint * effectiveUsageDays(numbers)).toBeGreaterThanOrEqual(
          numbers.leadDays,
        );
      }),
    );
  });

  it('never keeps more than one whole unit beyond what the wait needs', () => {
    fc.assert(
      fc.property(wanted, (numbers) => {
        const plan = planStock(numbers);
        if (plan.reorderPoint === 0) {
          return;
        }
        expect((plan.reorderPoint - 1) * effectiveUsageDays(numbers)).toBeLessThan(numbers.leadDays);
      }),
    );
  });

  it('adds the spare on top of the tight level rather than into it', () => {
    fc.assert(
      fc.property(wanted, (numbers) => {
        const plan = planStock(numbers);
        expect(plan.targetStock).toBe(plan.reorderPoint + plan.spareUnits);
        expect(plan.fetchQuantity).toBe(plan.spareUnits);
      }),
    );
  });

  it('asks for whole units, never a fraction of a bottle', () => {
    fc.assert(
      fc.property(wanted, (numbers) => {
        const plan = planStock(numbers);
        for (const count of [
          plan.reorderPoint,
          plan.spareUnits,
          plan.targetStock,
          plan.fetchQuantity,
        ]) {
          expect(Number.isInteger(count)).toBe(true);
          expect(count).toBeGreaterThanOrEqual(0);
        }
      }),
    );
  });

  it('never plans less when more days are kept spare', () => {
    fc.assert(
      fc.property(wanted, fc.integer({ min: 0, max: 365 }), (numbers, more) => {
        const before = planStock(numbers);
        const after = planStock({ ...numbers, extraDays: numbers.extraDays + more });

        expect(after.targetStock).toBeGreaterThanOrEqual(before.targetStock);
        // The tight level answers "how long until it runs out", not "how much do we like having".
        expect(after.reorderPoint).toBe(before.reorderPoint);
      }),
    );
  });

  it('never plans less when fetching takes longer', () => {
    fc.assert(
      fc.property(wanted, fc.integer({ min: 0, max: 60 }), (numbers, longer) => {
        const before = planStock(numbers);
        const after = planStock({ ...numbers, leadDays: numbers.leadDays + longer });

        expect(after.reorderPoint).toBeGreaterThanOrEqual(before.reorderPoint);
        expect(after.targetStock).toBeGreaterThanOrEqual(before.targetStock);
      }),
    );
  });

  it('never plans less when a thing turns sooner than it would be eaten', () => {
    fc.assert(
      fc.property(wanted, fc.integer({ min: 0, max: FRESHNESS_NEVER }), (numbers, shorter) => {
        const before = planStock({ ...numbers, freshDays: FRESHNESS_NEVER });
        const after = planStock({ ...numbers, freshDays: shorter });

        // Spoiling earlier can only ever make the household fetch sooner.
        expect(after.reorderPoint).toBeGreaterThanOrEqual(before.reorderPoint);
      }),
    );
  });

  it('treats a shelf life as long as the usage it never outlives', () => {
    fc.assert(
      fc.property(wanted, (numbers) => {
        expect(effectiveUsageDays(numbers)).toBeLessThanOrEqual(numbers.usageDays);
        if (numbers.freshDays >= FRESHNESS_NEVER) {
          expect(effectiveUsageDays(numbers)).toBe(numbers.usageDays);
        }
      }),
    );
  });

  it('never works out a lifespan of zero days, whatever it is given', () => {
    fc.assert(
      fc.property(wanted, (numbers) => {
        expect(effectiveUsageDays(numbers)).toBeGreaterThanOrEqual(1);
      }),
    );
  });
});
