import { useEffect } from 'hono/jsx/dom';
import type { StockItem } from '../domain/stock-item';
import { itemName, itemSummary } from './plan-copy';
import { TEXT } from './text';

/** The one text field in the app, so it always has a predictable id. */
export const THING_NAME_FIELD_ID = 'thing-name';

export interface ThingPickerProps {
  readonly items: readonly StockItem[];
  readonly currentId: string;
  readonly onSelect: (id: string) => void;
  readonly onRename: (id: string, name: string) => void;
  readonly onAdd: () => void;
  readonly onDelete: (item: StockItem) => void;
  readonly onExport: () => void;
  readonly onImport: (event: Event) => void;
  readonly onClose: () => void;
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
  onClose,
}: ThingPickerProps) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  const current = items.find((item) => item.id === currentId);

  return (
    <div
      class="fixed inset-0 z-[100] flex flex-col bg-base-100 overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-label="Which thing?"
    >
      <header class="navbar shrink-0 gap-2 bg-base-200 border-b border-base-300 px-3 md:px-6">
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
          class={`btn btn-square btn-lg shrink-0 rounded-none ${TEXT.body}`}
          aria-label="Close"
          title="Close"
          onClick={onClose}
        >
          ✕
        </button>
      </header>

      <div class="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-6">
        <ul class="flex flex-col gap-2 max-w-3xl mx-auto">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                class={`btn w-full h-auto min-h-16 md:min-h-20 justify-start text-left normal-case px-4 py-3 rounded-none ${
                  item.id === currentId
                    ? 'btn-primary'
                    : 'bg-base-100 border-2 border-base-300 hover:border-primary'
                }`}
                aria-current={item.id === currentId ? 'true' : undefined}
                onClick={() => onSelect(item.id)}
              >
                <span class="block min-w-0 flex-1">
                  <span class={`block truncate font-bold ${TEXT.body}`}>{itemName(item)}</span>
                  <span class={`block truncate opacity-70 mt-0.5 ${TEXT.small}`}>
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
          <p class={`text-center text-base-content/60 py-8 ${TEXT.body}`}>Nothing here yet.</p>
        )}
      </div>

      <footer class="shrink-0 bg-base-200 border-t border-base-300 p-3 md:p-6">
        <div class="max-w-3xl mx-auto flex flex-col gap-3">
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

          {current !== undefined && (
            <button
              type="button"
              class={`btn btn-error btn-outline btn-lg w-full rounded-none ${TEXT.body}`}
              onClick={() => onDelete(current)}
            >
              🗑️ Delete this thing
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
