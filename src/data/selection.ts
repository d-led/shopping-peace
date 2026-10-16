import type { KeyValueStorage } from './presets';

/** Where the thing that was open last time is remembered. */
export const SELECTED_STORAGE_KEY = 'shopping_peace_selected';

export interface SelectionRepository {
  /** The id that was open last time, or null when this browser remembers none. */
  load(): string | null;
  /** Remembers an id, or null for "nothing was open". */
  save(id: string | null): void;
}

/**
 * Kept apart from the presets themselves: this is a fact about the screen, not
 * about the shelf, and a household should never lose things because the note
 * about what was open got lost.
 */
export class LocalStorageSelectionRepository implements SelectionRepository {
  constructor(
    private readonly storage: KeyValueStorage,
    private readonly key: string = SELECTED_STORAGE_KEY,
  ) {}

  load(): string | null {
    const stored = this.storage.getItem(this.key);
    return stored === null || stored === '' ? null : stored;
  }

  save(id: string | null): void {
    // An empty string is "nothing was open": a real id is never empty.
    this.storage.setItem(this.key, id ?? '');
  }
}
