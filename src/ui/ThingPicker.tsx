import { useEffect, useRef, useState } from 'hono/jsx/dom';
import type { StockItem } from '../domain/stock-item';
import { EmojiPicker } from './EmojiPicker';
import { NoticeBar, type Notice } from './NoticeBar';
import { SheetActions } from './SheetActions';
import { itemLabel, itemSummary, pictureButtonLabel } from './copy';
import { tapWatcher } from './taps';
import { TEXT } from './text';
import { THING_NAME_FIELD_ID, focusThingNameSoon } from './thing-name';

/** The heading the sheet is named by, for the dialog's accessible name. */
const SHEET_TITLE_ID = 'which-thing-title';

/** Whether something the household touched is outside the picture block. */
function outsidePictures(
  pictures: HTMLDivElement | null,
  target: EventTarget | null,
): boolean {
  return !(pictures?.contains(target as Node | null) ?? false);
}

/**
 * Whether focus leaving the picture block means the household has moved on,
 * rather than a tap still on its way to the icon.
 *
 * A touch screen blurs the search field first and delivers the click
 * afterwards, so that blur is not a move: it arrives with nothing to focus, or
 * with the sheet itself, because a button there takes no focus at all. Anything
 * else is a real move — a tab, or a tap on another field.
 */
function focusMovedOn(
  event: FocusEvent,
  pictures: HTMLDivElement | null,
  sheet: HTMLDialogElement | null,
): boolean {
  const next = event.relatedTarget as Node | null;
  if (next === null || next === sheet) {
    return false;
  }
  return outsidePictures(pictures, next);
}

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
  /**
   * What just happened, said inside the sheet.
   *
   * A modal dialog makes the page behind it inert, so a notice out there would
   * be neither seen nor read: exporting from the sheet says so here instead.
   */
  readonly notice: Notice | null;
  readonly onDismissNotice: () => void;
}

/**
 * The whole screen, filled with nothing but things to choose from — plus the
 * three jobs that only happen once in a while: naming, deleting, and getting
 * the presets in and out again as a file. The link version lives at the foot of
 * the main screen, since what it hands over needs no editing. A household hand
 * gets a list a foot tall instead of a dropdown the width of a thumbnail.
 *
 * It is a native modal `<dialog>`: the browser makes the page behind it inert,
 * keeps focus inside, closes it on Escape and the back gesture, and puts focus
 * back on the thing that opened it. All of that is the browser's job, so none
 * of it is re-implemented here.
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
  notice,
  onDismissNotice,
}: ThingPickerProps) {
  const sheet = useRef<HTMLDialogElement | null>(null);

  // The sheet is mounted only while it is open, so opening it is the same thing
  // as being on the screen, and every way of closing it — our ✓ OK button,
  // Escape, the back gesture — arrives as one `close` event. That event is the
  // only thing that has to come back to the app: "done".
  useEffect(() => {
    const dialog = sheet.current;
    if (dialog === null) {
      return;
    }
    if (!dialog.open) {
      dialog.showModal();
    }
    const done = () => onConfirm();
    dialog.addEventListener('close', done);
    return () => dialog.removeEventListener('close', done);
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
    <dialog
      ref={sheet}
      aria-labelledby={SHEET_TITLE_ID}
      // A modal dialog is painted in the top layer and given `inset: 0` and
      // `margin: auto` by the browser; the sheet wants the whole screen, so
      // those are undone here and the display is set only while it is open.
      class="m-0 h-dvh max-h-none w-full max-w-none overflow-hidden border-0 bg-base-100 p-0 text-base-content open:flex open:flex-col"
      onClick={(event: MouseEvent) => {
        // Anything the household taps that is not the picture button or the
        // search under it means they are done with the picture.
        if (pickingEmoji && outsidePictures(pictureBlock.current, event.target)) {
          setPickingEmoji(false);
        }
      }}
    >
      {/* A plain box, not a <header>: a header inside a dialog is a second
          banner landmark, and a page has room for one. */}
      <div class="navbar shrink-0 gap-1.5 md:gap-2 bg-base-200 border-b border-base-300 px-2 md:px-6">
        <h2 id={SHEET_TITLE_ID} class={`min-w-0 flex-1 font-black tracking-tight ${TEXT.body}`}>
          Which thing?
        </h2>
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
          onClick={() => sheet.current?.close()}
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
                // The thing the household is on is where the sheet starts:
                // opening it is answering "which one?" with "this one".
                autofocus={item.id === currentId}
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

      {/* The foot of the sheet holds the name, the picture search and the file
          buttons, which is more than a phone has left once the keyboard is up
          for the search field. It keeps a share of the screen and scrolls
          inside itself: the page behind never moves, so without this the lower
          pictures sit below the bottom edge with nothing able to bring them
          into reach. */}
      <footer class="shrink-0 max-h-[70vh] overflow-y-auto overscroll-contain bg-base-200 border-t border-base-300 p-2 md:p-6">
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
                // The picture is settled the moment the household moves on: the
                // search folds away whether or not one was picked, so nothing
                // has to be confirmed. Focus arriving somewhere else is a tab
                // or a tap on a field; a click on something that cannot hold
                // focus — a row, the background — is the other half.
                //
                // Focus arriving nowhere is neither: that is a tap in flight,
                // and folding away here would take the icon out from under the
                // thumb. `focusMovedOn` says which is which.
                onFocusOut={(event: FocusEvent) => {
                  if (focusMovedOn(event, pictureBlock.current, sheet.current)) {
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

      {/* Inside the dialog, because the page behind it is inert: a notice about
          an export has to be readable while the sheet is still up. */}
      <NoticeBar notice={notice} onDismiss={onDismissNotice} />
    </dialog>
  );
}
