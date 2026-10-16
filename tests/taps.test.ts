import { describe, expect, it } from 'vitest';
import { TOGETHER_MS, tapWatcher } from '../src/ui/taps';

describe('telling a second tap from a first one', () => {
  it('takes two taps on the same thing as a pair', () => {
    const taps = tapWatcher();

    expect(taps.isSecondTap('tabs', 1000)).toBe(false);
    expect(taps.isSecondTap('tabs', 1400)).toBe(true);
  });

  it('leaves a slow second tap to stand on its own', () => {
    const taps = tapWatcher();

    taps.isSecondTap('tabs', 1000);

    expect(taps.isSecondTap('tabs', 1000 + TOGETHER_MS + 1)).toBe(false);
  });

  it('does not pair a tap with one on the thing below it', () => {
    const taps = tapWatcher();

    taps.isSecondTap('tabs', 1000);

    expect(taps.isSecondTap('detergent', 1100)).toBe(false);
  });

  it('starts again after a pair, so a third tap is a first one', () => {
    const taps = tapWatcher();

    taps.isSecondTap('tabs', 1000);
    expect(taps.isSecondTap('tabs', 1300)).toBe(true);

    expect(taps.isSecondTap('tabs', 1600)).toBe(false);
    expect(taps.isSecondTap('tabs', 1700)).toBe(true);
  });

  it('does not call a clock that went backwards a pair', () => {
    const taps = tapWatcher();

    taps.isSecondTap('tabs', 5000);

    expect(taps.isSecondTap('tabs', 4000)).toBe(false);
  });
});
