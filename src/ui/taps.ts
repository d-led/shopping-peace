/**
 * Which tap is the second one.
 *
 * A phone does not reliably report a double tap as `dblclick`: the same gesture
 * is also "zoom in", so the browser may keep it for itself, or hold it back
 * until the app has already moved on. Rows therefore count their own taps
 * instead of waiting for an event that may never arrive.
 */
export interface TapWatcher {
  /** True when this tap is the second one on the same row, soon enough. */
  isSecondTap(rowId: string, at: number): boolean;
}

/**
 * How close together two taps have to be. Slow enough for a real thumb — and
 * for the phone it is on, where a busy moment between the two taps of a pair is
 * ordinary: the cost of being generous is only that a second tap meant for a
 * second look closes the sheet, which the household can open again.
 */
export const TOGETHER_MS = 600;

export function tapWatcher(within: number = TOGETHER_MS): TapWatcher {
  let lastRow: string | null = null;
  let lastAt = 0;

  return {
    isSecondTap(rowId, at) {
      // A clock that went backwards is not a second tap, whatever it says.
      const together = rowId === lastRow && at >= lastAt && at - lastAt <= within;
      // A second tap closes the pair, so a third starts a new one.
      lastRow = together ? null : rowId;
      lastAt = at;
      return together;
    },
  };
}
