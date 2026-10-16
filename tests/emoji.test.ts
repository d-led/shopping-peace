import { describe, expect, it } from 'vitest';
import { searchEmoji, withEmoji } from '../src/data/emoji';

/** The symbols on offer for what somebody typed. */
function symbolsFor(query: string): string[] {
  return searchEmoji(query).map((option) => option.symbol);
}

describe('finding an emoji by what it is', () => {
  it('offers the thing you typed, not a hundred things near it', () => {
    expect(symbolsFor('sponge')).toEqual(['🧽']);
  });

  it('finds a thing by any of the words for it', () => {
    expect(symbolsFor('loo roll')).toContain('🧻');
    expect(symbolsFor('kitchen roll')).toContain('🧻');
  });

  it('cares about every word, so two words narrow rather than widen', () => {
    expect(symbolsFor('cat litter')).toEqual(['🐾']);
    expect(symbolsFor('cat litter').length).toBeLessThan(symbolsFor('cat').length);
  });

  it('matches a word wherever it sits, so "paper" finds roll and tray alike', () => {
    expect(symbolsFor('paper')).toEqual(expect.arrayContaining(['🧻', '📄']));
  });

  it('puts the likeliest first, so the common thing is the easy tap', () => {
    expect(symbolsFor('milk')[0]).toBe('🥛');
  });

  it('ignores case, and the spaces somebody leaves at the end', () => {
    expect(symbolsFor('BUTTER ')).toContain('🧈');
  });

  it('offers a browsable shelf before anything is typed', () => {
    expect(symbolsFor('').length).toBeGreaterThan(12);
  });

  it('says nothing rather than guessing when there is no such thing', () => {
    expect(symbolsFor('hedgehog harness')).toEqual([]);
  });

  it('stops at the number of choices a household can take in', () => {
    expect(searchEmoji('a', 5)).toHaveLength(5);
  });
});

describe('putting an emoji in front of a name', () => {
  it('adds one to a name that has none', () => {
    expect(withEmoji('Laundry detergent', '🧴')).toBe('🧴 Laundry detergent');
  });

  it('swaps the one that is already there rather than stacking them', () => {
    expect(withEmoji('🧴 Laundry detergent', '🧼')).toBe('🧼 Laundry detergent');
  });

  it('is happy with a name that is only an emoji so far', () => {
    expect(withEmoji('', '🧽')).toBe('🧽');
    expect(withEmoji('🧽', '🧼')).toBe('🧼');
  });

  it('leaves a name that starts with a word, however odd, untouched', () => {
    expect(withEmoji('Dishwasher tabs', '🧽')).toBe('🧽 Dishwasher tabs');
  });
});
