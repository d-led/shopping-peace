import type { StockItem } from '../domain/stock-item';
import { Icon } from './Icon';
import { TEXT } from './text';

export interface SheetActionsProps {
  /** The thing on screen, when there is one: two of these act on it. */
  readonly current: StockItem | undefined;
  /** Every thing, as one file. */
  readonly onExportAll: () => void;
  /** Writes just the thing on screen to one file, named after it. */
  readonly onExportCurrent: () => void;
  /** Reads a file the household picked. */
  readonly onImport: (event: Event) => void;
  /** Throws the shelf away and starts again from the starter things. */
  readonly onResetToDefaults: () => void;
  /** Throws the thing on screen away, once the household has said so. */
  readonly onDelete: (item: StockItem) => void;
}

/**
 * The jobs at the foot of the sheet that happen once in a while rather than
 * every time: the shelf travelling in and out again as a file, and the two
 * buttons that throw things away.
 *
 * Whether there is a thing on screen to act on is this component's business,
 * not the sheet's: the sheet lays out the list and the thing being named, and
 * hands these buttons whatever it has.
 */
export function SheetActions({
  current,
  onExportAll,
  onExportCurrent,
  onImport,
  onResetToDefaults,
  onDelete,
}: SheetActionsProps) {
  return (
    <div class="flex flex-col gap-2 md:gap-3">
      <div class="grid grid-cols-2 gap-2">
        <button
          type="button"
          class={`btn btn-lg gap-1 px-2 rounded-none md:gap-2 md:px-4 ${TEXT.body}`}
          aria-label="Export all"
          title="Every thing, as one file"
          onClick={onExportAll}
        >
          <Icon symbol="📤" />
          Export all
        </button>
        {current !== undefined && (
          <button
            type="button"
            class={`btn btn-lg gap-1 px-2 rounded-none md:gap-2 md:px-4 ${TEXT.body}`}
            aria-label="Export this one"
            title="Just the thing on screen"
            onClick={onExportCurrent}
          >
            <Icon symbol="📤" />
            Export this one
          </button>
        )}
        <label
          class={`btn btn-lg gap-1 px-2 rounded-none md:gap-2 md:px-4 ${TEXT.body}`}
        >
          <Icon symbol="📥" />
          Import
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
            onClick={onResetToDefaults}
            title="Throw everything away and start from the starter things"
          >
            ↩️ Reset to defaults
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
  );
}
