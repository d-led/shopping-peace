import { splitEmoji } from '../data/emoji';
import type { PresetRepository } from '../data/presets';
import type { SelectionRepository } from '../data/selection';
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
 * anything by hand — and the thing that was open is remembered too, so a reload
 * is not a step backwards.
 */
export class ItemStore {
  readonly #presets: PresetRepository;
  readonly #selection: SelectionRepository;
  readonly #starterItems: () => readonly StockItem[];
  readonly #createId: () => string;
  readonly #listeners = new Set<ItemStoreListener>();

  #items: readonly StockItem[] = [];
  #selectedId: string | null = null;
  #state: ItemStoreState = { items: [], selected: null };

  constructor(
    presets: PresetRepository,
    selection: SelectionRepository,
    options: ItemStoreOptions,
  ) {
    this.#presets = presets;
    this.#selection = selection;
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
    const stored = this.#presets.load();
    this.#items = stored ?? this.#starterItems();
    this.#selectedId = this.#rememberedSelection();
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
    this.#commitSelection();
  }

  add(): StockItem {
    const item: StockItem = {
      id: this.#createId(),
      name: NAME_FOR_NEW_ITEM,
      emoji: '',
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

  /**
   * Sets the name. A character typed in front of it counts as the picture, so
   * the habit of putting one in the name still works — without ending up
   * stacked beside a picture that was already chosen.
   */
  rename(id: string, name: string): void {
    const typed = splitEmoji(name);
    this.#update(id, typed.emoji === '' ? { name } : typed);
  }

  /** Sets the character in front of the name. The name itself is untouched. */
  setEmoji(id: string, emoji: string): void {
    this.#update(id, { emoji });
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

  /** The selection is state as well: a reload should land on the same thing. */
  #commitSelection(): void {
    this.#selection.save(this.#selectedId);
    this.#refresh();
    this.#announce();
  }

  #persist(): void {
    this.#presets.save(this.#items);
    this.#selection.save(this.#selectedId);
  }

  /** What was open last time, as long as it is still on the shelf. */
  #rememberedSelection(): string | null {
    const remembered = this.#selection.load();
    return this.#items.some((item) => item.id === remembered) ? remembered : null;
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
