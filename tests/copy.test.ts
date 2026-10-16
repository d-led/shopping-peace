import { describe, expect, it } from 'vitest';
import { InvalidPresetFileError } from '../src/data/presets-file';
import { planStock } from '../src/domain/stock-plan';
import {
  countThings,
  deleteQuestion,
  exportedNotice,
  importFailed,
  importedNotice,
  itemName,
  itemSummary,
  planCover,
  planHeadline,
  restoredNotice,
  spareNote,
  spoilsWarning,
} from '../src/ui/copy';
import { thing } from './support/items';

const detergent = thing({
  id: 'detergent',
  name: '🧴 Laundry detergent',
  usageDays: 30,
  leadDays: 3,
  extraDays: 60,
});

/** Eaten over a fortnight, but only good for a week once it is open. */
const butter = thing({
  id: 'butter',
  name: '🧈 Butter',
  usageDays: 14,
  leadDays: 2,
  extraDays: 7,
  freshDays: 7,
});

describe('the instruction the household reads first', () => {
  it('reads as one sentence: when, how many, how many to keep', () => {
    expect(planHeadline(planStock(detergent))).toBe(
      "Down to 1? Bring home 2 more and you're back at 3.",
    );
  });

  it('translates what is kept into days of cover', () => {
    expect(planCover(detergent, planStock(detergent))).toBe('3 units ≈ 90 days of cover.');
  });

  it('says "unit" when there is exactly one', () => {
    const single = { ...detergent, leadDays: 0, extraDays: 1 };
    expect(planCover(single, planStock(single))).toBe('1 unit ≈ 30 days of cover.');
  });

  it('counts a perishable at the size it is really gone in', () => {
    // Two units of butter, each gone a week after opening.
    expect(planCover(butter, planStock(butter))).toBe('2 units ≈ 14 days of cover.');
  });
});

describe('saying how much of the shelf is spare', () => {
  it('names the spare count, so the tight half is not mistaken for the whole', () => {
    expect(spareNote(planStock(thing({ usageDays: 30, leadDays: 3, extraDays: 60 })))).toBe(
      'units — 2 spare',
    );
  });

  it('says nothing about a spare when there is none', () => {
    expect(spareNote(planStock(thing({ usageDays: 30, leadDays: 3, extraDays: 0 })))).toBe('units');
  });
});

describe('explaining a thing that turns before it is finished', () => {
  it('names the shelf life, the unit, and the size the plan counts on', () => {
    expect(spoilsWarning(butter)).toBe(
      'It turns 7 days after opening, though one unit lasts 14 days — the plan counts a unit as gone in 7 days.',
    );
  });

  it('says a thing that will not keep at all is gone at once', () => {
    expect(spoilsWarning(thing({ usageDays: 3, freshDays: 0 }))).toBe(
      'It turns at once, though one unit lasts 3 days — the plan counts a unit as gone in 1 day.',
    );
  });
});

describe('summarising a thing in the picker', () => {
  it('puts both settings in days, so nothing has to be converted', () => {
    expect(itemSummary(detergent)).toBe('1 unit lasts 30 days · 3 days to fetch');
  });

  it('says "day" when there is exactly one', () => {
    expect(itemSummary({ ...detergent, usageDays: 1, leadDays: 1 })).toBe(
      '1 unit lasts 1 day · 1 day to fetch',
    );
  });
});

describe('naming a thing', () => {
  it('uses the name the household gave it', () => {
    expect(itemName(detergent)).toBe('🧴 Laundry detergent');
  });

  it('falls back to a readable title instead of a blank line', () => {
    expect(itemName({ ...detergent, name: '   ' })).toBe('Unnamed thing');
  });
});

describe('counting things out loud', () => {
  it('says "thing" for one', () => {
    expect(countThings(1)).toBe('1 thing');
  });

  it('says "things" for more than one, and for none', () => {
    expect(countThings(3)).toBe('3 things');
    expect(countThings(0)).toBe('0 things');
  });
});

describe('words for the things that happen to a shelf', () => {
  it('names the thing that is about to be deleted', () => {
    expect(deleteQuestion(detergent)).toBe('Delete 🧴 Laundry detergent?');
  });

  it('says "this thing" rather than asking about a blank', () => {
    expect(deleteQuestion({ ...detergent, name: '   ' })).toBe('Delete this thing?');
  });

  it('repeats the complaint about the imported file, word for word', () => {
    const complaint = new InvalidPresetFileError('Preset #2 needs freshDays to be at least 0.');

    expect(importFailed(complaint)).toBe('Preset #2 needs freshDays to be at least 0.');
  });

  it('says plainly when the failure was not the file being wrong', () => {
    expect(importFailed(new Error('the disk was yanked out'))).toBe(
      'That file could not be read.',
    );
  });

  it('counts what came and went, in whole things', () => {
    expect(exportedNotice(3)).toBe('Exported 3 things.');
    expect(importedNotice(1)).toBe('Imported 1 thing.');
    expect(restoredNotice(2)).toBe('Brought back 2 things.');
  });

  it('makes nothing of a restore that had nothing to restore', () => {
    expect(restoredNotice(0)).toBe('The starter things are all here already.');
  });
});
