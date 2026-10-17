import { describe, expect, it } from 'vitest';
import { InvalidPresetFileError } from '../src/data/presets-file';
import { planStock } from '../src/domain/stock-plan';
import {
  countThings,
  deleteQuestion,
  exportedNotice,
  fetchCard,
  importFailed,
  importedNotice,
  importQuestion,
  itemLabel,
  itemName,
  itemSummary,
  keepCard,
  openedSharedShelfNotice,
  pictureButtonLabel,
  planCover,
  planHeadline,
  readingTime,
  reserveHolding,
  resetNotice,
  resetQuestion,
  sharedShelfQuestion,
  spoilsWarning,
} from '../src/ui/copy';
import { thing } from './support/items';

const detergent = thing({
  id: 'detergent',
  name: 'Laundry detergent',
  emoji: '🧴',
  usageDays: 30,
  leadDays: 3,
  extraDays: 60,
});

/** Eaten over a fortnight, but only good for a week once it is open. */
const butter = thing({
  id: 'butter',
  name: 'Butter',
  emoji: '🧈',
  usageDays: 14,
  leadDays: 2,
  extraDays: 7,
  freshDays: 7,
});

describe('the instruction the household reads first', () => {
  it('reads as one sentence: when, how many, how many to come home with', () => {
    expect(planHeadline(planStock(detergent))).toBe(
      "Down to 3 units? Bring home 2 more and you're at a level of 5, safe for emergencies.",
    );
  });

  it('counts in whole units, so the number cannot be read as a reserve', () => {
    const slow = thing({ usageDays: 10, leadDays: 25, extraDays: 30 });

    // Three units of wait and three of reserve: shop at six.
    expect(planHeadline(planStock(slow))).toContain('Down to 6 units?');
  });

  it('translates the shelf a fetch lands on into days of cover', () => {
    expect(planCover(detergent, planStock(detergent))).toBe('5 units ≈ 150 days of cover.');
  });

  it('asks for nothing by number when there is no reserve to rebuild', () => {
    const noReserve = thing({ usageDays: 30, leadDays: 3, extraDays: 0 });

    expect(planHeadline(planStock(noReserve))).toBe(
      'Down to 1 unit? No reserve, so fetch the next unit as this one runs out.',
    );
  });

  it('still asks for a pack when there is no reserve, because nothing smaller is sold', () => {
    const noReserve = thing({ usageDays: 2, leadDays: 4, extraDays: 0, packSize: 10 });

    expect(planHeadline(planStock(noReserve))).toBe(
      'Down to 2 units? No reserve, so fetch a 10-pack as this one runs out.',
    );
  });

  it('says "unit" when there is exactly one', () => {
    const single = { ...detergent, leadDays: 0, extraDays: 0 };
    expect(planCover(single, planStock(single))).toBe('1 unit ≈ 30 days of cover.');
  });

  it('counts a perishable at the size it is really gone in', () => {
    // Three units of butter: one for the wait, one of reserve, one fetched —
    // each gone a week after opening.
    expect(planCover(butter, planStock(butter))).toBe('3 units ≈ 21 days of cover.');
  });
});

describe('the household\'s own toilet paper, ten rolls at a time', () => {
  /** A roll every two days, four days to fetch, a fortnight of reserve. */
  const paper = thing({
    id: 'paper',
    name: 'Toilet paper (jumbo)',
    emoji: '🧻',
    usageDays: 2,
    leadDays: 4,
    extraDays: 14,
    packSize: 10,
  });

  it('fetches at the level the shelf is allowed to fall to, not at the last roll', () => {
    // Seven rolls of reserve plus the two a wait eats: fetch at nine, and the
    // pack of ten lands the shelf at nineteen — the reserve it asked for, plus
    // the seven spare the pack could not avoid adding.
    expect(planHeadline(planStock(paper))).toBe(
      "Down to 9 units? Bring home a 10-pack and you're at a level of 19, safe for emergencies.",
    );
  });

  it('counts the cupboard space the order point and the pack need together', () => {
    // Nine rolls to fetch at, plus the pack of ten: nineteen.
    expect(planCover(paper, planStock(paper))).toBe('19 units ≈ 38 days of cover.');
  });

  it('counts several packs when one will not cover the reserve', () => {
    const many = thing({ ...paper, packSize: 4 });

    expect(planHeadline(planStock(many))).toContain('Bring home 2 packs of 4');
  });
});

describe('the two cards on the dashboard', () => {
  it('counts the reserve, and says where the fetch level comes from', () => {
    const plan = planStock(thing({ usageDays: 30, leadDays: 3, extraDays: 60 }));

    expect(keepCard(plan)).toEqual({ value: 2, caption: 'units spare' });
    expect(fetchCard(plan)).toEqual({ value: 3, caption: '2 spare + 1 for the wait' });
  });

  it('says "unit" when there is exactly one spare', () => {
    const plan = planStock(thing({ usageDays: 30, leadDays: 3, extraDays: 30 }));

    expect(keepCard(plan)).toEqual({ value: 1, caption: 'unit spare' });
  });

  it('falls back to the shelf level, and says so, when nothing is kept spare', () => {
    const plan = planStock(thing({ usageDays: 30, leadDays: 3, extraDays: 0 }));

    expect(keepCard(plan)).toEqual({ value: 1, caption: 'unit — no reserve' });
    expect(fetchCard(plan)).toEqual({ value: 1, caption: 'unit left' });
  });
});

