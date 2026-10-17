import { describe, expect, it } from 'vitest';
import { InvalidPresetFileError } from '../src/data/presets-file';
import {
  decodeShelf,
  encodeShelf,
  linkWithShelf,
  shelfInHash,
  withoutHash,
} from '../src/data/share-link';
import { thing } from './support/items';

const detergent = thing({ id: 'detergent', name: '🧴 Laundry detergent', emoji: '🧴' });
const tabs = thing({ id: 'tabs', name: 'Dishwasher tabs', emoji: '🧽' });
const written = new Date('2026-10-17T09:00:00Z');

describe('a shelf travelling in an address', () => {
  it('comes back out whole, down to the last thing', () => {
    expect(decodeShelf(encodeShelf([detergent, tabs], null)).things).toEqual([detergent, tabs]);
  });

  it('keeps a picture beside a name, which is not one character to a byte', () => {
    const back = decodeShelf(encodeShelf([detergent], null));

    expect(back.things[0]?.name).toBe('🧴 Laundry detergent');
    expect(back.things[0]?.emoji).toBe('🧴');
  });

  it('carries the thing that was open, so the link opens where it was left', () => {
    expect(decodeShelf(encodeShelf([detergent, tabs], 'tabs')).selected).toBe('tabs');
  });

  it('carries the export file itself, only written small, so one reader serves both', () => {
    expect(jsonIn(encodeShelf([detergent], 'detergent', written))).toEqual({
      format: 'shopping-peace',
      version: 1,
      exported: written.toISOString(),
      selected: 'detergent',
      things: [detergent],
    });
  });

  it('writes an address with nothing in it a messenger would have to escape', () => {
    expect(encodeShelf([detergent, tabs], 'tabs', written)).toMatch(/^[A-Za-z0-9_-]+$/u);
  });

  it('refuses a link that was cut in half, in the app\'s own words', () => {
    expect(() => decodeShelf('a link a messenger cut in half!')).toThrow(InvalidPresetFileError);
  });
});

describe('the address a shared shelf travels in', () => {
  it('finds the shelf in an address that carries one', () => {
    expect(shelfInHash('#p=abc123')).toBe('abc123');
  });

  it('says there is no shelf in an address that carries none', () => {
    expect(shelfInHash('')).toBeNull();
    expect(shelfInHash('#something-else')).toBeNull();
    expect(shelfInHash('#p=')).toBeNull();
  });

  it('puts the shelf in the address, dropping whatever hash was there before', () => {
    expect(linkWithShelf('https://example.com/shop/#old', 'abc')).toBe(
      'https://example.com/shop/#p=abc',
    );
  });

  it('hands back the same address without a hash, for once the shelf is read', () => {
    expect(withoutHash('https://example.com/shop/#p=abc')).toBe('https://example.com/shop/');
  });
});

/**
 * What the payload really says, padding and all. The test decodes it by hand on
 * purpose: the wire format is what another copy of the app has to agree with,
 * so it is not the app's own reader that should be asked what is in there.
 */
function jsonIn(payload: string): unknown {
  const standard = payload.replaceAll('-', '+').replaceAll('_', '/');
  const padding = '='.repeat((4 - (standard.length % 4)) % 4);
  const binary = atob(standard + padding);
  // The payload is UTF-8, so its bytes are read back as text rather than as a
  // character each: the picture beside a name is four bytes, not four letters.
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}
