import type { StockItem } from '../domain/stock-item';
import { InvalidPresetFileError, parsePresetFile, presetFile, type PresetShelf } from './presets-file';

/** The hash parameter a shelf travels in: `#p=<shelf>`. */
export const SHELF_HASH_PARAM = 'p';

/**
 * A whole shelf — every thing, and the one that was open — as one URL-safe
 * string, for an address that can be pasted into a message.
 *
 * It is the export file's own JSON, written without the indentation that is
 * only there for a household reading the file. One shape, one version, one
 * set of checks: a link and a file are read and refused by the same code.
 */
export function encodeShelf(
  items: readonly StockItem[],
  selected: string | null,
  exportedAt: Date = new Date(),
): string {
  return toUrlSafeBase64(JSON.stringify(presetFile(items, exportedAt, selected)));
}

/**
 * The shelf a link carries.
 *
 * A payload that is not a shelf is refused, not half-read. Base64 that will not
 * decode is the ordinary case of a link that a messenger cut in half, so it is
 * reported in the app's own words rather than as a decoder's complaint.
 */
export function decodeShelf(payload: string): PresetShelf {
  try {
    return parsePresetFile(fromUrlSafeBase64(payload));
  } catch (error) {
    if (error instanceof InvalidPresetFileError) {
      throw error;
    }
    throw new InvalidPresetFileError('This link does not hold a shelf.');
  }
}

/** The shelf in an address's hash, or null when the address carries none. */
export function shelfInHash(hash: string): string | null {
  const payload = new URLSearchParams(hash.replace(/^#/u, '')).get(SHELF_HASH_PARAM);
  return payload === null || payload === '' ? null : payload;
}

/** An address with the shelf in its hash, and whatever hash it had before dropped. */
export function linkWithShelf(pageUrl: string, payload: string): string {
  const [page = ''] = pageUrl.split('#');
  return `${page}#${SHELF_HASH_PARAM}=${payload}`;
}

/** The same address without a hash, for once the shelf in it has been read. */
export function withoutHash(pageUrl: string): string {
  const [page = ''] = pageUrl.split('#');
  return page;
}

/**
 * Base64 in the URL-safe alphabet, unpadded. The payload is text and the text
 * has emoji in it, so it goes through its UTF-8 bytes rather than `btoa`'s
 * one-byte-per-character habit.
 */
function toUrlSafeBase64(text: string): string {
  let binary = '';
  for (const byte of new TextEncoder().encode(text)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function fromUrlSafeBase64(payload: string): string {
  const standard = withPadding(payload.replaceAll('-', '+').replaceAll('_', '/'));
  const binary = atob(standard);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** `atob` wants its `=` back, and the URL-safe alphabet drops them. */
function withPadding(standard: string): string {
  const missing = standard.length % 4;
  return missing === 0 ? standard : standard + '='.repeat(4 - missing);
}
