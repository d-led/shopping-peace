/** @jsxImportSource hono/jsx/dom */
import { useRef } from 'hono/jsx/dom';
import type { StockItem } from '../domain/stock-item';
import { itemLabel, itemSummary } from './copy';
import { tapWatcher } from './taps';
import { TEXT } from './text';

export interface ThingListProps {
  readonly items: readonly StockItem[];
  readonly currentId: string;
  readonly onSelect: (id: string) => void;
  /** Leaves the sheet: a second tap on the same thing, from the list itself. */
  readonly onConfirm: () => void;
}

/**
 * The choosing half of the sheet: every thing on the shelf as a row a thumb can
 * hit, and nothing else. It gets the whole sheet, because choosing is what a
 * household opens the sheet for and a short screen has to be able to show more
 * than one thing at a time.
 *
 * Naming, the picture and the file buttons are not here: they are the other
 * job, and a screen that has room for seven rows has no room for both.
 */
export function ThingList({ items, currentId, onSelect, onConfirm }: ThingListProps) {
  // One watcher for the whole list, so it can tell a second tap on a thing from
  // a first tap on the one below it.
  const taps = useRef(tapWatcher());

  return (
    <div class="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-2 md:p-6">
      <ul class="flex flex-col gap-1.5 md:gap-2 max-w-3xl mx-auto">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              class={`btn w-full h-auto min-h-14 md:min-h-16 justify-start text-left normal-case px-3 py-2 md:px-4 md:py-3 rounded-none touch-manipulation ${
                item.id === currentId
                  ? 'btn-primary'
                  : 'bg-base-100 border-2 border-base-300 hover:border-primary'
              }`}
              aria-current={item.id === currentId ? 'true' : undefined}
              // The thing the household is on is where the sheet starts:
              // opening it is answering "which one?" with "this one".
              autofocus={item.id === currentId}
              onClick={(event) => {
                onSelect(item.id);
                // Two taps in a row mean "this one, and I am done" — the usual
                // way out of a picker on a touch screen. Counted from the taps
                // themselves: a phone rarely sends a dblclick for this gesture,
                // since it is also how you zoom.
                if (taps.current.isSecondTap(item.id, event.timeStamp)) {
                  onConfirm();
                }
              }}
            >
              <span class="block min-w-0 flex-1">
                <span
                  class={`block break-words leading-tight font-bold ${TEXT.body}`}
                  data-testid="picker-thing-name"
                >
                  {itemLabel(item)}
                </span>
                <span class={`block break-words leading-tight ${TEXT.small}`}>
                  {itemSummary(item)}
                </span>
              </span>
              {item.id === currentId && (
                <span aria-hidden="true" class={`shrink-0 ${TEXT.small}`}>
                  ✓
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {items.length === 0 && (
        <p class={`text-center text-base-content/70 py-6 ${TEXT.body}`}>Nothing here yet.</p>
      )}
    </div>
  );
}
