/** @jsxImportSource hono/jsx/dom */
import { TEXT } from './text';

/**
 * What a household sees before it has anything on the shelf: one button that
 * matters, and one for the household that deleted everything by accident.
 */
export function EmptyEditor({
  onAdd,
  onRestoreDefaults,
}: {
  readonly onAdd: () => void;
  readonly onRestoreDefaults: () => void;
}) {
  return (
    <section class="card min-w-0 bg-base-100 shadow-xl border border-base-300 rounded-none sm:rounded-box">
      <div class="card-body min-w-0 items-center text-center py-16 gap-4">
        <span class={TEXT.display} aria-hidden="true">
          🧺
        </span>
        <h2 class={`font-black ${TEXT.body}`}>No things yet</h2>
        <p class={`text-base-content/70 max-w-sm ${TEXT.small}`}>
          Add your first thing — dish tabs, detergent, toilet paper. The numbers follow within
          seconds.
        </p>
        <button
          type="button"
          class={`btn btn-accent btn-lg h-auto min-h-16 rounded-none font-bold ${TEXT.body}`}
          onClick={onAdd}
        >
          + New thing
        </button>
        <button
          type="button"
          class={`btn btn-sm rounded-none ${TEXT.small}`}
          onClick={onRestoreDefaults}
        >
          ↩️ Bring back the starter things
        </button>
      </div>
    </section>
  );
}
