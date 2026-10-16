/** @jsxImportSource hono/jsx/dom */
import { render } from 'hono/jsx/dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ItemStore } from '../src/app/item-store';
import { LocalStoragePresetRepository, PRESETS_STORAGE_KEY } from '../src/data/presets';
import { parsePresets, serializePresets } from '../src/data/presets-file';
import type { StockItem } from '../src/domain/stock-item';
import { App } from '../src/ui/App';
import { FakeStorage } from './support/fake-storage';

/** 1 unit lasts 30 days, 3 days to fetch, 30 extra days kept: fetch at 1, keep 2. */
const detergent: StockItem = {
  id: 'detergent',
  name: '🧴 Laundry detergent',
  usageDays: 30,
  leadDays: 3,
  extraDays: 30,
};

/** A fast-used thing with a long wait: fetch at 5, keep 8. */
const tabs: StockItem = {
  id: 'tabs',
  name: '🧽 Dishwasher tabs',
  usageDays: 10,
  leadDays: 45,
  extraDays: 30,
};

const mounted: HTMLElement[] = [];

function openApp(items: readonly StockItem[]) {
  const storage = new FakeStorage();
  storage.setItem(PRESETS_STORAGE_KEY, serializePresets(items));
  const store = new ItemStore(new LocalStoragePresetRepository(storage), {
    starterItems: () => [],
    createId: () => 'brand-new',
  });
  store.load();

  const container = document.createElement('div');
  document.body.append(container);
  mounted.push(container);
  render(<App store={store} />, container);

  return { container, storage };
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const container of mounted.splice(0)) {
    container.remove();
  }
});

function textOf(container: HTMLElement): string {
  return container.textContent ?? '';
}

function picker(container: HTMLElement): HTMLElement | null {
  return container.querySelector('[role="dialog"]');
}

function field(container: HTMLElement, id: string): HTMLInputElement {
  const element = container.querySelector(`#${id}`);
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`There is no input #${id} on the page.`);
  }
  return element;
}

function value(container: HTMLElement, testId: string): string {
  return container.querySelector(`[data-testid="${testId}"]`)?.textContent ?? '';
}

function button(container: HTMLElement, label: string): HTMLButtonElement {
  const buttons = [...container.querySelectorAll('button')];
  const found =
    buttons.find((candidate) => candidate.getAttribute('aria-label') === label) ??
    buttons.find((candidate) =>
      (candidate.getAttribute('aria-label') ?? candidate.textContent ?? '').includes(label),
    );
  if (found === undefined) {
    throw new Error(`There is no button matching "${label}" on the page.`);
  }
  return found;
}

function appearsBefore(first: Element | null, second: Element | null): boolean {
  if (first === null || second === null) {
    throw new Error('Both elements have to be on the page to compare their order.');
  }
  return Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
}

async function openThingPicker(container: HTMLElement): Promise<void> {
  const trigger = container.querySelector('[aria-haspopup="dialog"]');
  if (!(trigger instanceof HTMLButtonElement)) {
    throw new Error('There is no thing picker button on the page.');
  }
  trigger.click();
  await vi.waitFor(() => {
    expect(picker(container)).not.toBeNull();
  });
}

