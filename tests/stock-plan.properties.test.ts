import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { planStock } from '../src/domain/stock-plan';

/** Any household's numbers: a unit lasting a day or a year, a wait up to 60 days. */
const requirements = fc.record({
  usageDays: fc.integer({ min: 1, max: 365 }),
  leadDays: fc.integer({ min: 0, max: 60 }),
  extraDays: fc.integer({ min: 0, max: 365 }),
});

describe('the plan, for every household you could think of', () => {
  it('always keeps enough to outlast the wait', () => {
    fc.assert(
      fc.property(requirements, (wanted) => {
        const plan = planStock(wanted);
        expect(plan.reorderPoint * wanted.usageDays).toBeGreaterThanOrEqual(wanted.leadDays);
      }),
      { verbose: true },
    );
  });

  it('never keeps more than one whole unit beyond what the wait needs', () => {
    fc.assert(
      fc.property(requirements, (wanted) => {
        const plan = planStock(wanted);
        if (plan.reorderPoint === 0) {
          return;
        }
        const oneLess = plan.reorderPoint - 1;
        expect(oneLess * wanted.usageDays).toBeLessThan(wanted.leadDays);
      }),
    );
  });

  it('adds the spare on top of the tight level rather than into it', () => {
    fc.assert(
      fc.property(requirements, (wanted) => {
        const plan = planStock(wanted);
        expect(plan.targetStock).toBe(plan.reorderPoint + plan.spareUnits);
        expect(plan.fetchQuantity).toBe(plan.spareUnits);
      }),
    );
  });

  it('asks for whole units, never a fraction of a bottle', () => {
    fc.assert(
      fc.property(requirements, (wanted) => {
        const plan = planStock(wanted);
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
      fc.property(requirements, fc.integer({ min: 0, max: 365 }), (wanted, more) => {
        const before = planStock(wanted);
        const after = planStock({ ...wanted, extraDays: wanted.extraDays + more });

        expect(after.targetStock).toBeGreaterThanOrEqual(before.targetStock);
        // The tight level answers "how long until it runs out", not "how much do we like having".
        expect(after.reorderPoint).toBe(before.reorderPoint);
      }),
    );
  });

  it('never plans less when fetching takes longer', () => {
    fc.assert(
      fc.property(requirements, fc.integer({ min: 0, max: 60 }), (wanted, longer) => {
        const before = planStock(wanted);
        const after = planStock({ ...wanted, leadDays: wanted.leadDays + longer });

        expect(after.reorderPoint).toBeGreaterThanOrEqual(before.reorderPoint);
        expect(after.targetStock).toBeGreaterThanOrEqual(before.targetStock);
      }),
    );
  });
});
