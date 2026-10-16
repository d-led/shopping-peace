import { describe, expect, it } from 'vitest';
import { ItemStore, type ItemStoreState } from '../src/app/item-store';
import { LocalStoragePresetRepository, PRESETS_STORAGE_KEY } from '../src/data/presets';
import { parsePresets, serializePresets } from '../src/data/presets-file';
import { FRESHNESS_NEVER, type StockItem } from '../src/domain/stock-item';
import { FakeStorage } from './support/fake-storage';
import { thing } from './support/items';

const detergent = thing({ id: 'detergent', name: '🧴 Laundry detergent' });

const tabs = thing({
  id: 'tabs',
  name: '🧽 Dishwasher tabs',
  usageDays: 45,
  leadDays: 4,
  extraDays: 20,
});

interface App {
  readonly store: ItemStore;
  /** What a reload would find in the browser. */
  stored(): StockItem[];
}

function openApp(stored?: readonly StockItem[]): App {
  const storage = new FakeStorage();
  if (stored !== undefined) {
    storage.setItem(PRESETS_STORAGE_KEY, serializePresets(stored));
  }
  const store = new ItemStore(new LocalStoragePresetRepository(storage), {
    starterItems: () => [detergent, tabs],
    createId: () => 'brand-new',
  });
  store.load();
  return {
    store,
    stored: () => {
      const raw = storage.getItem(PRESETS_STORAGE_KEY);
      return raw === null ? [] : parsePresets(raw);
    },
  };
}

describe('opening the app', () => {
  it('opens the first thing when this browser has nothing yet', () => {
    expect(openApp().store.getState().selected?.name).toBe('🧴 Laundry detergent');
  });

  it('writes the starter things down, so the next visit shows the same ones', () => {
    expect(openApp().stored().map((item) => item.id)).toEqual(['detergent', 'tabs']);
  });

  it('opens what was there before', () => {
    const { store } = openApp([tabs]);
    expect(store.getState().items).toEqual([tabs]);
    expect(store.getState().selected).toEqual(tabs);
  });
});

describe('things being added and edited', () => {
  it('adds a new thing at the end and opens it for typing', () => {
    const { store } = openApp([detergent]);
    const added = store.add();
    expect(store.getState().items).toHaveLength(2);
    expect(store.getState().selected).toEqual(added);
    expect(added.id).toBe('brand-new');
  });

  it('gives a brand new thing numbers that already work', () => {
    const { store } = openApp([detergent]);
    expect(store.add().freshDays).toBe(FRESHNESS_NEVER);
  });

  it('saves every change straight away, with no save button anywhere', () => {
    const { store, stored } = openApp([detergent]);
    store.add();
    store.rename('brand-new', '🧻 Toilet paper');
    expect(stored().find((item) => item.id === 'brand-new')?.name).toBe('🧻 Toilet paper');
  });

  it('renames only the thing that was touched', () => {
    const { store } = openApp([detergent, tabs]);
    store.rename('tabs', 'Fairy tabs');
    expect(store.getState().items.map((item) => item.name)).toEqual([
      '🧴 Laundry detergent',
      'Fairy tabs',
    ]);
  });

  it('changes one number at a time, and leaves the rest of the shelf alone', () => {
    const { store, stored } = openApp([detergent, tabs]);
    store.adjust('detergent', { extraDays: 45 });
    expect(store.getState().selected).toEqual({ ...detergent, extraDays: 45 });
    expect(stored()).toEqual([{ ...detergent, extraDays: 45 }, tabs]);
  });

  it('remembers a shelf life, so it survives a reload', () => {
    const { store, stored } = openApp([detergent]);
    store.adjust('detergent', { freshDays: 7 });
    expect(stored()[0]?.freshDays).toBe(7);
  });
});