describe('the reserve card, which is stock and not shopping', () => {
  it('says the reserve in units when a shop sells them one at a time', () => {
    expect(reserveHolding(planStock(thing({ usageDays: 10, extraDays: 30 })))).toBe('3 units');
  });

  it('names the packs a cupboard holds, and the units outside them', () => {
    const plan = planStock(thing({ usageDays: 1, extraDays: 23, packSize: 10 }));

    expect(reserveHolding(plan)).toBe('2 packs of 10 + 3 units');
  });

  it('leaves the plus off when packs cover the reserve exactly', () => {
    const plan = planStock(thing({ usageDays: 1, extraDays: 20, packSize: 10 }));

    expect(reserveHolding(plan)).toBe('2 packs of 10');
  });

  it('says units on their own when the reserve is smaller than a pack', () => {
    const plan = planStock(thing({ usageDays: 1, extraDays: 3, packSize: 10 }));

    expect(reserveHolding(plan)).toBe('3 units on their own');
  });

  it('gets the singular right for one pack and one unit outside it', () => {
    const plan = planStock(thing({ usageDays: 1, extraDays: 11, packSize: 10 }));

    expect(reserveHolding(plan)).toBe('1 pack of 10 + 1 unit');
  });
});

describe('explaining a thing that turns before it is finished', () => {
  it('says the shelf life, then the size the plan really counts on', () => {
    expect(spoilsWarning(butter)).toBe(
      'It turns 7 days after opening, so a unit is really gone in 7 days, not the 14 days it takes to use up.',
    );
  });

  it('says a thing that will not keep at all is gone at once', () => {
    expect(spoilsWarning(thing({ usageDays: 3, freshDays: 0 }))).toBe(
      'It turns at once, so a unit is really gone in 1 day, not the 3 days it takes to use up.',
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

  it('says how many come in a pack, so a shelf can be read at a glance', () => {
    expect(itemSummary({ ...detergent, packSize: 10 })).toBe(
      '1 unit lasts 30 days · 3 days to fetch · 10 per pack',
    );
  });
});

describe('naming a thing', () => {
  it('uses the name the household gave it', () => {
    expect(itemName(detergent)).toBe('Laundry detergent');
  });

  it('falls back to a readable title instead of a blank line', () => {
    expect(itemName({ ...detergent, name: '   ' })).toBe('Unnamed thing');
  });

  it('puts the picture in front of the name, whether or not there is one', () => {
    expect(itemLabel(detergent)).toBe('🧴 Laundry detergent');
    expect(itemLabel({ ...detergent, emoji: '' })).toBe('Laundry detergent');
    expect(itemLabel({ ...detergent, emoji: '', name: '  ' })).toBe('Unnamed thing');
  });

  it('offers a face to stand for a thing that has no picture yet', () => {
    expect(pictureButtonLabel({ ...detergent, emoji: '' })).toBe('🙂 Picture');
    expect(pictureButtonLabel(detergent)).toBe('🧴 Picture');
  });
});

describe('a shelf arriving in a link', () => {
  it('asks what an import asks, about a link rather than a file', () => {
    expect(importQuestion(2, 6)).toBe(
      'Replace the 2 things here with the 6 things in this file?',
    );
    expect(sharedShelfQuestion(2, 6)).toBe(
      'Replace the 2 things here with the 6 things in this link?',
    );
  });

  it('says what the link brought, in whole things', () => {
    expect(openedSharedShelfNotice(1)).toBe('Opened the shelf in the link: 1 thing.');
    expect(openedSharedShelfNotice(3)).toBe('Opened the shelf in the link: 3 things.');
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
  });

  it('says what a reset threw away, and stays quiet when it threw nothing away', () => {
    expect(resetNotice(3)).toBe('Back to the starter things — 3 things of yours deleted.');
    expect(resetNotice(1)).toBe('Back to the starter things — 1 thing of yours deleted.');
    expect(resetNotice(0)).toBe('Back to the starter things.');
  });

  it('asks before a reset, naming how many things are about to go', () => {
    expect(resetQuestion(2)).toBe(
      'Delete all 2 things and start again from the starter ones?',
    );
  });
});

describe('how long a notice stays on screen', () => {
  it('gives a short line the three seconds every line gets', () => {
    expect(readingTime('Exported 2 things.')).toBe(3000);
  });

  it('gives a longer line longer, at three words a second', () => {
    // Ten words at three a second, and two seconds to notice it arrived.
    expect(readingTime('Back to the starter things — 1 thing of yours deleted.')).toBe(6000);
  });

  it('stops at ten seconds, however much there is to read', () => {
    expect(readingTime('something went wrong '.repeat(20))).toBe(10_000);
  });

  it('counts words, not the punctuation between them', () => {
    expect(readingTime('… — !')).toBe(3000);
  });
});
