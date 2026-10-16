import { describe, expect, it } from 'vitest';
import {
  InvalidPresetFileError,
  PRESET_FILE_VERSION,
  exportFilename,
  onePresetFilename,
  parsePresets,
  serializePresets,
} from '../src/data/presets-file';
import { FRESHNESS_NEVER, UNNAMED_ITEM } from '../src/domain/stock-item';
import { thing } from './support/items';

const detergent = thing({
  id: 'detergent',
  name: 'Laundry detergent',
  emoji: '🧴',
  usageDays: 30,
  leadDays: 3,
  extraDays: 30,
});

/** A file written before the freshness slider existed. */
const withoutFreshness = '{"usageDays": 30, "leadDays": 3, "extraDays": 30}';

/** The shape this app wrote before the file had a version or a picture field. */
const legacy = '[{"name": "🧴 Laundry detergent", "usageDays": 30, "leadDays": 3, "extraDays": 30}]';

describe('presets travelling as a file', () => {
  it('reads back exactly what it wrote', () => {
    expect(parsePresets(serializePresets([detergent]))).toEqual([detergent]);
  });

  it('round-trips an empty shelf', () => {
    expect(parsePresets(serializePresets([]))).toEqual([]);
  });

  it('says what it is and when it was written, so a household can place it', () => {
    const file = JSON.parse(serializePresets([detergent], new Date('2026-10-16T08:00:00Z')));

    expect(file).toMatchObject({
      format: 'shopping-peace',
      version: PRESET_FILE_VERSION,
      exported: '2026-10-16T08:00:00.000Z',
    });
    expect(file.things).toHaveLength(1);
  });

  it('writes the picture as a field of its own, out of the name', () => {
    const { things } = JSON.parse(serializePresets([detergent]));

    expect(things[0]).toMatchObject({ name: 'Laundry detergent', emoji: '🧴' });
  });

  it('names the file after the day it was exported', () => {
    expect(exportFilename(new Date('2026-10-16T08:00:00Z'))).toBe(
      'shopping-peace-presets-2026-10-16.json',
    );
  });

  it('names a single-thing export after the thing', () => {
    expect(onePresetFilename('Laundry detergent', new Date('2026-10-16T08:00:00Z'))).toBe(
      'shopping-peace-laundry-detergent-2026-10-16.json',
    );
  });

  it('still has a filename to offer when a name is all punctuation', () => {
    expect(onePresetFilename('!!!', new Date('2026-10-16T08:00:00Z'))).toBe(
      'shopping-peace-preset-2026-10-16.json',
    );
  });
});

describe('files written before the format was versioned', () => {
  it('still reads a bare list of things', () => {
    expect(parsePresets(`[${withoutFreshness}]`)[0]?.name).toBe(UNNAMED_ITEM);
  });

  it('takes the picture that was kept inside the name and puts it aside', () => {
    expect(parsePresets(legacy)[0]).toMatchObject({ name: 'Laundry detergent', emoji: '🧴' });
  });

  it('leaves a name without a picture exactly as it was', () => {
    expect(parsePresets(`[${withoutFreshness}]`)[0]?.emoji).toBe('');
  });
});

describe('presets that arrive incomplete', () => {
  it('keeps the ids, so re-importing updates instead of duplicating', () => {
    expect(parsePresets(serializePresets([detergent]))[0]?.id).toBe('detergent');
  });

  it('invents an id when the file has none', () => {
    expect(parsePresets(`[${withoutFreshness}]`, () => 'fresh-id')[0]?.id).toBe('fresh-id');
  });

  it('shows an unnamed preset as "Unnamed thing" rather than dropping it', () => {
    expect(parsePresets(`[${withoutFreshness}]`)[0]?.name).toBe(UNNAMED_ITEM);
  });

  it('takes an older file to mean "this keeps", not "this spoils today"', () => {
    expect(parsePresets(`[${withoutFreshness}]`)[0]?.freshDays).toBe(FRESHNESS_NEVER);
  });

  it('takes a file with no pack size to mean sold one at a time', () => {
    expect(parsePresets(`[${withoutFreshness}]`)[0]?.packSize).toBe(1);
  });

  it('refuses a pack of no units, which is not a thing a shop sells', () => {
    expect(() =>
      parsePresets('[{"name": "Soap", "usageDays": 30, "leadDays": 3, "extraDays": 0, "packSize": 0}]'),
    ).toThrow(/Preset #1 needs packSize to be at least 1/u);
  });
});

describe('files that are not preset files', () => {
  it('refuses text that is not JSON', () => {
    expect(() => parsePresets('this is not json')).toThrow(InvalidPresetFileError);
  });

  it('refuses a file with no version, rather than guessing what it is', () => {
    expect(() => parsePresets('{"things": []}')).toThrow(/has no version/u);
  });

  it('refuses an object with no list of things in it', () => {
    expect(() => parsePresets('{"version": 1}')).toThrow(/list of presets/u);
  });

  it('refuses a file from a newer copy of the app, and says which', () => {
    expect(() => parsePresets('{"version": 99, "things": []}')).toThrow(
      /newer Shopping Peace \(version 99; this copy reads 1\)/u,
    );
  });

  it('refuses a list of things that are not presets', () => {
    expect(() => parsePresets('["detergent"]')).toThrow(/Preset #1 is not an object/u);
  });

  it('refuses a missing number instead of guessing one', () => {
    expect(() => parsePresets('[{"name": "Detergent"}]')).toThrow(
      /Preset #1 needs usageDays to be at least 1/u,
    );
  });

  it('says which preset in the file is broken', () => {
    expect(() =>
      parsePresets(`[${withoutFreshness}, {"usageDays": 0, "leadDays": 3, "extraDays": 0}]`),
    ).toThrow(/Preset #2 needs usageDays to be at least 1/u);
  });

  it('refuses a name that is not text', () => {
    expect(() =>
      parsePresets('[{"name": 42, "usageDays": 30, "leadDays": 3, "extraDays": 0}]'),
    ).toThrow(/not text/u);
  });

  it('refuses a picture that is not text', () => {
    expect(() =>
      parsePresets('[{"name": "Soap", "emoji": 42, "usageDays": 30, "leadDays": 3, "extraDays": 0}]'),
    ).toThrow(/emoji is not text/u);
  });

  it('refuses a shelf life before opening', () => {
    expect(() =>
      parsePresets('[{"name": "Butter", "usageDays": 14, "leadDays": 2, "extraDays": 7, "freshDays": -1}]'),
    ).toThrow(/Preset #1 needs freshDays to be at least 0/u);
  });
});
