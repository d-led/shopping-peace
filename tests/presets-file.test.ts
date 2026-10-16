import { describe, expect, it } from 'vitest';
import {
  InvalidPresetFileError,
  exportFilename,
  parsePresets,
  serializePresets,
} from '../src/data/presets-file';
import { FRESHNESS_NEVER, UNNAMED_ITEM } from '../src/domain/stock-item';
import { thing } from './support/items';

const detergent = thing({
  id: 'detergent',
  name: '🧴 Laundry detergent',
  usageDays: 30,
  leadDays: 3,
  extraDays: 30,
});

/** A file written before the freshness slider existed. */
const withoutFreshness = '{"usageDays": 30, "leadDays": 3, "extraDays": 30}';

describe('presets travelling as a file', () => {
  it('reads back exactly what it wrote', () => {
    expect(parsePresets(serializePresets([detergent]))).toEqual([detergent]);
  });

  it('round-trips an empty shelf', () => {
    expect(parsePresets(serializePresets([]))).toEqual([]);
  });

  it('names the file after the day it was exported', () => {
    expect(exportFilename(new Date('2026-10-16T08:00:00Z'))).toBe(
      'shopping-peace-presets-2026-10-16.json',
    );
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
});

describe('files that are not preset files', () => {
  it('refuses text that is not JSON', () => {
    expect(() => parsePresets('this is not json')).toThrow(InvalidPresetFileError);
  });

  it('refuses JSON that is not a list', () => {
    expect(() => parsePresets('{"usageDays": 30}')).toThrow(/list of presets/u);
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

  it('refuses a shelf life before opening', () => {
    expect(() =>
      parsePresets('[{"name": "Butter", "usageDays": 14, "leadDays": 2, "extraDays": 7, "freshDays": -1}]'),
    ).toThrow(/Preset #1 needs freshDays to be at least 0/u);
  });
});
