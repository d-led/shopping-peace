/** @jsxImportSource hono/jsx/dom */
import { useState } from 'hono/jsx/dom';
import type { ItemStore } from '../app/item-store';
import { BUILD_SHA } from '../build';
import {
  exportFilename,
  onePresetFilename,
  parsePresets,
  serializePresets,
} from '../data/presets-file';
import type { StockItem, StockRequirements } from '../domain/stock-item';
import { EmptyEditor } from './EmptyEditor';
import { ItemEditor } from './ItemEditor';
import { NoticeBar, type Notice } from './NoticeBar';
import { SourceStamp } from './SourceStamp';
import { ThingPicker } from './ThingPicker';
import {
  deleteQuestion,
  exportedNotice,
  importFailed,
  importQuestion,
  importedNotice,
  restoredNotice,
} from './copy';
import { downloadJson } from './download';
import { TEXT } from './text';
import { focusThingNameSoon } from './thing-name';
import { useStoreState } from './use-store-state';

/**
 * The screen: one thing at a time, the two numbers that matter, and the sheet
 * with everything else in it. Every change is saved as it is made, so nothing
 * here has a save button to forget to press.
 */
export function App({ store }: { readonly store: ItemStore }) {
  const { items, selected } = useStoreState(store);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const say = (text: string) => setNotice({ tone: 'success', text });
  const complain = (text: string) => setNotice({ tone: 'error', text });

  const exportAll = () => {
    downloadJson(exportFilename(new Date()), serializePresets(items));
    say(exportedNotice(items.length));
  };

  const exportCurrent = () => {
    if (selected === null) {
      return;
    }
    downloadJson(onePresetFilename(selected.name, new Date()), serializePresets([selected]));
    say(exportedNotice(1));
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
      // Reading a file is harmless; replacing the shelf is not, so it asks.
      if (!window.confirm(importQuestion(items.length, imported.length))) {
        return;
      }
      store.replaceAll(imported);
      say(importedNotice(imported.length));
    } catch (error) {
      complain(importFailed(error));
    }
  };

  const addThing = () => {
    store.add();
    setPickerOpen(true);
    focusThingNameSoon();
  };

  const deleteThing = (item: StockItem) => {
    if (window.confirm(deleteQuestion(item))) {
      store.remove(item.id);
    }
  };

  const restoreDefaults = () => {
    say(restoredNotice(store.restoreDefaults()));
  };

  return (
    <div class="min-h-screen">
      <header class="navbar bg-primary text-primary-content shadow-md sticky top-0 z-50 px-3 md:px-6">
        <h1 class={`font-black tracking-tight ${TEXT.body}`}>🛒 Shopping Peace</h1>
      </header>

      {/* No padding until there is room for it: on a phone the card is the
          screen, edges and all. */}
      <main class="max-w-2xl mx-auto pb-24 sm:p-3 sm:pb-24 md:p-6">
        {selected === null ? (
          <EmptyEditor onAdd={addThing} onRestoreDefaults={restoreDefaults} />
        ) : (
          <ItemEditor
            item={selected}
            onChange={(id: string, patch: Partial<StockRequirements>) =>
              store.adjust(id, patch)
            }
            onOpenThingPicker={() => setPickerOpen(true)}
          />
        )}

        <div class="mt-6 md:mt-8">
          <SourceStamp sha={BUILD_SHA} />
        </div>
      </main>

      {pickerOpen && selected !== null && (
        <ThingPicker
          items={items}
          currentId={selected.id}
          // Switching stays in the sheet: the household often wants to rename
          // the thing they just picked, and the ✕ is right there when they are done.
          onSelect={(id: string) => store.select(id)}
          onRename={(id: string, name: string) => store.rename(id, name)}
          onEmoji={(emoji: string) => store.setEmoji(selected.id, emoji)}
          onAdd={addThing}
          onDelete={deleteThing}
          onExportAll={exportAll}
          onExportCurrent={exportCurrent}
          onImport={importPresets}
          onRestoreDefaults={restoreDefaults}
          onConfirm={() => setPickerOpen(false)}
        />
      )}

      <NoticeBar notice={notice} onDismiss={() => setNotice(null)} />
    </div>
  );
}
