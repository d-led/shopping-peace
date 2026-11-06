import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { InvalidPresetFileError, parsePresets, serializePresets } from '../src/data/presets-file';
import type { StockItem } from '../src/domain/stock-item';
import { NUMBERS } from './support/property';

/** A preset as the app writes it: named, pictured, and with a shop's pack size. */
const preset: fc.Arbitrary<StockItem> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 12, unit: 'grapheme-ascii' }),
  // A blank name is not a preset as much as a thing waiting to be named, so
  // the round trip only has to hold for names somebody actually typed.
  name: fc.string({ minLength: 1, maxLength: 24 }).filter((name) => name.trim() !== ''),
  emoji: fc.constantFrom('', '🧽', '🧴', '🧈'),
  ...NUMBERS,
});

/**
 * A shelf as the app writes one, where no two things share an id: that is the
 * rule the app keeps everywhere else, so the round trip is about what else the
 * file carries.
 */
const shelf = fc.uniqueArray(preset, { selector: (item) => item.id, maxLength: 12 });

describe('a file of presets, whatever is in it', () => {
  it('reads back exactly what it was given', () => {
    fc.assert(
      fc.property(shelf, (presets) => {
        expect(parsePresets(serializePresets(presets))).toEqual(presets);
      }),
    );
  });

  it('survives a second round trip unchanged', () => {
    fc.assert(
      fc.property(shelf, (presets) => {
        const once = parsePresets(serializePresets(presets));
        expect(parsePresets(serializePresets(once))).toEqual(once);
      }),
    );
  });

  it('gives every thing an id of its own, however often the file repeats one', () => {
    fc.assert(
      fc.property(fc.array(preset, { maxLength: 12 }), (presets) => {
        const things = parsePresets(serializePresets(presets));

        expect(things).toHaveLength(presets.length);
        expect(new Set(things.map((item) => item.id)).size).toBe(things.length);
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
