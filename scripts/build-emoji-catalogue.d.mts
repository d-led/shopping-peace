/**
 * Types for the generator beside this file, which is plain JavaScript so that
 * plain Node can run it. Only `buildCatalogue` is used from tests; the file
 * itself is run as a script.
 */
import type { EmojiOption } from '../src/data/emoji';

/** The published data, as the dataset spells it: emoji to underscored words. */
export type PublishedEmoji = Record<string, string[]>;

/** The whole catalogue, household entries first. */
export function buildCatalogue(dataset: PublishedEmoji): EmojiOption[];
