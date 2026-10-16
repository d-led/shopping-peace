import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EMOJI_CATALOGUE } from '../src/data/emoji-catalogue';
import { searchEmoji, withEmoji } from '../src/data/emoji';
import { HOUSEHOLD_EMOJI } from '../src/data/household-emoji';
import { buildCatalogue } from '../scripts/build-emoji-catalogue.mjs';

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

  it('reaches the whole published set, not just the household list', () => {
    expect(symbolsFor('whale')).toContain('🐋');
    expect(symbolsFor('hedgehog')).toContain('🦔');
    expect(symbolsFor('aubergine')).toContain('🍆');
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

describe('the set that search runs over', () => {
  const characters = (symbol: string): string[] => [...symbol];

  it('holds the whole published set, with the household emoji leading it', () => {
    const lead = EMOJI_CATALOGUE.slice(0, HOUSEHOLD_EMOJI.length);

    expect(EMOJI_CATALOGUE.length).toBeGreaterThan(1000);
    expect(lead.map((option) => option.symbol)).toEqual(
      HOUSEHOLD_EMOJI.map((option) => option.symbol),
    );
  });

  it('keeps the household words in front of the published ones', () => {
    for (const option of HOUSEHOLD_EMOJI) {
      const generated = EMOJI_CATALOGUE.find((candidate) => candidate.symbol === option.symbol);

      // The words a household would type come first, so they win the ranking.
      expect(generated?.keywords.slice(0, option.keywords.length)).toEqual(option.keywords);
    }
  });

  it('holds only what one character can draw', () => {
    const joined = EMOJI_CATALOGUE.filter(
      (option) =>
        characters(option.symbol).length > 2 ||
        (characters(option.symbol).length === 2 && characters(option.symbol)[1] !== '\uFE0F') ||
        option.symbol.includes('\u200d'),
    );

    expect(joined).toEqual([]);
  });

  it('gives every emoji words to be found by, and none of them empty', () => {
    const wordless = EMOJI_CATALOGUE.filter((option) => option.keywords.length === 0);
    const blank = EMOJI_CATALOGUE.flatMap((option) =>
      option.keywords.filter((keyword) => keyword.trim() === ''),
    );

    expect(wordless).toEqual([]);
    expect(blank).toEqual([]);
  });

  it('is what the generator produces from the published data, not hand-edited', async () => {
    const dataset = JSON.parse(
      await readFile(join('node_modules', 'emojilib', 'dist', 'emoji-en-US.json'), 'utf8'),
    );

    expect(EMOJI_CATALOGUE).toEqual(buildCatalogue(dataset));
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
