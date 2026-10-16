import type { PresetRepository } from '../data/presets';
import { newId } from '../domain/ids';
import { FRESHNESS_NEVER, type StockItem, type StockRequirements } from '../domain/stock-item';

export interface ItemStoreState {
  readonly items: readonly StockItem[];
  /** The preset currently open in the editor, or null when there is none. */
  readonly selected: StockItem | null;
}

export type ItemStoreListener = (state: ItemStoreState) => void;

export interface ItemStoreOptions {
  /** Presets used when this browser has nothing stored yet. */
  readonly starterItems: () => readonly StockItem[];
  /** Supplies ids for newly created presets. */
  readonly createId?: () => string;
}

const NAME_FOR_NEW_ITEM = 'New thing';
const DEFAULTS_FOR_NEW_ITEM: StockRequirements = {
  usageDays: 30,
  leadDays: 3,
  extraDays: 30,
  freshDays: FRESHNESS_NEVER,
};

/**
 * Holds every preset and the current selection. Every change is written
 * straight through to the repository, so the household never has to save
 * anything by hand.
 */
export class ItemStore {
  readonly #repository: PresetRepository;
  readonly #starterItems: () => readonly StockItem[];
  readonly #createId: () => string;
  readonly #listeners = new Set<ItemStoreListener>();

  #items: readonly StockItem[] = [];
  #selectedId: string | null = null;
  #state: ItemStoreState = { items: [], selected: null };

  constructor(repository: PresetRepository, options: ItemStoreOptions) {
    this.#repository = repository;
    this.#starterItems = options.starterItems;
    this.#createId = options.createId ?? newId;
  }

  /** The latest state. Identical from one call to the next until something
   *  actually changes, so views can compare by identity. */
  readonly getState = (): ItemStoreState => this.#state;

  readonly subscribe = (listener: ItemStoreListener): (() => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  /** Reads the presets for this browser, seeding a fresh start when needed. */
  load(): void {
    const stored = this.#repository.load();
    this.#items = stored ?? this.#starterItems();
    this.#openSomethingIfNothingIsOpen();
    this.#refresh();
    if (stored === null) {
      this.#persist();
    }
  }

  /** Opens another thing. Selecting the one already open changes nothing. */
  select(id: string): void {
    if (id === this.#selectedId || !this.#items.some((item) => item.id === id)) {
      return;
    }
    this.#selectedId = id;
    this.#refresh();
    this.#announce();
  }

  add(): StockItem {
    const item: StockItem = {
      id: this.#createId(),
      name: NAME_FOR_NEW_ITEM,
      ...DEFAULTS_FOR_NEW_ITEM,
    };
    this.#items = [...this.#items, item];
    this.#selectedId = item.id;
    this.#commit();
    return item;
  }

  remove(id: string): void {
    const remaining = this.#items.filter((item) => item.id !== id);
    if (remaining.length === this.#items.length) {
      return;
    }
    this.#items = remaining;
    if (this.#selectedId === id) {
      this.#selectedId = remaining[0]?.id ?? null;
    }
    this.#commit();
  }

  rename(id: string, name: string): void {
    this.#update(id, { name });
  }

  adjust(id: string, requirements: Partial<StockRequirements>): void {
    this.#update(id, requirements);
  }

  /**
   * Brings back any starter preset that is no longer in the list, matched by
   * name. Nothing the household has added is touched and nothing is thrown
   * away, so pressing it twice does nothing the second time.
   *
   * @returns how many things came back.
   */
  restoreDefaults(): number {
    const alreadyThere = new Set(this.#items.map((item) => item.name));
    const missing = this.#starterItems().filter((item) => !alreadyThere.has(item.name));
    if (missing.length === 0) {
      return 0;
    }
    this.#items = [...this.#items, ...missing];
    this.#openSomethingIfNothingIsOpen();
    this.#commit();
    return missing.length;
  }

  /** Replaces every preset, which is what importing a file does. */
  replaceAll(items: readonly StockItem[]): void {
    this.#items = items.map((item) => ({ ...item }));
    this.#selectedId = this.#items[0]?.id ?? null;
    this.#commit();
  }

  #update(id: string, patch: Partial<StockItem>): void {
    const existing = this.#items.find((item) => item.id === id);
    if (existing === undefined) {
      return;
    }
    const updated: StockItem = { ...existing, ...patch, id: existing.id };
    this.#items = this.#items.map((item) => (item.id === id ? updated : item));
    this.#commit();
  }

  #commit(): void {
    this.#persist();
    this.#refresh();
    this.#announce();
  }

  #persist(): void {
    this.#repository.save(this.#items);
  }

  /** There is always something open, as long as there is something to open. */
  #openSomethingIfNothingIsOpen(): void {
    if (this.#selectedId === null) {
      this.#selectedId = this.#items[0]?.id ?? null;
    }
  }

  #refresh(): void {
    this.#state = {
      items: this.#items,
      selected: this.#items.find((item) => item.id === this.#selectedId) ?? null,
    };
  }

  #announce(): void {
    for (const listener of this.#listeners) {
      listener(this.#state);
    }
  }
}
