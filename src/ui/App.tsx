/** @jsxImportSource hono/jsx/dom */
import { useEffect, useState } from 'hono/jsx/dom';
import type { ItemStore } from '../app/item-store';
import { BUILD_SHA } from '../build';
import {
  exportFilename,
  onePresetFilename,
  parsePresets,
  serializePresets,
} from '../data/presets-file';
import {
  decodeShelf,
  encodeShelf,
  linkWithShelf,
  shelfInHash,
  withoutHash,
} from '../data/share-link';
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
  linkCopiedNotice,
  linkNotSharedNotice,
  openedSharedShelfNotice,
  resetNotice,
  resetQuestion,
  sharedShelfQuestion,
} from './copy';
import { downloadJson } from './download';
import { offerLink, type ShareOutcome } from './share';
import { TEXT } from './text';
import { focusThingNameSoon } from './thing-name';
import { useStoreState } from './use-store-state';

/**
 * What a household hears about a link, by how offering it went. Two of the four
 * ways say nothing at all: the phone's own sheet is confirmation enough, and a
 * sheet closed again is a change of mind rather than something to report.
 */
const NOTICE_FOR_SHARE: Readonly<Record<ShareOutcome, Notice | null>> = {
  shared: null,
  copied: { tone: 'success', text: linkCopiedNotice() },
  declined: null,
  failed: { tone: 'error', text: linkNotSharedNotice() },
};

/** The thing that is open, by id: what an export, or a link, says was open. */
function openThingId(selected: StockItem | null): string | null {
  return selected === null ? null : selected.id;
}

/**
 * The file the household picked, if the dialog came back with one at all. The
 * input is emptied either way, so the very same file can be picked twice.
 */
function fileFrom(target: EventTarget | null): File | null {
  const input = target as HTMLInputElement;
  const file = input.files?.[0] ?? null;
  input.value = '';
  return file;
}

/**
 * Whether something that cannot be undone goes ahead: asked about when there is
 * something to lose, and not asked when there is nothing, because a question
 * about losing nothing is not worth putting.
 */
function mayGoAhead(losing: number, question: string): boolean {
  return losing === 0 || window.confirm(question);
}

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
    const now = new Date();
    // The thing that was open travels with the shelf, so it opens there again.
    downloadJson(exportFilename(now), serializePresets(items, now, openThingId(selected)));
    say(exportedNotice(items.length));
  };

  const exportCurrent = () => {
    if (selected === null) {
      return;
    }
    const now = new Date();
    downloadJson(
      onePresetFilename(selected.name, now),
      serializePresets([selected], now, selected.id),
    );
    say(exportedNotice(1));
  };

  const importPresets = async (event: Event) => {
    try {
      const file = fileFrom(event.target);
      if (file === null) {
        return;
      }
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

  const resetDefaults = () => {
    const count = store.getState().items.length;
    if (!mayGoAhead(count, resetQuestion(count))) {
      return;
    }
    say(resetNotice(store.resetToDefaults()));
  };

  /**
   * Offers the whole shelf as a link, which is the export file written small
   * enough to travel in an address. A phone gets its own share sheet, because
   * that is where messengers and mail live; anywhere else the link goes to the
   * clipboard, and that is said out loud — copying leaves nothing to look at.
   */
  const shareShelf = async () => {
    const link = linkWithShelf(window.location.href, encodeShelf(items, openThingId(selected)));
    const aboutTheLink = NOTICE_FOR_SHARE[await offerLink(link, 'Shopping Peace')];
    if (aboutTheLink !== null) {
      setNotice(aboutTheLink);
    }
  };

  /**
   * Takes on a shelf that arrived in the address, because somebody shared a
   * link. It replaces what is here, so it asks first — unless there is nothing
   * to lose, which is a question not worth asking.
   */
  const openSharedShelf = (payload: string) => {
    try {
      const shared = decodeShelf(payload);
      const here = store.getState().items.length;
      if (!mayGoAhead(here, sharedShelfQuestion(here, shared.things.length))) {
        return;
      }
      store.replaceAll(shared.things);
      if (shared.selected !== null) {
        store.select(shared.selected);
      }
      say(openedSharedShelfNotice(shared.things.length));
    } catch (error) {
      complain(importFailed(error));
    }
  };

  /**
   * A shelf in the address, read on the way in — and again whenever one arrives
   * later. Pasting a link into a tab that already has the app open changes the
   * fragment alone; the browser does not reload, the page is never built again,
   * and a read that only happened at startup would sit there and do nothing.
   */
  useEffect(() => {
    const readTheAddress = () => {
      const payload = shelfInHash(window.location.hash);
      if (payload === null) {
        return;
      }
      // Cleared as it is read, so a reload shows the shelf rather than asking
      // the same question a second time.
      window.history.replaceState(null, '', withoutHash(window.location.href));
      openSharedShelf(payload);
    };
    readTheAddress();
    window.addEventListener('hashchange', readTheAddress);
    return () => window.removeEventListener('hashchange', readTheAddress);
  }, []);

  return (
    <div class="min-h-screen">
      <header class="navbar bg-primary text-primary-content shadow-md sticky top-0 z-50 px-3 md:px-6">
        <h1 class={`font-black tracking-tight ${TEXT.body}`}>🛒 Shopping Peace</h1>
      </header>

      {/* No padding until there is room for it: on a phone the card is the
          screen, edges and all. */}
      <main class="max-w-2xl mx-auto pb-24 sm:p-3 sm:pb-24 md:p-6">
        {selected === null ? (
          <EmptyEditor onAdd={addThing} onResetToDefaults={resetDefaults} />
        ) : (
          <ItemEditor
            item={selected}
            onChange={(id: string, patch: Partial<StockRequirements>) =>
              store.adjust(id, patch)
            }
            onOpenThingPicker={() => setPickerOpen(true)}
            onShare={shareShelf}
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
          onResetToDefaults={resetDefaults}
          onConfirm={() => setPickerOpen(false)}
        />
      )}

      <NoticeBar notice={notice} onDismiss={() => setNotice(null)} />
    </div>
  );
}
