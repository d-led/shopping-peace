import { newId } from '../domain/ids';
import { FRESHNESS_NEVER, type StockItem } from '../domain/stock-item';
import { parsePresets, serializePresets } from './presets-file';

/** Where the presets live in this browser. */
export const PRESETS_STORAGE_KEY = 'shopping_peace_presets';

/** The slice of the Web Storage API this app needs. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface PresetRepository {
  /** The stored presets, or null when this browser has nothing saved yet. */
  load(): StockItem[] | null;
  save(items: readonly StockItem[]): void;
}

export class LocalStoragePresetRepository implements PresetRepository {
  constructor(
    private readonly storage: KeyValueStorage,
    private readonly key: string = PRESETS_STORAGE_KEY,
  ) {}

  load(): StockItem[] | null {
    const stored = this.storage.getItem(this.key);
    if (stored === null) {
      return null;
    }
    try {
      return parsePresets(stored);
    } catch {
      // Hand-edited or damaged data should not lock the household out of the
      // app: treat it as a fresh start instead of refusing to open.
      return null;
    }
  }

  save(items: readonly StockItem[]): void {
    this.storage.setItem(this.key, serializePresets(items));
  }
}

/**
 * The presets a household finds on its first visit, and the pack sizes a
 * European shop actually sells: a box of dishwasher tablets is thirty, a
 * toilet-paper pack is ten, a box of washing powder is forty washes. The unit
 * is whatever the household counts — a tab, a roll, a wash — so what a unit
 * lasts is what matters, not what the bottle holds.
 */
export function starterPresets(createId: () => string = newId): StockItem[] {
  const never = FRESHNESS_NEVER;
  const one = 1;
  return [
    // A tablet a day, a box of thirty, a week of reserve: the shop run is a
    // delivery rather than a trip.
    { id: createId(), name: 'Dishwasher tabs', emoji: '🧽', usageDays: 1, leadDays: 3, extraDays: 7, freshDays: never, packSize: 30 },
    // Forty washes to a box, bought one box at a time.
    { id: createId(), name: 'Dishwasher detergent', emoji: '🫧', usageDays: 40, leadDays: 3, extraDays: 14, freshDays: never, packSize: one },
    // A thirty-wash bottle, a wash most days of the week.
    { id: createId(), name: 'Laundry detergent', emoji: '🧴', usageDays: 30, leadDays: 3, extraDays: 30, freshDays: never, packSize: one },
    // The household's own: a roll every two days, four days to fetch, a
    // fortnight of reserve, and jumbo packs of ten the only size sold.
    { id: createId(), name: 'Toilet paper (jumbo)', emoji: '🧻', usageDays: 2, leadDays: 4, extraDays: 7, freshDays: never, packSize: 10 },
    { id: createId(), name: 'Cat litter', emoji: '🐾', usageDays: 21, leadDays: 5, extraDays: 21, freshDays: never, packSize: one },
    // The perishable one, so the freshness slider can be seen doing something:
    // eaten over a fortnight, but sour a week after opening.
    { id: createId(), name: 'Butter', emoji: '🧈', usageDays: 14, leadDays: 2, extraDays: 7, freshDays: 7, packSize: one },
  ];
}
