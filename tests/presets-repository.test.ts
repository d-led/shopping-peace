import { describe, expect, it } from 'vitest';
import {
  LocalStoragePresetRepository,
  PRESETS_STORAGE_KEY,
  starterPresets,
} from '../src/data/presets';
import type { StockItem } from '../src/domain/stock-item';
import { FakeStorage } from './support/fake-storage';

const detergent: StockItem = {
  id: 'detergent',
  name: '🧴 Laundry detergent',
  usageDays: 30,
  leadDays: 3,
  extraDays: 30,
};

function repositoryFor(storage: FakeStorage): LocalStoragePresetRepository {
  return new LocalStoragePresetRepository(storage);
}

describe('presets living in the browser', () => {
  it('reports nothing stored on a first visit', () => {
    expect(repositoryFor(new FakeStorage()).load()).toBeNull();
  });

  it('hands back whatever was saved', () => {
    const repository = repositoryFor(new FakeStorage());
    repository.save([detergent]);
    expect(repository.load()).toEqual([detergent]);
  });

  it('treats damaged data as a fresh start instead of refusing to open', () => {
    const storage = new FakeStorage();
    storage.setItem(PRESETS_STORAGE_KEY, '{ this is not json');
    expect(repositoryFor(storage).load()).toBeNull();
  });

  it('remembers an empty shelf, so deleted things do not come back', () => {
    const storage = new FakeStorage();
    repositoryFor(storage).save([]);
    expect(repositoryFor(storage).load()).toEqual([]);
  });
});

describe('the presets a household finds on day one', () => {
  it('starts with five things to try', () => {
    expect(starterPresets(() => 'fixed').map((item) => item.name)).toEqual([
      '🧽 Dishwasher tabs',
      '🫧 Dishwasher detergent',
      '🧴 Laundry detergent',
      '🧻 Toilet paper (jumbo)',
      '🐾 Cat litter',
    ]);
  });

  it('gives every starter its own id', () => {
    let issued = 0;
    const ids = starterPresets(() => `id-${(issued += 1)}`).map((item) => item.id);
    expect(new Set(ids).size).toBe(5);
  });

  it('describes every starter in whole days', () => {
    for (const item of starterPresets(() => 'fixed')) {
      expect(Number.isInteger(item.usageDays)).toBe(true);
      expect(Number.isInteger(item.leadDays)).toBe(true);
      expect(Number.isInteger(item.extraDays)).toBe(true);
    }
  });
});
