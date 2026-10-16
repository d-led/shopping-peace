import { newId } from '../domain/ids';
import type { StockItem } from '../domain/stock-item';
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

/** The presets a household finds on its first visit. */
export function starterPresets(createId: () => string = newId): StockItem[] {
  return [
    { id: createId(), name: '🧽 Dishwasher tabs', usageDays: 45, leadDays: 4, extraDays: 20 },
    { id: createId(), name: '🧴 Laundry detergent', usageDays: 30, leadDays: 3, extraDays: 60 },
    { id: createId(), name: '🧻 Toilet paper (jumbo)', usageDays: 14, leadDays: 2, extraDays: 21 },
  ];
}
