import { describe, expect, it } from 'vitest';
import type { StockItem } from '../src/domain/stock-item';
import { planStock } from '../src/domain/stock-plan';
import {
  countThings,
  itemName,
  itemSummary,
  planCover,
  planHeadline,
  spareNote,
} from '../src/ui/plan-copy';

const detergent: StockItem = {
  id: 'detergent',
  name: '🧴 Laundry detergent',
  usageDays: 30,
  leadDays: 3,
  extraDays: 60,
};

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
});

describe('saying how much of the shelf is spare', () => {
  it('names the spare count, so the tight half is not mistaken for the whole', () => {
    expect(spareNote(planStock({ usageDays: 30, leadDays: 3, extraDays: 60 }))).toBe(
      'units — 2 spare',
    );
  });

  it('says nothing about a spare when there is none', () => {
    expect(spareNote(planStock({ usageDays: 30, leadDays: 3, extraDays: 0 }))).toBe('units');
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
