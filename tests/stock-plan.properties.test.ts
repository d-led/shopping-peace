import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { FRESHNESS_NEVER } from '../src/domain/stock-item';
import { effectiveRate, effectiveUsageDays, planStock } from '../src/domain/stock-plan';
import { requirements as wanted } from './support/property';

describe('the plan, for every household you could think of', () => {
  it('always keeps enough to outlast the wait', () => {
    fc.assert(
      fc.property(wanted, (numbers) => {
        const plan = planStock(numbers);
        const rate = effectiveRate(numbers);

        // Cross-multiplied, so this is whole-number arithmetic: the units held
        // for the wait, in the rate's own units, cover the days it takes.
        expect(plan.waitUnits * rate.days).toBeGreaterThanOrEqual(numbers.leadDays * rate.units);
      }),
    );
  });

  it('never holds more for the wait than the wait needs, round-up aside', () => {
    fc.assert(
      fc.property(wanted, (numbers) => {
        const plan = planStock(numbers);
        const rate = effectiveRate(numbers);
        if (plan.waitUnits === 0) {
          return;
        }
        expect((plan.waitUnits - 1) * rate.days).toBeLessThan(numbers.leadDays * rate.units);
      }),
    );
  });

  it('puts the reserve inside the order point, where a safety stock belongs', () => {
    fc.assert(
      fc.property(wanted, (numbers) => {
        const plan = planStock(numbers);

        expect(plan.reorderPoint).toBe(plan.waitUnits + plan.reserveUnits);
        // Whole packages, so the quantity is a multiple of the pack size.
        expect(plan.fetchQuantity).toBe(plan.packsPerFetch * plan.packSize);
      }),
    );
  });

  it('stores the reserve in whole packs plus the units outside one', () => {
    fc.assert(
      fc.property(wanted, (numbers) => {
        const plan = planStock(numbers);

        expect(plan.reservePacks * plan.packSize + plan.reserveLooseUnits).toBe(
          plan.reserveUnits,
        );
        expect(plan.reserveLooseUnits).toBeLessThan(plan.packSize);
      }),
    );
  });

  it('asks for whole units, never a fraction of a bottle', () => {
    fc.assert(
      fc.property(wanted, (numbers) => {
        const plan = planStock(numbers);
        for (const count of [
          plan.waitUnits,
          plan.reserveUnits,
          plan.reorderPoint,
          plan.fetchQuantity,
          plan.packsPerFetch,
          plan.shelfAfterFetch,
        ]) {
          expect(Number.isInteger(count)).toBe(true);
          expect(count).toBeGreaterThanOrEqual(0);
        }
      }),
    );
  });

  it('brings home whole packages, and never fewer than the target they cover', () => {
    fc.assert(
      fc.property(wanted, (numbers) => {
        const plan = planStock(numbers);
        const brought = plan.packsPerFetch * plan.packSize;

        // A shop sells packages: never one of them split open.
        expect(brought % plan.packSize).toBe(0);
        expect(plan.packsPerFetch).toBeGreaterThanOrEqual(1);
        // This is the fewest packages that hold the reserve the household asked
        // for; with no reserve at all, one package is what a fetch means.
        expect(brought).toBeGreaterThanOrEqual(plan.reserveUnits);
        if (plan.reserveUnits > 0) {
          expect(brought - plan.packSize).toBeLessThan(plan.reserveUnits);
        }
        expect(plan.shelfAfterFetch).toBe(plan.reorderPoint + brought);
      }),
    );
  });

  it('never fills the shelf below the reserve it was asked to hold', () => {
    fc.assert(
      fc.property(wanted, (numbers) => {
        const plan = planStock(numbers);

        // Packages round the fetching up, never down: a household that wanted
        // seven spare units and can only buy tens comes home with ten.
        expect(plan.shelfAfterFetch).toBeGreaterThanOrEqual(plan.reserveUnits);
        // Max target = order point + what was fetched, as the bulk-package
        // formula puts it.
        expect(plan.shelfAfterFetch).toBe(plan.reorderPoint + plan.fetchQuantity);
      }),
    );
  });

  it('never plans less when more days are kept spare', () => {
    fc.assert(
      fc.property(wanted, fc.integer({ min: 0, max: 365 }), (numbers, more) => {
        const before = planStock(numbers);
        const after = planStock({ ...numbers, extraDays: numbers.extraDays + more });

        expect(after.reserveUnits).toBeGreaterThanOrEqual(before.reserveUnits);
        expect(after.reorderPoint).toBeGreaterThanOrEqual(before.reorderPoint);
        // The wait answers "how long until it runs out", not "how much do we
        // like having", so more reserve days cannot move it.
        expect(after.waitUnits).toBe(before.waitUnits);
      }),
    );
  });

  it('never plans less when fetching takes longer', () => {
    fc.assert(
      fc.property(wanted, fc.integer({ min: 0, max: 60 }), (numbers, longer) => {
        const before = planStock(numbers);
        const after = planStock({ ...numbers, leadDays: numbers.leadDays + longer });

        expect(after.waitUnits).toBeGreaterThanOrEqual(before.waitUnits);
        expect(after.reorderPoint).toBeGreaterThanOrEqual(before.reorderPoint);
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

  it('treats a shelf life longer than the use as no shelf life at all', () => {
    fc.assert(
      fc.property(wanted, (numbers) => {
        const oneUnitLasts = numbers.usageDays / numbers.usageUnits;

        expect(effectiveUsageDays(numbers)).toBeLessThanOrEqual(oneUnitLasts);
        if (numbers.freshDays >= FRESHNESS_NEVER) {
          expect(effectiveUsageDays(numbers)).toBe(oneUnitLasts);
        }
      }),
    );
  });

  it('never works out a lifespan of no time at all, whatever it is given', () => {
    fc.assert(
      fc.property(wanted, (numbers) => {
        expect(effectiveUsageDays(numbers)).toBeGreaterThan(0);
      }),
    );
  });

  it('counts a unit as gone in a day at least, unless it is used up quicker', () => {
    fc.assert(
      fc.property(wanted, (numbers) => {
        const oneUnitLasts = numbers.usageDays / numbers.usageUnits;

        expect(effectiveUsageDays(numbers)).toBeGreaterThanOrEqual(Math.min(1, oneUnitLasts));
      }),
    );
  });
});
