/** @jsxImportSource hono/jsx/dom */
import { useEffect, useRef } from 'hono/jsx/dom';
import type { StockItem } from '../domain/stock-item';
import { NoticeBar, type Notice } from './NoticeBar';
import { ThingEditor } from './ThingEditor';
import { ThingList } from './ThingList';
import { TEXT } from './text';

/**
 * The sheet's two jobs, one at a time.
 *
 * Choosing is a list and wants every pixel it can get; editing is a form about
 * one thing. Showing both at once spent the sheet on the form and left a couple
 * of rows of the list, which is what a short screen cannot afford.
 */
export type SheetMode = 'choosing' | 'editing';

/** The heading the sheet is named by, for the dialog's accessible name. */
const SHEET_TITLE_ID = 'which-thing-title';

interface SheetHeaderProps {
  readonly choosing: boolean;
  readonly onMode: (mode: SheetMode) => void;
  readonly onAdd: () => void;
  readonly onClose: () => void;
}

/**
 * The bar across the top of the sheet: which job this is, and the ways out of
 * it. Every button is a thumb-sized square, so the bar costs one tap target and
 * no more of a short screen than it has to.
 *
 * A plain box, not a `<header>`: a header inside a dialog is a second banner
 * landmark, and a page has room for one.
 */
function SheetHeader({ choosing, onMode, onAdd, onClose }: SheetHeaderProps) {
  return (
    <div class="navbar shrink-0 gap-1.5 md:gap-2 bg-base-200 border-b border-base-300 px-2 md:px-6">
      {!choosing && (
        <button
          type="button"
          class={`btn btn-square btn-lg shrink-0 rounded-none ${TEXT.body}`}
          aria-label="Back to the things"
          title="Back to the things"
          onClick={() => onMode('choosing')}
        >
          ←
        </button>
      )}
      <h2 id={SHEET_TITLE_ID} class={`min-w-0 flex-1 font-black tracking-tight ${TEXT.body}`}>
        {choosing ? 'Which thing?' : 'This thing'}
      </h2>
      {choosing && (
        <button
          type="button"
          class={`btn btn-square btn-lg shrink-0 rounded-none ${TEXT.body}`}
          aria-label="Edit this one"
          title="Rename it, give it a picture, or get the shelf in and out"
          onClick={() => onMode('editing')}
        >
          ✏️
        </button>
      )}
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
        onClick={onClose}
      >
        ✓ OK
      </button>
    </div>
  );
}

export interface ThingPickerProps {
  readonly items: readonly StockItem[];
  readonly currentId: string;
  readonly mode: SheetMode;
  readonly onMode: (mode: SheetMode) => void;
  readonly onSelect: (id: string) => void;
  readonly onRename: (id: string, name: string) => void;
  /** Sets the character in front of the name; the name itself is untouched. */
  readonly onEmoji: (emoji: string) => void;
  readonly onAdd: () => void;
  /** Removes the thing, and says whether it really went. */
  readonly onDelete: (item: StockItem) => boolean;
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
 * The whole screen, in one of its two jobs: choosing a thing from the shelf, or
 * editing the one that is open.
 *
 * It is a native modal `<dialog>`: the browser makes the page behind it inert,
 * keeps focus inside, closes it on Escape and the back gesture, and puts focus
 * back on the thing that opened it. All of that is the browser's job, so none
 * of it is re-implemented here.
 */
export function ThingPicker({
  items,
  currentId,
  mode,
  onMode,
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
  const choosing = mode === 'choosing';

  return (
    <dialog
      ref={sheet}
      aria-labelledby={SHEET_TITLE_ID}
      // A modal dialog is painted in the top layer and given `inset: 0` and
      // `margin: auto` by the browser; the sheet wants the whole screen, so
      // those are undone here and the display is set only while it is open.
      class="m-0 h-dvh max-h-none w-full max-w-none overflow-hidden border-0 bg-base-100 p-0 text-base-content open:flex open:flex-col"
    >
      {/* A plain box, not a <header>: a header inside a dialog is a second
          banner landmark, and a page has room for one. */}
      <SheetHeader
        choosing={choosing}
        onMode={onMode}
        onAdd={onAdd}
        onClose={() => sheet.current?.close()}
      />

      {choosing ? (
        <ThingList
          items={items}
          currentId={currentId}
          onSelect={onSelect}
          onConfirm={onConfirm}
        />
      ) : (
        current && (
          <ThingEditor
            current={current}
            onRename={onRename}
            onEmoji={onEmoji}
            onExportAll={onExportAll}
            onExportCurrent={onExportCurrent}
            onImport={onImport}
            onResetToDefaults={onResetToDefaults}
            onDelete={(item: StockItem) => {
              // The thing this view is about is gone, so the list is where the
              // household has to be: there is nothing left here to edit.
              if (onDelete(item)) {
                onMode('choosing');
              }
            }}
          />
        )
      )}

      {/* Inside the dialog, because the page behind it is inert: a notice about
          an export has to be readable while the sheet is still up. */}
      <NoticeBar notice={notice} onDismiss={onDismissNotice} />
    </dialog>
  );
}
