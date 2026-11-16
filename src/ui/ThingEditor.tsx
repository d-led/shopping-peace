/** @jsxImportSource hono/jsx/dom */
import { useRef, useState } from 'hono/jsx/dom';
import type { StockItem } from '../domain/stock-item';
import { EmojiPicker } from './EmojiPicker';
import { SheetActions } from './SheetActions';
import { pictureButtonLabel, pictureOf } from './copy';
import { TEXT } from './text';
import { THING_NAME_FIELD_ID, focusThingNameSoon } from './thing-name';

export interface ThingEditorProps {
  readonly current: StockItem;
  readonly onRename: (id: string, name: string) => void;
  readonly onEmoji: (emoji: string) => void;
  readonly onExportAll: () => void;
  readonly onExportCurrent: () => void;
  readonly onImport: (event: Event) => void;
  readonly onResetToDefaults: () => void;
  readonly onDelete: (item: StockItem) => void;
}

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
function focusMovedOn(event: FocusEvent, pictures: HTMLDivElement | null): boolean {
  const next = event.relatedTarget as Node | null;
  if (next === null || next === pictures?.closest('dialog')) {
    return false;
  }
  return outsidePictures(pictures, next);
}

/**
 * The editing half of the sheet: what the thing on screen is called, the
 * picture in front of its name, and the jobs that happen once in a while —
 * files in and out, resetting the shelf, deleting this thing.
 *
 * It takes the whole sheet while it is up. Choosing and editing are two
 * different jobs, and a short screen cannot show half of each at once: the list
 * gets the sheet while choosing, and this gets it while editing.
 */
export function ThingEditor({
  current,
  onRename,
  onEmoji,
  onExportAll,
  onExportCurrent,
  onImport,
  onResetToDefaults,
  onDelete,
}: ThingEditorProps) {
  const [pickingEmoji, setPickingEmoji] = useState(false);
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
      class="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-2 md:p-6"
      onClick={(event: MouseEvent) => {
        // Anything the household taps that is not the picture button or the
        // search under it means they are done with the picture.
        if (pickingEmoji && outsidePictures(pictureBlock.current, event.target)) {
          setPickingEmoji(false);
        }
      }}
    >
      <div class="max-w-3xl mx-auto flex flex-col gap-2 md:gap-3">
        <div>
          <label
            class={`block font-black uppercase tracking-wider text-base-content/70 mb-1 ${TEXT.small}`}
            for={THING_NAME_FIELD_ID}
          >
            What is it called?
          </label>
          {/* The picture sits beside the name it is in front of, which is how
              the main screen shows it too — and it costs the name's own row
              rather than a row of its own. The block is `display: contents` so
              its two children (the button and the search) can be laid out in
              the row: the button beside the name, the search across the next
              line. Everything inside it counts as "the picture", so pressing
              the button is not a press somewhere else. */}
          <div class="flex flex-wrap items-stretch gap-2">
            <input
              id={THING_NAME_FIELD_ID}
              type="text"
              class={`input input-lg min-w-0 flex-1 h-auto py-3 rounded-none font-bold ${TEXT.body}`}
              placeholder="e.g. Laundry detergent"
              value={current.name}
              onInput={(event) =>
                onRename(current.id, (event.target as HTMLInputElement).value)
              }
            />
            <div
              ref={pictureBlock}
              class="contents"
              // The picture is settled the moment the household moves on: the
              // search folds away whether or not one was picked, so nothing has
              // to be confirmed. `focusMovedOn` says which blur is a move.
              onFocusOut={(event: FocusEvent) => {
                if (focusMovedOn(event, pictureBlock.current)) {
                  setPickingEmoji(false);
                }
              }}
            >
              <button
                type="button"
                class={`btn btn-lg shrink-0 gap-1 px-2 rounded-none ${TEXT.small}`}
                aria-label={`${pictureButtonLabel(current)} — change it`}
                aria-expanded={String(pickingEmoji)}
                title="Find a picture by what it is"
                onClick={() => setPickingEmoji(!pickingEmoji)}
              >
                <span class={TEXT.icon} aria-hidden="true">
                  {pictureOf(current)}
                </span>
                Picture
              </button>
              <div class="basis-full">
                {pickingEmoji && <EmojiPicker onPick={chooseEmoji} />}
              </div>
            </div>
          </div>
        </div>

        <SheetActions
          current={current}
          onExportAll={onExportAll}
          onExportCurrent={onExportCurrent}
          onImport={onImport}
          onResetToDefaults={onResetToDefaults}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}