function enter(container: HTMLElement, id: string, typed: string): void {
  const input = field(container, id);
  input.value = typed;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function saved(storage: FakeStorage): StockItem[] {
  return parsePresets(storage.getItem(PRESETS_STORAGE_KEY) ?? '[]');
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

describe('what the household sees first', () => {
  it('reads in order: the thing, how much to keep, when to fetch', () => {
    const { container } = openApp([detergent]);

    expect(
      appearsBefore(
        button(container, '🧴 Laundry detergent'),
        container.querySelector('[data-testid="target-stock"]'),
      ),
    ).toBe(true);
    expect(
      appearsBefore(
        container.querySelector('[data-testid="target-stock"]'),
        container.querySelector('[data-testid="reorder-point"]'),
      ),
    ).toBe(true);
  });

  it('shows the name of the current thing and the two numbers that matter', () => {
    const { container } = openApp([detergent]);

    expect(textOf(container)).toContain('🧴 Laundry detergent');
    expect(value(container, 'target-stock')).toBe('2');
    expect(value(container, 'reorder-point')).toBe('1');
    expect(textOf(container)).toContain("Down to 1? Bring home 1 more and you're back at 2.");
    expect(textOf(container)).toContain('units — 1 spare');
  });

  it('keeps renaming and deleting off the main screen', () => {
    const { container } = openApp([detergent]);

    expect(textOf(container)).not.toContain('Delete');
    expect(container.querySelector('#thing-name')).toBeNull();
  });

  it('never shows an unfilled placeholder', () => {
    const { container } = openApp([detergent, tabs]);

    expect(textOf(container)).not.toContain('${');
  });

  it('invites you to start when the shelf is empty', () => {
    const { container } = openApp([]);

    expect(textOf(container)).toContain('No things yet');
  });
});

describe('the full screen of things', () => {
  it('opens when the thing name is pressed', async () => {
    const { container } = openApp([detergent, tabs]);

    await openThingPicker(container);

    expect(textOf(picker(container) ?? container)).toContain('🧽 Dishwasher tabs');
  });

  it('switches to the thing that was pressed, and stays open for editing', async () => {
    const { container } = openApp([detergent, tabs]);

    await openThingPicker(container);
    button(container, '🧽 Dishwasher tabs').click();

    // Still every bit as open: the household may well want to rename it next.
    expect(picker(container)).not.toBeNull();
    await vi.waitFor(() => {
      expect(field(container, 'thing-name').value).toBe('🧽 Dishwasher tabs');
    });
    expect(value(container, 'target-stock')).toBe('8');
    expect(value(container, 'reorder-point')).toBe('5');
  });

  it('lets you rename the thing you just switched to, before closing', async () => {
    const { container, storage } = openApp([detergent, tabs]);

    await openThingPicker(container);
    button(container, '🧽 Dishwasher tabs').click();
    await vi.waitFor(() => {
      expect(field(container, 'thing-name').value).toBe('🧽 Dishwasher tabs');
    });

    enter(container, 'thing-name', 'Fairy tabs');
    button(container, 'Close').click();

    await vi.waitFor(() => {
      expect(picker(container)).toBeNull();
    });
    expect(textOf(container)).toContain('Fairy tabs');
    expect(saved(storage).find((item) => item.id === 'tabs')?.name).toBe('Fairy tabs');
    expect(saved(storage).find((item) => item.id === 'detergent')?.name).toBe(
      '🧴 Laundry detergent',
    );
  });

  it('closes when you press close, and on Escape', async () => {
    const { container } = openApp([detergent]);

    await openThingPicker(container);
    button(container, 'Close').click();
    await vi.waitFor(() => {
      expect(picker(container)).toBeNull();
    });

    await openThingPicker(container);
    await nextFrame();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await vi.waitFor(() => {
      expect(picker(container)).toBeNull();
    });
  });

  it('keeps importing and exporting off the main screen', async () => {
    const { container } = openApp([detergent]);

    expect(textOf(container)).not.toContain('Export');

    await openThingPicker(container);
    expect(textOf(picker(container) ?? container)).toContain('Export');
    expect(textOf(picker(container) ?? container)).toContain('Import');
  });

  it('renames the thing as you type, and keeps it', async () => {
    const { container, storage } = openApp([detergent]);

    await openThingPicker(container);
    enter(container, 'thing-name', '🧼 Dish soap');

    await vi.waitFor(() => {
      expect(textOf(picker(container) ?? container)).toContain('🧼 Dish soap');
    });
    expect(saved(storage)[0]?.name).toBe('🧼 Dish soap');
  });

  it('deletes the thing you are looking at, after asking', async () => {
    const { container, storage } = openApp([detergent, tabs]);
    const asked = vi.spyOn(window, 'confirm').mockReturnValue(true);

    await openThingPicker(container);
    button(container, '🗑️ Delete').click();

    await vi.waitFor(() => {
      expect(saved(storage)).toHaveLength(1);
    });
    expect(saved(storage)[0]?.id).toBe('tabs');
    expect(asked).toHaveBeenCalledWith('Delete 🧴 Laundry detergent?');
  });

  it('keeps the thing when the household changes its mind', async () => {
    const { container, storage } = openApp([detergent]);
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    await openThingPicker(container);
    button(container, '🗑️ Delete').click();

    expect(saved(storage)).toHaveLength(1);
  });

  it('adds a thing from one + press and hands you the name field', async () => {
    const { container, storage } = openApp([detergent]);

    await openThingPicker(container);
    button(container, 'New thing').click();

    await vi.waitFor(() => {
      expect(field(container, 'thing-name').value).toBe('New thing');
    });
    expect(saved(storage)).toHaveLength(2);
  });

  it('lets you create the very first thing from an empty screen', async () => {
    const { container, storage } = openApp([]);

    button(container, '+ New thing').click();

    await vi.waitFor(() => {
      expect(saved(storage)).toHaveLength(1);
    });
    // A brand new thing starts as 1 unit per 30 days, 3 days to fetch, 30 extra days.
    expect(value(container, 'target-stock')).toBe('2');
  });
});

describe('touching the numbers', () => {
  it('recalculates the moment a number is typed, with nothing to save afterwards', async () => {
    const { container, storage } = openApp([detergent]);

    enter(container, 'lead-days', '45');

    await vi.waitFor(() => {
      expect(value(container, 'reorder-point')).toBe('2');
    });
    expect(value(container, 'target-stock')).toBe('3');
    expect(textOf(container)).toContain("Down to 2? Bring home 1 more and you're back at 3.");
    expect(saved(storage)[0]?.leadDays).toBe(45);
  });

  it('recalculates when the number is dragged on the track', async () => {
    const { container, storage } = openApp([detergent]);

    enter(container, 'extra-days-slider', '90');

    await vi.waitFor(() => {
      expect(value(container, 'target-stock')).toBe('4');
    });
    expect(textOf(container)).toContain('3 spare');
    expect(saved(storage)[0]?.extraDays).toBe(90);
  });

  it('steps a number with the ± buttons, for hands that cannot aim at a track', async () => {
    const { container } = openApp([detergent]);

    button(container, 'Increase 🛡️').click();
    await vi.waitFor(() => {
      expect(field(container, 'extra-days').value).toBe('31');
    });
    // 31 extra days no longer fit inside a single 30-day unit.
    expect(value(container, 'target-stock')).toBe('3');

    button(container, 'Decrease 🛡️').click();
    await vi.waitFor(() => {
      expect(field(container, 'extra-days').value).toBe('30');
    });
    expect(value(container, 'target-stock')).toBe('2');
  });

  it('ignores a half-typed number instead of guessing', async () => {
    const { container, storage } = openApp([detergent]);

    enter(container, 'lead-days', '');

    expect(saved(storage)[0]?.leadDays).toBe(3);
    expect(value(container, 'reorder-point')).toBe('1');
  });
});
