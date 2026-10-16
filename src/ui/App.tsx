/** @jsxImportSource hono/jsx/dom */
import { useState } from 'hono/jsx/dom';
import type { ItemStore } from '../app/item-store';
import {
  InvalidPresetFileError,
  exportFilename,
  parsePresets,
  serializePresets,
} from '../data/presets-file';
import type { StockItem, StockRequirements } from '../domain/stock-item';
import { ItemEditor } from './ItemEditor';
import { THING_NAME_FIELD_ID, ThingPicker } from './ThingPicker';
import { downloadJson } from './download';
import { countThings } from './plan-copy';
import { TEXT } from './text';
import { useStoreState } from './use-store-state';

interface Notice {
  readonly tone: 'success' | 'error';
  readonly text: string;
}

export function App({ store }: { readonly store: ItemStore }) {
  const { items, selected } = useStoreState(store);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const exportPresets = () => {
    downloadJson(exportFilename(new Date()), serializePresets(items));
    setNotice({ tone: 'success', text: `Exported ${countThings(items.length)}.` });
  };

  const importPresets = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = ''; // so the very same file can be picked twice in a row
    if (file === null) {
      return;
    }
    try {
      const imported = parsePresets(await file.text());
      store.replaceAll(imported);
      setNotice({ tone: 'success', text: `Imported ${countThings(imported.length)}.` });
    } catch (error) {
      setNotice({
        tone: 'error',
        text:
          error instanceof InvalidPresetFileError
            ? error.message
            : 'That file could not be read.',
      });
    }
  };

  const addThing = () => {
    store.add();
    setPickerOpen(true);
    focusThingNameSoon();
  };

  const deleteThing = (item: StockItem) => {
    const label = item.name.trim() === '' ? 'this thing' : item.name;
    if (window.confirm(`Delete ${label}?`)) {
      store.remove(item.id);
    }
  };

  return (
    <div class="min-h-screen">
      <header class="navbar bg-primary text-primary-content shadow-md sticky top-0 z-50 px-3 md:px-6">
        <h1 class={`font-black tracking-tight ${TEXT.body}`}>🛒 Shopping Peace</h1>
      </header>

      <main class="max-w-2xl mx-auto p-3 md:p-6 pb-24">
        {selected === null ? (
          <EmptyEditor onAdd={addThing} />
        ) : (
          <ItemEditor
            item={selected}
            onChange={(id: string, patch: Partial<StockRequirements>) =>
              store.adjust(id, patch)
            }
            onOpenThingPicker={() => setPickerOpen(true)}
          />
        )}
      </main>

      {pickerOpen && selected !== null && (
        <ThingPicker
          items={items}
          currentId={selected.id}
          // Switching stays in the sheet: the household often wants to rename
          // the thing they just picked, and the ✕ is right there when they are done.
          onSelect={(id: string) => store.select(id)}
          onRename={(id: string, name: string) => store.rename(id, name)}
          onAdd={addThing}
          onDelete={deleteThing}
          onExport={exportPresets}
          onImport={importPresets}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {notice !== null && (
        <div class="fixed inset-x-0 bottom-4 z-[200] flex justify-center px-3" role="status">
          <div
            class={`alert max-w-lg rounded-none shadow-lg ${
              notice.tone === 'error' ? 'alert-error' : 'alert-success'
            }`}
          >
            <span class={`flex-1 font-semibold ${TEXT.small}`}>{notice.text}</span>
            <button
              type="button"
              class="btn btn-sm rounded-none"
              aria-label="Dismiss"
              onClick={() => setNotice(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyEditor({ onAdd }: { readonly onAdd: () => void }) {
  return (
    <section class="card min-w-0 bg-base-100 shadow-xl border border-base-300">
      <div class="card-body min-w-0 items-center text-center py-16 gap-4">
        <span class={TEXT.display} aria-hidden="true">
          🧺
        </span>
        <h2 class={`font-black ${TEXT.body}`}>No things yet</h2>
        <p class={`text-base-content/60 max-w-sm ${TEXT.small}`}>
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
      </div>
    </section>
  );
}

/** The name field lives in the picker, so wait one frame for it to be on screen. */
function focusThingNameSoon(): void {
  requestAnimationFrame(() => {
    const field = document.getElementById(THING_NAME_FIELD_ID);
    if (field instanceof HTMLInputElement) {
      field.focus();
      field.select();
    }
  });
}
