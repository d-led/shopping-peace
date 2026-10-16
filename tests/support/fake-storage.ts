import type { KeyValueStorage } from '../../src/data/presets';

/** An in-memory stand-in for `window.localStorage`. */
export class FakeStorage implements KeyValueStorage {
  readonly #entries = new Map<string, string>();

  getItem(key: string): string | null {
    return this.#entries.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.#entries.set(key, value);
  }
}