describe('things being removed', () => {
  it('opens the next thing after the one in front of you is deleted', () => {
    const { store } = openApp([detergent, tabs]);
    store.remove('detergent');
    expect(store.getState().selected?.id).toBe('tabs');
  });

  it('leaves nothing selected once the last thing is gone', () => {
    const { store } = openApp([detergent]);
    store.remove('detergent');
    expect(store.getState().selected).toBeNull();
    expect(store.getState().items).toEqual([]);
  });

  it('remembers the empty shelf, so nothing reappears on the next visit', () => {
    const { store, stored } = openApp([detergent]);
    store.remove('detergent');
    expect(stored()).toEqual([]);
  });
});

describe('importing a file', () => {
  it('replaces everything with the contents of the file', () => {
    const { store, stored } = openApp([detergent]);
    store.replaceAll([tabs]);
    expect(store.getState().selected).toEqual(tabs);
    expect(stored()).toEqual([tabs]);
  });
});

describe('bringing the starter things back', () => {
  it('brings back only the ones that are gone', () => {
    const { store } = openApp([detergent]);

    expect(store.restoreDefaults()).toBe(1);

    expect(store.getState().items.map((item) => item.name)).toEqual([
      detergent.name,
      tabs.name,
    ]);
  });

  it('leaves the things the household thought up alone', () => {
    const mine = thing({ id: 'mine', name: '🧼 Dish soap', usageDays: 20, extraDays: 40 });
    const { store, stored } = openApp([mine]);

    store.restoreDefaults();

    expect(store.getState().items.map((item) => item.id)).toEqual(['mine', 'detergent', 'tabs']);
    expect(stored().map((item) => item.id)).toEqual(['mine', 'detergent', 'tabs']);
  });

  it('recognises a starter by its name, however it got there', () => {
    const { store } = openApp([thing({ ...detergent, id: 'copied-by-hand' })]);

    expect(store.restoreDefaults()).toBe(1);
  });

  it('reports and does nothing when they are all there', () => {
    const { store } = openApp([detergent, tabs]);
    let calls = 0;
    store.subscribe(() => {
      calls += 1;
    });

    expect(store.restoreDefaults()).toBe(0);
    expect(calls).toBe(0);
  });

  it('opens the first thing when the shelf had gone empty', () => {
    const { store } = openApp([]);

    store.restoreDefaults();

    expect(store.getState().selected?.id).toBe('detergent');
  });
});

describe('watching for changes', () => {
  it('tells every listener what the new state is', () => {
    const { store } = openApp([detergent]);
    const seen: ItemStoreState[] = [];
    store.subscribe((state) => seen.push(state));

    store.adjust('detergent', { extraDays: 45 });

    expect(seen).toHaveLength(1);
    expect(seen[0]?.selected?.extraDays).toBe(45);
  });

  it('hands out the same state object until something actually changes', () => {
    const { store } = openApp([detergent]);
    expect(store.getState()).toBe(store.getState());

    const before = store.getState();
    store.adjust('detergent', { extraDays: 45 });
    expect(store.getState()).not.toBe(before);
  });

  it('stops telling a listener that has unsubscribed', () => {
    const { store } = openApp([detergent]);
    let calls = 0;
    const unsubscribe = store.subscribe(() => {
      calls += 1;
    });

    unsubscribe();
    store.adjust('detergent', { extraDays: 45 });

    expect(calls).toBe(0);
  });

  it('stays quiet when nothing actually changed', () => {
    const { store } = openApp([detergent]);
    let calls = 0;
    store.subscribe(() => {
      calls += 1;
    });

    store.remove('no-such-thing');
    store.select('no-such-thing');
    store.adjust('no-such-thing', { extraDays: 45 });

    expect(calls).toBe(0);
  });

  it('stays quiet when asked for the thing that is already open', () => {
    const { store } = openApp([detergent, tabs]);
    let calls = 0;
    store.subscribe(() => {
      calls += 1;
    });

    store.select('detergent');

    expect(calls).toBe(0);
    expect(store.getState().selected?.id).toBe('detergent');
  });
});
