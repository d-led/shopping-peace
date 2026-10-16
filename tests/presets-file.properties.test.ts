import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { InvalidPresetFileError, parsePresets, serializePresets } from '../src/data/presets-file';
import type { StockItem } from '../src/domain/stock-item';

/** A preset as the app writes it: named, and with three whole numbers of days. */
const preset: fc.Arbitrary<StockItem> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 12, unit: 'grapheme-ascii' }),
  // A blank name is not a preset as much as a thing waiting to be named, so
  // the round trip only has to hold for names somebody actually typed.
  name: fc.string({ minLength: 1, maxLength: 24 }).filter((name) => name.trim() !== ''),
  usageDays: fc.integer({ min: 1, max: 365 }),
  leadDays: fc.integer({ min: 0, max: 60 }),
  extraDays: fc.integer({ min: 0, max: 365 }),
});

describe('a file of presets, whatever is in it', () => {
  it('reads back exactly what it was given', () => {
    fc.assert(
      fc.property(fc.array(preset, { maxLength: 12 }), (presets) => {
        expect(parsePresets(serializePresets(presets))).toEqual(presets);
      }),
    );
  });

  it('survives a second round trip unchanged', () => {
    fc.assert(
      fc.property(fc.array(preset, { maxLength: 12 }), (presets) => {
        const once = parsePresets(serializePresets(presets));
        expect(parsePresets(serializePresets(once))).toEqual(once);
      }),
    );
  });

  it('refuses anything that is not a list, and says why', () => {
    fc.assert(
      fc.property(
        fc.jsonValue().filter((value) => !Array.isArray(value)),
        (value) => {
          expect(() => parsePresets(JSON.stringify(value))).toThrow(InvalidPresetFileError);
        },
      ),
    );
  });

  it('refuses a list holding something that is not a preset', () => {
    fc.assert(
      fc.property(
        fc
          .jsonValue()
          .filter((value) => typeof value !== 'object' || Array.isArray(value))
          .map((value) => JSON.stringify([value])),
        (text) => {
          expect(() => parsePresets(text)).toThrow(InvalidPresetFileError);
        },
      ),
    );
  });
});
