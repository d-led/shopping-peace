import { describe, expect, it } from 'vitest';
import {
  LocalStoragePresetRepository,
  PRESETS_STORAGE_KEY,
  starterPresets,
} from '../src/data/presets';
import { FRESHNESS_NEVER } from '../src/domain/stock-item';
import { FakeStorage } from './support/fake-storage';
import { thing } from './support/items';

const detergent = thing({ id: 'detergent', name: 'Laundry detergent', emoji: '🧴' });

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
  it('starts with something to fetch, something to wash, and something that keeps', () => {
    expect(starterPresets(() => 'fixed').map((item) => item.name)).toEqual([
      'Dishwasher tabs',
      'Dishwasher detergent',
      'Laundry detergent',
      'Toilet paper (jumbo)',
      'Cat litter',
      'Butter',
    ]);
  });

  it('gives every starter a picture of its own, beside the name', () => {
    const starters = starterPresets(() => 'fixed');

    expect(starters.every((starter) => starter.emoji !== '')).toBe(true);
    expect(starters.map((starter) => starter.emoji)).toEqual(['🧽', '🫧', '🧴', '🧻', '🐾', '🧈']);
  });

  it('gives every starter its own id', () => {
    let issued = 0;
    const ids = starterPresets(() => `id-${(issued += 1)}`).map((item) => item.id);
    expect(new Set(ids).size).toBe(6);
  });

  it('describes every starter in whole days', () => {
    for (const starter of starterPresets(() => 'fixed')) {
      for (const days of [
        starter.usageDays,
        starter.leadDays,
        starter.extraDays,
        starter.freshDays,
      ]) {
        expect(Number.isInteger(days)).toBe(true);
      }
    }
  });

  it('ships one perishable, so the freshness slider is not a mystery', () => {
    const perishable = starterPresets(() => 'fixed').filter(
      (starter) => starter.freshDays < FRESHNESS_NEVER,
    );
    expect(perishable.map((starter) => starter.name)).toEqual(['Butter']);
  });
});
