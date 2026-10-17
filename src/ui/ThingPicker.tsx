import { useEffect, useRef, useState } from 'hono/jsx/dom';
import type { StockItem } from '../domain/stock-item';
import { EmojiPicker } from './EmojiPicker';
import { SheetActions } from './SheetActions';
import { itemLabel, itemSummary, pictureButtonLabel } from './copy';
import { tapWatcher } from './taps';
import { TEXT } from './text';
import { THING_NAME_FIELD_ID, focusThingNameSoon } from './thing-name';

export interface ThingPickerProps {
  readonly items: readonly StockItem[];
  readonly currentId: string;
  readonly onSelect: (id: string) => void;
  readonly onRename: (id: string, name: string) => void;
  /** Sets the character in front of the name; the name itself is untouched. */
  readonly onEmoji: (emoji: string) => void;
  readonly onAdd: () => void;
  readonly onDelete: (item: StockItem) => void;
  /** Writes every thing to one file. */
  readonly onExportAll: () => void;
  /** Writes just the thing on screen to one file, named after it. */
  readonly onExportCurrent: () => void;
  readonly onImport: (event: Event) => void;
  /** Throws the shelf away and starts again from the starter things. */
  readonly onResetToDefaults: () => void;
  /** Leaves the sheet. Everything is already saved, so this is just "done". */
  readonly onConfirm: () => void;
}

/**
 * The whole screen, filled with nothing but things to choose from — plus the
 * three jobs that only happen once in a while: naming, deleting, and getting
 * the presets in and out again as a file. The link version lives at the foot of
 * the main screen, since what it hands over needs no editing. A household hand
 * gets a list a foot tall instead of a dropdown the width of a thumbnail.
 */
export function ThingPicker({
  items,
  currentId,
  onSelect,
  onRename,
  onEmoji,
  onAdd,
  onDelete,
  onExportAll,
  onExportCurrent,
  onImport,
  onResetToDefaults,
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
  // One watcher for the whole sheet, so it can tell a second tap on a thing
  // from a first tap on the one below it.
  const taps = useRef(tapWatcher());
  // The picture button and the search it opens, so a click anywhere else can be
  // told apart from a click inside.
  const pictureBlock = useRef<HTMLDivElement | null>(null);

  // Naming and picture go together: picking one settles it, folds the search
  // away — no confirming step — and puts the caret back in the name, ready for
  // what the picture is of.
  const chooseEmoji = (symbol: string) => {
    onEmoji(symbol);
    setPickingEmoji(false);
    focusThingNameSoon();
  };

  return (
    <div
      class="fixed inset-0 z-[100] flex flex-col bg-base-100 overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-label="Which thing?"
      onClick={(event: MouseEvent) => {
        // Anything the household taps that is not the picture button or the
        // search under it means they are done with the picture.
        if (pickingEmoji && !(pictureBlock.current?.contains(event.target as Node) ?? false)) {
          setPickingEmoji(false);
        }
      }}
    >
      {/* A plain box, not a <header>: a header inside a dialog is a second
          banner landmark, and a page has room for one. */}
      <div class="navbar shrink-0 gap-1.5 md:gap-2 bg-base-200 border-b border-base-300 px-2 md:px-6">
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
      </div>

      <div class="flex-1 overflow-y-auto overflow-x-hidden p-2 md:p-6">
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
                onClick={(event) => {
                  onSelect(item.id);
                  // Two taps in a row mean "this one, and I am done" — the
                  // usual way out of a picker on a touch screen. Counted from
                  // the taps themselves: a phone rarely sends a dblclick for
                  // this gesture, since it is also how you zoom.
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

      <footer class="shrink-0 bg-base-200 border-t border-base-300 p-2 md:p-6">
        <div class="max-w-3xl mx-auto flex flex-col gap-2 md:gap-3">
          {current !== undefined && (
            <div>
              <label
                class={`block font-black uppercase tracking-wider text-base-content/70 mb-1 ${TEXT.small}`}
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
              <div
                ref={pictureBlock}
                // The picture is settled the moment the household taps
                // something else: the search folds away whether or not one was
                // picked, so nothing has to be confirmed. Focus moving out is
                // a tab or a tap on a field; a click on something that cannot
                // hold focus — a row, the background — is the other half.
                onFocusOut={(event: FocusEvent) => {
                  const next = event.relatedTarget as Node | null;
                  const stillInside = pictureBlock.current?.contains(next) ?? false;
                  if (!stillInside) {
                    setPickingEmoji(false);
                  }
                }}
              >
                <button
                  type="button"
                  class={`btn btn-lg w-full h-auto rounded-none mt-2 ${TEXT.body}`}
                  aria-label={`${pictureButtonLabel(current)} — change it`}
                  aria-expanded={String(pickingEmoji)}
                  title="Find a picture by what it is"
                  onClick={() => setPickingEmoji(!pickingEmoji)}
                >
                  {pictureButtonLabel(current)}
                </button>
                {pickingEmoji && <EmojiPicker onPick={chooseEmoji} />}
              </div>
            </div>
          )}

          <SheetActions
            current={current}
            onExportAll={onExportAll}
            onExportCurrent={onExportCurrent}
            onImport={onImport}
            onResetToDefaults={onResetToDefaults}
            onDelete={onDelete}
          />
        </div>
      </footer>
    </div>
  );
}
