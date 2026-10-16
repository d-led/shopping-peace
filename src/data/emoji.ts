import { EMOJI_CATALOGUE } from './emoji-catalogue';

/**
 * The emoji a household can put in front of a thing's name, and the words
 * people look for them by.
 *
 * The set is the published one (`emoji-catalogue.ts`, generated from emojilib),
 * with the household's own words for everyday things leading it — see
 * `household-emoji.ts`. Only single characters are in it, because the joined-up
 * sequences look broken wherever the fonts disagree.
 */
export interface EmojiOption {
  readonly symbol: string;
  readonly keywords: readonly string[];
}

const CATALOGUE = EMOJI_CATALOGUE;

/** What a shelf shows when nobody has typed anything yet. */
const BROWSE_LIMIT = 24;

/**
 * The emoji worth offering for what was typed, best match first. Words are
 * matched anywhere in a keyword, so "paper" finds both the roll and the tray,
 * and every word has to match, so "cat food" is narrower than "food".
 */
export function searchEmoji(query: string, limit = BROWSE_LIMIT): readonly EmojiOption[] {
  const words = query
    .toLowerCase()
    .split(/\s+/u)
    .filter((word) => word !== '');

  if (words.length === 0) {
    return CATALOGUE.slice(0, limit);
  }

  return CATALOGUE.filter((option) => scoreOf(option, words) > 0)
    .sort((left, right) => scoreOf(right, words) - scoreOf(left, words))
    .slice(0, limit);
}

/**
 * How well the words fit, or zero for no fit at all. A keyword that begins
 * with what was typed counts double: somebody typing "mil" wants milk before
 * they want toothpaste.
 */
function scoreOf(option: EmojiOption, words: readonly string[]): number {
  let total = 0;

  for (const word of words) {
    const keyword = option.keywords.find((candidate) => candidate.includes(word));
    if (keyword === undefined) {
      return 0;
    }
    total += keyword.startsWith(word) ? 2 : 1;
  }

  return total;
}

/**
 * The prefix a name has when the picture was written into the text itself: one
 * pictograph, plus any variation selector or zero-width joiner that trails it.
 */
const LEADING_EMOJI = /^\p{Extended_Pictographic}(?:\u200d|\ufe0f)*\s*/u;

/**
 * A name that carries its picture in the text, taken apart. Files written
 * before the picture had a field of its own look like this, so they are split
 * on the way in — and only there: what somebody types stays as they typed it.
 */
export function splitEmoji(name: string): { name: string; emoji: string } {
  const match = LEADING_EMOJI.exec(name);
  if (match === null) {
    return { name, emoji: '' };
  }
  return { name: name.slice(match[0].length).trim(), emoji: match[0].trim() };
}
