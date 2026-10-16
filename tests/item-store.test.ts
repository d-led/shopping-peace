import { describe, expect, it } from 'vitest';
import { ItemStore, type ItemStoreState } from '../src/app/item-store';
import { LocalStoragePresetRepository, PRESETS_STORAGE_KEY } from '../src/data/presets';
import { parsePresets, serializePresets } from '../src/data/presets-file';
import { LocalStorageSelectionRepository } from '../src/data/selection';
import { FRESHNESS_NEVER, type StockItem } from '../src/domain/stock-item';
import { FakeStorage } from './support/fake-storage';
import { thing } from './support/items';

const detergent = thing({ id: 'detergent', name: 'Laundry detergent', emoji: '🧴' });

const tabs = thing({
  id: 'tabs',
  name: 'Dishwasher tabs',
  emoji: '🧽',
  usageDays: 45,
  leadDays: 4,
  extraDays: 20,
});

interface App {
  readonly store: ItemStore;
  /** What a reload would find in the browser. */
  stored(): StockItem[];
  /** The same browser, opened again: what a reload shows. */
  reopened(): ItemStore;
}

function openApp(stored?: readonly StockItem[]): App {
  const storage = new FakeStorage();
  if (stored !== undefined) {
    storage.setItem(PRESETS_STORAGE_KEY, serializePresets(stored));
  }
  const open = () => {
    const store = new ItemStore(
      new LocalStoragePresetRepository(storage),
      new LocalStorageSelectionRepository(storage),
      { starterItems: () => [detergent, tabs], createId: () => 'brand-new' },
    );
    store.load();
    return store;
  };
  return {
    store: open(),
    stored: () => {
      const raw = storage.getItem(PRESETS_STORAGE_KEY);
      return raw === null ? [] : parsePresets(raw);
    },
    reopened: open,
  };
}

describe('opening the app', () => {
  it('opens the first thing when this browser has nothing yet', () => {
    expect(openApp().store.getState().selected?.name).toBe('Laundry detergent');
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

describe('landing where the household left off', () => {
  it('opens the thing that was open last time', () => {
    const app = openApp([detergent, tabs]);

    app.store.select('tabs');

    expect(app.reopened().getState().selected?.id).toBe('tabs');
  });

  it('opens the first thing when the remembered one is gone', () => {
    const app = openApp([detergent, tabs]);
    app.store.select('tabs');

    app.store.remove('tabs');

    expect(app.reopened().getState().selected?.id).toBe('detergent');
  });

  it('remembers a thing that was only just added', () => {
    const app = openApp([detergent]);

    app.store.add();

    expect(app.reopened().getState().selected?.id).toBe('brand-new');
  });

  it('has nothing to remember once the shelf is empty', () => {
    const app = openApp([detergent]);

    app.store.remove('detergent');

    expect(app.reopened().getState().selected).toBeNull();
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
    const added = store.add();

    expect(added.freshDays).toBe(FRESHNESS_NEVER);
    // Sold one at a time until the household says otherwise.
    expect(added.packSize).toBe(1);
  });

  it('saves every change straight away, with no save button anywhere', () => {
    const { store, stored } = openApp([detergent]);
    store.add();
    store.rename('brand-new', 'Toilet paper');
    expect(stored().find((item) => item.id === 'brand-new')?.name).toBe('Toilet paper');
  });

  it('renames only the thing that was touched', () => {
    const { store } = openApp([detergent, tabs]);
    store.rename('tabs', 'Fairy tabs');
    expect(store.getState().items.map((item) => item.name)).toEqual([
      'Laundry detergent',
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

describe('the picture beside the name', () => {
  it('starts a new thing with no picture at all', () => {
    const { store } = openApp([detergent]);

    expect(store.add().emoji).toBe('');
  });

  it('sets the picture without touching the name', () => {
    const { store, stored } = openApp([detergent]);

    store.setEmoji('detergent', '🧼');

    expect(store.getState().selected).toEqual({ ...detergent, emoji: '🧼' });
    expect(stored()[0]?.name).toBe('Laundry detergent');
  });

  it('takes a picture typed in front of a name as the picture itself', () => {
    const { store, stored } = openApp([detergent]);

    store.rename('detergent', '🧼 Dish soap');

    expect(store.getState().selected).toEqual({ ...detergent, name: 'Dish soap', emoji: '🧼' });
    expect(stored()[0]?.emoji).toBe('🧼');
  });

  it('leaves a picture alone when a name with no picture in it is typed', () => {
    const { store, stored } = openApp([detergent]);

    store.rename('detergent', 'Dish soap');

    expect(stored()[0]).toEqual({ ...detergent, name: 'Dish soap' });
  });
});

describe('things being removed', () => {
  it('opens the next thing after the one in front of you is deleted', () => {
    const { store } = openApp([detergent, tabs]);
    store.remove('detergent');
    expect(store.getState().selected?.id).toBe('tabs');
  });

  it('leaves the open thing open when a different one is deleted', () => {
    const { store } = openApp([detergent, tabs]);
    store.select('tabs');

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

  it('leaves nothing open when the file had nothing in it', () => {
    const { store, stored } = openApp([detergent]);

    store.replaceAll([]);

    expect(store.getState().selected).toBeNull();
    expect(store.getState().items).toEqual([]);
    expect(stored()).toEqual([]);
  });
});

describe('starting again from the starter things', () => {
  it('replaces the whole shelf with them', () => {
    const mine = thing({ id: 'mine', name: 'Dish soap', emoji: '🧼', usageDays: 20, extraDays: 40 });
    const { store, stored } = openApp([mine, detergent]);

    store.resetToDefaults();

    expect(store.getState().items.map((item) => item.id)).toEqual(['detergent', 'tabs']);
    expect(stored().map((item) => item.id)).toEqual(['detergent', 'tabs']);
  });

  it('throws away the household\'s own things, and says how many went', () => {
    const mine = thing({ id: 'mine', name: 'Dish soap', emoji: '🧼', usageDays: 20, extraDays: 40 });
    const { store } = openApp([mine, detergent]);

    expect(store.resetToDefaults()).toBe(1);
  });

  it('has nothing of its own to report when the starters were all there', () => {
    const { store } = openApp([tabs, detergent]);

    expect(store.resetToDefaults()).toBe(0);
  });

  it('counts a starter the household renamed as something to lose', () => {
    const { store } = openApp([{ ...detergent, name: 'Laundry liquid', usageDays: 90 }]);

    // The name and the tuning go with the reset, even though the starter comes
    // back: a renamed thing is the household's, not the app's.
    expect(store.resetToDefaults()).toBe(1);
    expect(store.getState().items.map((item) => item.name)).toEqual([
      'Laundry detergent',
      'Dishwasher tabs',
    ]);
  });

  it('forgets which thing was open, and opens the first starter instead', () => {
    const app = openApp([detergent, tabs]);
    app.store.select('tabs');

    app.store.resetToDefaults();

    expect(app.store.getState().selected?.id).toBe('detergent');
    expect(app.reopened().getState().selected?.id).toBe('detergent');
  });

  it('is how an empty shelf gets the starters back', () => {
    const { store, stored } = openApp([]);

    store.resetToDefaults();

    expect(store.getState().selected?.id).toBe('detergent');
    expect(stored()).toEqual([detergent, tabs]);
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

  it('tells them which thing is in front of the household now', () => {
    const { store } = openApp([detergent, tabs]);
    const seen: string[] = [];
    store.subscribe((state) => seen.push(state.selected?.id ?? ''));

    store.select('tabs');

    expect(store.getState().selected?.id).toBe('tabs');
    expect(seen).toEqual(['tabs']);
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
