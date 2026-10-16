import { useEffect, useState } from 'hono/jsx/dom';
import { withEmoji } from '../data/emoji';
import type { StockItem } from '../domain/stock-item';
import { EmojiPicker } from './EmojiPicker';
import { itemName, itemSummary } from './copy';
import { TEXT } from './text';
import { THING_NAME_FIELD_ID, focusThingNameSoon } from './thing-name';

export interface ThingPickerProps {
  readonly items: readonly StockItem[];
  readonly currentId: string;
  readonly onSelect: (id: string) => void;
  readonly onRename: (id: string, name: string) => void;
  readonly onAdd: () => void;
  readonly onDelete: (item: StockItem) => void;
  readonly onExport: () => void;
  readonly onImport: (event: Event) => void;
  /** Brings back any starter preset that is missing. Never removes anything. */
  readonly onRestoreDefaults: () => void;
  /** Leaves the sheet. Everything is already saved, so this is just "done". */
  readonly onConfirm: () => void;
}

/**
 * The whole screen, filled with nothing but things to choose from — plus the
 * three jobs that only happen once in a while: naming, deleting, and getting
 * the presets in and out of a file. A household hand gets a list a foot tall
 * instead of a dropdown the width of a thumbnail.
 */
export function ThingPicker({
  items,
  currentId,
  onSelect,
  onRename,
  onAdd,
  onDelete,
  onExport,
  onImport,
  onRestoreDefaults,
  onConfirm,
}: ThingPickerProps) {
  useEffect(() => {
    const confirmOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onConfirm();
      }
    };
    document.addEventListener('keydown', confirmOnEscape);
    return () => document.removeEventListener('keydown', confirmOnEscape);
  }, [onConfirm]);

  const current = items.find((item) => item.id === currentId);
  const [pickingEmoji, setPickingEmoji] = useState(false);

  // Naming and emoji go together: after a picture is picked, the caret belongs
  // in the name, ready for what it is a picture of.
  const putEmojiInFrontOf = (symbol: string) => {
    if (current === undefined) {
      return;
    }
    onRename(current.id, withEmoji(current.name, symbol));
    focusThingNameSoon();
  };

  return (
    <div
      class="fixed inset-0 z-[100] flex flex-col bg-base-100 overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-label="Which thing?"
    >
      <header class="navbar shrink-0 gap-1.5 md:gap-2 bg-base-200 border-b border-base-300 px-2 md:px-6">
        <h2 class={`min-w-0 flex-1 font-black tracking-tight ${TEXT.body}`}>Which thing?</h2>
        <button
          type="button"
          class={`btn btn-square btn-lg shrink-0 rounded-none ${TEXT.body}`}
          aria-label="New thing"
          title="New thing"
          onClick={onAdd}
        >
          +
        </button>
        <button
          type="button"
          class={`btn btn-primary btn-lg shrink-0 rounded-none ${TEXT.body}`}
          aria-label="OK"
          title="OK — done"
          onClick={onConfirm}
        >
          ✓ OK
        </button>
      </header>

      <div class="flex-1 overflow-y-auto overflow-x-hidden p-2 md:p-6">
        <ul class="flex flex-col gap-1.5 md:gap-2 max-w-3xl mx-auto">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                class={`btn w-full h-auto min-h-14 md:min-h-16 justify-start text-left normal-case px-3 py-2 md:px-4 md:py-3 rounded-none ${
                  item.id === currentId
                    ? 'btn-primary'
                    : 'bg-base-100 border-2 border-base-300 hover:border-primary'
                }`}
                aria-current={item.id === currentId ? 'true' : undefined}
                onClick={() => onSelect(item.id)}
                // A double press means "this one, and I am done": the usual
                // way out of a picker on a touch screen.
                onDblClick={() => {
                  onSelect(item.id);
                  onConfirm();
                }}
              >
                <span class="block min-w-0 flex-1">
                  <span
                    class={`block break-words leading-tight font-bold ${TEXT.body}`}
                    data-testid="picker-thing-name"
                  >
                    {itemName(item)}
                  </span>
                  <span class={`block break-words leading-tight opacity-70 ${TEXT.small}`}>
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
          <p class={`text-center text-base-content/60 py-6 ${TEXT.body}`}>Nothing here yet.</p>
        )}
      </div>

      <footer class="shrink-0 bg-base-200 border-t border-base-300 p-2 md:p-6">
        <div class="max-w-3xl mx-auto flex flex-col gap-2 md:gap-3">
          {current !== undefined && (
            <div>
              <label
                class={`block font-black uppercase tracking-wider text-base-content/60 mb-1 ${TEXT.small}`}
                for={THING_NAME_FIELD_ID}
              >
                What is it called?
              </label>
              <input
                id={THING_NAME_FIELD_ID}
                type="text"
                class={`input input-lg w-full h-auto py-3 rounded-none font-bold ${TEXT.body}`}
                placeholder="e.g. Laundry detergent"
                value={current.name}
                onInput={(event) =>
                  onRename(current.id, (event.target as HTMLInputElement).value)
                }
              />
              <button
                type="button"
                class={`btn btn-lg w-full h-auto rounded-none mt-2 ${TEXT.body}`}
                aria-expanded={pickingEmoji ? 'true' : 'false'}
                title="Find an emoji by what it is"
                onClick={() => setPickingEmoji(!pickingEmoji)}
              >
                🙂 Emoji
              </button>
              {pickingEmoji && <EmojiPicker onPick={putEmojiInFrontOf} />}
            </div>
          )}

          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class={`btn btn-lg flex-1 min-w-[7rem] rounded-none ${TEXT.body}`}
              onClick={onExport}
            >
              📤 Export
            </button>
            <label class={`btn btn-lg flex-1 min-w-[7rem] rounded-none ${TEXT.body}`}>
              📥 Import
              <input
                type="file"
                accept="application/json,.json"
                class="hidden"
                onChange={onImport}
              />
            </label>
          </div>

          <div class="flex flex-col gap-2 md:gap-3 border-t border-base-300 pt-2 md:pt-3">
            <div class="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                class={`btn btn-sm rounded-none ${TEXT.small}`}
                onClick={onRestoreDefaults}
              >
                ↩️ Restore defaults
              </button>
              {current !== undefined && (
                <button
                  type="button"
                  class={`btn btn-error btn-outline btn-sm rounded-none ${TEXT.small}`}
                  onClick={() => onDelete(current)}
                >
                  🗑️ Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
