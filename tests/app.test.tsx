/** @jsxImportSource hono/jsx/dom */
import { render } from 'hono/jsx/dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ItemStore } from '../src/app/item-store';
import { LocalStoragePresetRepository, PRESETS_STORAGE_KEY } from '../src/data/presets';
import { parsePresets, serializePresets } from '../src/data/presets-file';
import { decodeShelf, encodeShelf, shelfInHash } from '../src/data/share-link';
import { LocalStorageSelectionRepository, SELECTED_STORAGE_KEY } from '../src/data/selection';
import { FRESHNESS_NEVER, type StockItem } from '../src/domain/stock-item';
import { App } from '../src/ui/App';
import { FakeStorage } from './support/fake-storage';

/** 1 unit lasts 30 days, 3 days to fetch, 30 extra days kept: fetch at 1, keep 2. */
const detergent: StockItem = {
  id: 'detergent',
  name: 'Laundry detergent',
  emoji: '🧴',
  usageDays: 30,
  leadDays: 3,
  extraDays: 30,
  freshDays: FRESHNESS_NEVER,
  packSize: 1,
};

/** A fast-used thing with a long wait: fetch at 5, keep 8. */
const tabs: StockItem = {
  id: 'tabs',
  name: 'Dishwasher tabs',
  emoji: '🧽',
  usageDays: 10,
  leadDays: 45,
  extraDays: 30,
  freshDays: FRESHNESS_NEVER,
  packSize: 1,
};

/** Eaten over a fortnight, but sour a week after opening: the plan counts 7. */
const butter: StockItem = {
  id: 'butter',
  name: 'Butter',
  emoji: '🧈',
  usageDays: 14,
  leadDays: 2,
  extraDays: 7,
  freshDays: 7,
  packSize: 1,
};

const mounted: HTMLElement[] = [];

function openApp(items: readonly StockItem[]) {
  const storage = new FakeStorage();
  storage.setItem(PRESETS_STORAGE_KEY, serializePresets(items));
  const store = new ItemStore(
    new LocalStoragePresetRepository(storage),
    new LocalStorageSelectionRepository(storage),
    { starterItems: () => [detergent, tabs], createId: () => 'brand-new' },
  );
  store.load();

  const container = document.createElement('div');
  document.body.append(container);
  mounted.push(container);
  render(<App store={store} />, container);

  return { container, storage };
}

/** Answers the question the app asks before replacing the shelf. */
function answerTheQuestionWith(agreed: boolean): void {
  vi.spyOn(window, 'confirm').mockReturnValue(agreed);
}

/** Follows a link to the app with a shelf in its hash, the way a message does. */
function arriveAt(hash: string): void {
  window.history.replaceState(null, '', `/${hash}`);
}

/**
 * A device with a clipboard and nowhere to share from, which is what a desktop
 * is. What it is handed is kept: copying leaves nothing on the screen to look
 * at, and the link is the whole point of pressing the button.
 */
function stubClipboard(): { readonly written: string[] } {
  const written: string[] = [];
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: (text: string) => {
        written.push(text);
        return Promise.resolve();
      },
    },
  });
  return { written };
}

/** A device with a share sheet, which is what a phone is. */
function stubShareSheet(
  fate: 'accepted' | 'abandoned' | 'broken' = 'accepted',
): { readonly offered: string[] } {
  const offered: string[] = [];
  Object.defineProperty(navigator, 'share', {
    configurable: true,
    value: (data: { readonly url?: string }) => {
      offered.push(data.url ?? '');
      return promiseFor(fate);
    },
  });
  return { offered };
}

/** What the household did with the sheet: nothing, or something went wrong. */
function promiseFor(fate: 'accepted' | 'abandoned' | 'broken'): Promise<void> {
  if (fate === 'abandoned') {
    return Promise.reject(new DOMException('closed again', 'AbortError'));
  }
  return fate === 'broken'
    ? Promise.reject(new Error('the share sheet fell over'))
    : Promise.resolve();
}

/** A device whose clipboard refuses, which is what a denied permission looks like. */
function stubRefusingClipboard(): void {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: () => Promise.reject(new Error('not allowed')) },
  });
}

/** The shelf a link really carries, read back the way the app would read it. */
function shelfInLink(link: string): ReturnType<typeof decodeShelf> {
  return decodeShelf(shelfInHash(new URL(link).hash) ?? '');
}

afterEach(() => {
  vi.restoreAllMocks();
  // An address, and a device, both outlive a test unless they are put back.
  window.history.replaceState(null, '', '/');
  Reflect.deleteProperty(navigator, 'share');
  Reflect.deleteProperty(navigator, 'clipboard');
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

/**
 * Two quick taps on the same thing, which is what a phone sends — and what a
 * row counts as "this one, and I am done". Not a `dblclick`: a phone rarely
 * reports that gesture as one, since it is also how you zoom.
 */
function tapTwice(element: HTMLElement): void {
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

/** A button inside the sheet, never the same-named one on the screen behind it. */
function pickerButton(container: HTMLElement, label: string): HTMLButtonElement {
  const dialog = picker(container);
  if (dialog === null) {
    throw new Error('The thing picker is not open.');
  }
  return button(dialog, label);
}

function emojiChoice(container: HTMLElement, firstKeyword: string): HTMLButtonElement {
  const choices = [...container.querySelectorAll('[data-testid="emoji-choice"]')];
  const found = choices.find(
    (candidate) => candidate.getAttribute('aria-label') === firstKeyword,
  );
  if (!(found instanceof HTMLButtonElement)) {
    throw new Error(`There is no emoji on offer for "${firstKeyword}".`);
  }
  return found;
}

/** Opens the picture search, and waits for the browser to paint it. */
async function openEmojiSearch(container: HTMLElement): Promise<void> {
  pickerButton(container, 'Picture').click();
  await vi.waitFor(() => {
    expect(container.querySelector('#emoji-search')).not.toBeNull();
  });
}

/** Waits for that emoji to be offered, then presses it. */
async function pickEmoji(container: HTMLElement, firstKeyword: string): Promise<void> {
  await vi.waitFor(() => {
    expect(emojiChoice(container, firstKeyword)).toBeDefined();
  });
  emojiChoice(container, firstKeyword).click();
}

/**
 * The whole errand of putting a picture on a thing: open the search, say what
 * the picture is of, and take the one that comes back. Every picture test
 * starts here, because this is where the household starts.
 */
async function pickPicture(container: HTMLElement, word: string): Promise<void> {
  await openEmojiSearch(container);
  enter(container, 'emoji-search', word);
  await pickEmoji(container, word);
}

/**
 * Hands the picker's file input a file, the way the household's file dialog
 * would. Hono aliases `onChange` to the `input` event (React's habit), which is
 * the same event a real file dialog fires — along with `change` — so this is
 * what the app is listening on.
 */
function pickFile(container: HTMLElement, contents: string): void {
  const input = fileInput(container);
  const file = new File([contents], 'presets.json', { type: 'application/json' });
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

/** The dialog was opened and thought better of: no file comes back at all. */
function dismissFileDialog(container: HTMLElement): void {
  fileInput(container).dispatchEvent(new Event('input', { bubbles: true }));
}

function fileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('There is no file input in the picker.');
  }
  return input;
}

/**
 * jsdom has no downloads, so this keeps one from being attempted. What lands in
 * the file — name and contents — is checked in the browser tests, which have a
 * real download event to look at.
 */
function stopTheDownload(): void {
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:stubbed');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
}

function saved(storage: FakeStorage): StockItem[] {
  return parsePresets(storage.getItem(PRESETS_STORAGE_KEY) ?? '[]');
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

describe('what the household sees first', () => {
  it('reads in order: the thing, when to fetch, how much to keep', () => {
    const { container } = openApp([detergent]);

    expect(
      appearsBefore(
        button(container, '🧴 Laundry detergent'),
        container.querySelector('[data-testid="fetch-more-at"]'),
      ),
    ).toBe(true);
    expect(
      appearsBefore(
        container.querySelector('[data-testid="fetch-more-at"]'),
        container.querySelector('[data-testid="keep-at-least"]'),
      ),
    ).toBe(true);
  });

  it('shows the name of the current thing and the two numbers that matter', () => {
    const { container } = openApp([detergent]);

    expect(textOf(container)).toContain('🧴 Laundry detergent');
    // The reserve is one unit; the fetch level is that plus the unit a wait
    // eats, so the two cards agree with each other.
    expect(value(container, 'keep-at-least')).toBe('1');
    expect(textOf(container)).toContain('unit spare');
    expect(value(container, 'fetch-more-at')).toBe('2');
    expect(textOf(container)).toContain('1 spare + 1 for the wait');
    expect(textOf(container)).toContain(
      "Down to 2 units? Bring home 1 more and you're at a level of 3, safe for emergencies.",
    );
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
    pickerButton(container, '🧽 Dishwasher tabs').click();

    // Still every bit as open: the household may well want to rename it next.
    expect(picker(container)).not.toBeNull();
    await vi.waitFor(() => {
      expect(field(container, 'thing-name').value).toBe('Dishwasher tabs');
    });
    expect(value(container, 'keep-at-least')).toBe('3');
  });

  it('lets you rename the thing you just switched to, before closing', async () => {
    const { container, storage } = openApp([detergent, tabs]);

    await openThingPicker(container);
    pickerButton(container, '🧽 Dishwasher tabs').click();
    await vi.waitFor(() => {
      expect(field(container, 'thing-name').value).toBe('Dishwasher tabs');
    });

    enter(container, 'thing-name', 'Fairy tabs');
    button(container, 'OK').click();

    await vi.waitFor(() => {
      expect(picker(container)).toBeNull();
    });
    expect(textOf(container)).toContain('🧽 Fairy tabs');
    expect(saved(storage).find((item) => item.id === 'tabs')?.name).toBe('Fairy tabs');
    expect(saved(storage).find((item) => item.id === 'detergent')?.name).toBe(
      'Laundry detergent',
    );
  });

  it('leaves when you press OK, or press Escape', async () => {
    const { container } = openApp([detergent]);

    await openThingPicker(container);
    button(container, 'OK').click();
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

  it('takes two taps on the thing that is already open as OK', async () => {
    const { container } = openApp([detergent, tabs]);

    await openThingPicker(container);
    // 🧴 Laundry detergent is the one already open.
    tapTwice(pickerButton(container, '🧴 Laundry detergent'));

    await vi.waitFor(() => {
      expect(picker(container)).toBeNull();
    });
    expect(value(container, 'keep-at-least')).toBe('1');
  });

  it('picks whichever thing was tapped twice, then leaves', async () => {
    const { container } = openApp([detergent, tabs]);

    await openThingPicker(container);
    tapTwice(pickerButton(container, '🧽 Dishwasher tabs'));

    await vi.waitFor(() => {
      expect(picker(container)).toBeNull();
    });
    expect(value(container, 'keep-at-least')).toBe('3');
  });

  it('leaves one tap alone: it only picks the thing', async () => {
    const { container } = openApp([detergent, tabs]);

    await openThingPicker(container);
    pickerButton(container, '🧽 Dishwasher tabs').click();

    await vi.waitFor(() => {
      expect(value(container, 'keep-at-least')).toBe('3');
    });
    expect(picker(container)).not.toBeNull();
  });

  it('keeps importing and exporting off the main screen', async () => {
    const { container } = openApp([detergent]);

    expect(textOf(container)).not.toContain('📤');

    await openThingPicker(container);
    const sheet = picker(container) ?? container;

    // Both ways out of the app live in the sheet: everything, or just this one.
    expect(pickerButton(container, 'Export all')).toBeDefined();
    expect(pickerButton(container, 'Export this one')).toBeDefined();
    expect(textOf(sheet)).toContain('Import');
  });

  it('renames the thing as you type, and keeps it', async () => {
    const { container, storage } = openApp([detergent]);

    await openThingPicker(container);
    enter(container, 'thing-name', 'Dish soap');

    await vi.waitFor(() => {
      expect(textOf(picker(container) ?? container)).toContain('Dish soap');
    });
    expect(saved(storage)[0]?.name).toBe('Dish soap');
    // The picture in front has nothing to do with the name: it stays put.
    expect(saved(storage)[0]?.emoji).toBe('🧴');
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
    expect(value(container, 'keep-at-least')).toBe('1');
  });
});

describe('finding a picture for a thing', () => {
  it('puts the chosen picture in front of the name without touching the name', async () => {
    const { container, storage } = openApp([{ ...detergent, name: 'Bar soap', emoji: '' }]);
    await openThingPicker(container);
    await pickPicture(container, 'soap');

    await vi.waitFor(() => {
      expect(saved(storage)[0]).toEqual({ ...detergent, name: 'Bar soap', emoji: '🧼' });
    });
    // The name is a name, still: the picture sits in front of it, not in it.
    expect(field(container, 'thing-name').value).toBe('Bar soap');
    expect(pickerButton(container, '🧼 Bar soap')).toBeDefined();
  });

  it('swaps the picture instead of stacking a second one', async () => {
    const { container, storage } = openApp([detergent]);
    await openThingPicker(container);
    await pickPicture(container, 'soap');

    await vi.waitFor(() => {
      expect(saved(storage)[0]).toEqual({ ...detergent, emoji: '🧼' });
    });
    // One picture, not two, and nothing else about the thing moved.
    expect(pickerButton(container, '🧼 Laundry detergent')).toBeDefined();
  });

  it('leaves the sheet open, with the name ready for what the picture is of', async () => {
    const { container } = openApp([{ ...detergent, name: 'Bar soap', emoji: '' }]);
    await openThingPicker(container);
    await pickPicture(container, 'soap');

    await vi.waitFor(() => {
      expect(document.activeElement).toBe(field(container, 'thing-name'));
    });
    expect(picker(container)).not.toBeNull();
    // Picking one is the whole of it: the search folds away by itself.
    expect(container.querySelector('#emoji-search')).toBeNull();
  });

  it('takes a tap somewhere else as the picture being settled', async () => {
    const { container } = openApp([detergent]);
    await openThingPicker(container);
    await openEmojiSearch(container);
    enter(container, 'emoji-search', 'soap');

    field(container, 'emoji-search').focus();
    field(container, 'thing-name').focus();

    await vi.waitFor(() => {
      expect(container.querySelector('#emoji-search')).toBeNull();
    });
    // Nothing was picked, so the picture the thing already had is left alone.
    expect(pickerButton(container, '🧴 Laundry detergent')).toBeDefined();
  });

  it('narrows as more words are typed, and says so when nothing is left', async () => {
    const { container } = openApp([detergent]);
    await openThingPicker(container);
    await openEmojiSearch(container);

    enter(container, 'emoji-search', 'cat litter');
    await vi.waitFor(() => {
      expect(container.querySelectorAll('[data-testid="emoji-choice"]')).toHaveLength(1);
    });

    enter(container, 'emoji-search', 'hedgehog harness');
    await vi.waitFor(() => {
      expect(textOf(container)).toContain('Nothing here for “hedgehog harness”');
    });
  });

  it('stays out of the way until it is asked for', async () => {
    const { container } = openApp([detergent]);
    await openThingPicker(container);

    expect(container.querySelector('#emoji-search')).toBeNull();

    await openEmojiSearch(container);

    expect(container.querySelector('#emoji-search')).not.toBeNull();
  });
});

describe('files in and out', () => {
  it('imports a file the household picked, and says what came in', async () => {
    const { container, storage } = openApp([detergent]);
    await openThingPicker(container);
    answerTheQuestionWith(true);

    pickFile(
      container,
      JSON.stringify([
        { id: 'soap', name: 'Dish soap', emoji: '🧼', usageDays: 20, leadDays: 2, extraDays: 40 },
      ]),
    );

    await vi.waitFor(() => {
      expect(saved(storage)[0]?.name).toBe('Dish soap');
    });
    expect(textOf(container)).toContain('Imported 1 thing.');
    // 20 days a unit, 2 days to fetch, 40 extra days: one tight, two spare.
    expect(value(container, 'keep-at-least')).toBe('2');
  });

  it('asks before a file replaces the shelf, and keeps it when told no', async () => {
    const { container, storage } = openApp([detergent]);
    await openThingPicker(container);
    answerTheQuestionWith(false);

    pickFile(
      container,
      JSON.stringify([
        { id: 'soap', name: '🧼 Dish soap', usageDays: 20, leadDays: 2, extraDays: 40 },
      ]),
    );

    await vi.waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith(
        'Replace the 1 thing here with the 1 thing in this file?',
      );
    });
    expect(saved(storage)).toEqual([detergent]);
    expect(textOf(container)).not.toContain('Imported');
  });

  it('takes an older file, which kept the emoji inside the name', async () => {
    const { container, storage } = openApp([detergent]);
    await openThingPicker(container);
    answerTheQuestionWith(true);

    // What this app wrote before the picture had a field of its own.
    pickFile(container, '[{"name": "🧼 Dish soap", "usageDays": 20, "leadDays": 2, "extraDays": 40}]');

    await vi.waitFor(() => {
      expect(saved(storage)[0]?.emoji).toBe('🧼');
    });
    expect(saved(storage)[0]?.name).toBe('Dish soap');
  });

  it('refuses a file from a newer copy of the app instead of half-reading it', async () => {
    const { container, storage } = openApp([detergent]);
    await openThingPicker(container);
    answerTheQuestionWith(true);

    pickFile(
      container,
      JSON.stringify({ format: 'shopping-peace', version: 99, exported: 'then', things: [] }),
    );

    await vi.waitFor(() => {
      expect(textOf(container)).toContain('newer Shopping Peace');
    });
    expect(saved(storage)).toEqual([detergent]);
  });

  it('says how many things are about to be replaced', async () => {
    const { container } = openApp([detergent, tabs]);
    await openThingPicker(container);
    answerTheQuestionWith(false);

    pickFile(container, '[]');

    await vi.waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith(
        'Replace the 2 things here with the 0 things in this file?',
      );
    });
  });

  it('exports every thing, and says how many went', async () => {
    const { container } = openApp([detergent, tabs]);
    await openThingPicker(container);
    stopTheDownload();

    pickerButton(container, 'Export all').click();

    await vi.waitFor(() => {
      expect(textOf(container)).toContain('Exported 2 things.');
    });
  });

  it('exports just the thing on screen', async () => {
    const { container } = openApp([detergent, tabs]);
    await openThingPicker(container);
    stopTheDownload();

    pickerButton(container, 'Export this one').click();

    await vi.waitFor(() => {
      expect(textOf(container)).toContain('Exported 1 thing.');
    });
  });

  it('explains a file it cannot read, and keeps the shelf it had', async () => {
    const { container, storage } = openApp([detergent]);
    await openThingPicker(container);

    pickFile(container, 'this is not json');

    await vi.waitFor(() => {
      expect(textOf(container)).toContain('not valid JSON');
    });
    expect(saved(storage)).toHaveLength(1);
  });

  it('does nothing at all when the file dialog was dismissed', async () => {
    const { container, storage } = openApp([detergent]);
    await openThingPicker(container);

    dismissFileDialog(container);

    expect(saved(storage)).toEqual([detergent]);
    expect(textOf(container)).not.toContain('Imported');
  });
});

describe('being told what just happened', () => {
  it('says it once, and takes it away when dismissed', async () => {
    const { container } = openApp([detergent]);
    await openThingPicker(container);
    answerTheQuestionWith(true);

    pickerButton(container, '↩️ Reset to defaults').click();
    await vi.waitFor(() => {
      expect(container.querySelector('[role="status"]')).not.toBeNull();
    });

    button(container, 'Dismiss').click();

    await vi.waitFor(() => {
      expect(container.querySelector('[role="status"]')).toBeNull();
    });
  });

  it('takes it away by itself once the household has had time to read it', async () => {
    const { container } = openApp([detergent]);
    await openThingPicker(container);
    stopTheDownload();

    pickerButton(container, 'Export all').click();
    await vi.waitFor(() => {
      expect(container.querySelector('[role="status"]')).not.toBeNull();
    });

    // "Exported 1 thing." is three words, so three seconds of screen time.
    await vi.waitFor(
      () => {
        expect(container.querySelector('[role="status"]')).toBeNull();
      },
      { timeout: 5000 },
    );
  });
});

describe('starting again from the starter things', () => {
  it('throws the shelf away after asking, and says what went with it', async () => {
    const mine = { ...detergent, id: 'mine', name: 'Dish soap' };
    const { container, storage } = openApp([mine, tabs]);
    answerTheQuestionWith(true);

    await openThingPicker(container);
    pickerButton(container, '↩️ Reset to defaults').click();

    await vi.waitFor(() => {
      expect(saved(storage).map((item) => item.id)).toEqual(['detergent', 'tabs']);
    });
    expect(textOf(picker(container) ?? container)).toContain('🧴 Laundry detergent');
    expect(textOf(container)).toContain('Back to the starter things — 1 thing of yours deleted.');
  });

  it('names how many things are about to go before it goes ahead', async () => {
    const { container, storage } = openApp([{ ...detergent, id: 'mine', name: 'Dish soap' }, tabs]);
    answerTheQuestionWith(false);

    await openThingPicker(container);
    pickerButton(container, '↩️ Reset to defaults').click();

    await vi.waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith(
        'Delete all 2 things and start again from the starter ones?',
      );
    });
    expect(saved(storage).map((item) => item.id)).toEqual(['mine', 'tabs']);
  });

  it('starts them on a screen with nothing on it, without asking', async () => {
    const { container, storage } = openApp([]);
    const asked = vi.spyOn(window, 'confirm');

    button(container, '↩️ Bring back the starter things').click();

    await vi.waitFor(() => {
      expect(saved(storage)).toHaveLength(2);
    });
    // Nothing on the shelf is nothing to lose.
    expect(asked).not.toHaveBeenCalled();
    expect(textOf(container)).toContain('Back to the starter things.');
    expect(value(container, 'keep-at-least')).toBe('1');
  });
});

describe('touching the numbers', () => {
  it('recalculates the moment a number is typed, with nothing to save afterwards', async () => {
    const { container, storage } = openApp([detergent]);

    enter(container, 'lead-days', '45');

    await vi.waitFor(() => {
      expect(textOf(container)).toContain(
        "Down to 3 units? Bring home 1 more and you're at a level of 4, safe for emergencies.",
      );
    });
    expect(saved(storage)[0]?.leadDays).toBe(45);
  });

  it('recalculates when how long a unit lasts changes, on the dial or by hand', async () => {
    const { container, storage } = openApp([detergent]);

    // A unit now lasts 10 days, so the same 3-day wait is a third of a unit —
    // still a whole one — and 30 reserve days become 3 units.
    enter(container, 'usage-days', '10');

    await vi.waitFor(() => {
      expect(value(container, 'keep-at-least')).toBe('3');
    });
    expect(textOf(container)).toContain('7 units ≈ 70 days of cover.');
    expect(saved(storage)[0]?.usageDays).toBe(10);
  });

  it('recalculates when the number is dragged on the track', async () => {
    const { container, storage } = openApp([detergent]);

    enter(container, 'extra-days-slider', '90');

    await vi.waitFor(() => {
      expect(value(container, 'keep-at-least')).toBe('3');
    });
    expect(textOf(container)).toContain('units spare');
    expect(saved(storage)[0]?.extraDays).toBe(90);
  });

  it('lets the reserve be nothing at all, for a household living on the lead time', async () => {
    const { container, storage } = openApp([detergent]);

    enter(container, 'extra-days', '0');

    await vi.waitFor(() => {
      // Nothing spare to keep, so the tight level is the whole plan.
      expect(textOf(container)).toContain('unit — nothing spare');
    });
    expect(value(container, 'keep-at-least')).toBe('1');
    expect(textOf(container)).toContain('unit left');
    expect(value(container, 'fetch-more-at')).toBe('1');
    expect(textOf(container)).toContain(
      'Down to 1 unit? Nothing is kept spare, so fetch the next unit as this one runs out.',
    );
    expect(saved(storage)[0]?.extraDays).toBe(0);
  });

  it('steps a number with the ± buttons, for hands that cannot aim at a track', async () => {
    const { container } = openApp([detergent]);

    button(container, 'Increase 🛡️').click();
    await vi.waitFor(() => {
      expect(field(container, 'extra-days').value).toBe('31');
    });
    // 31 extra days no longer fit inside a single 30-day unit.
    expect(value(container, 'keep-at-least')).toBe('2');

    button(container, 'Decrease 🛡️').click();
    await vi.waitFor(() => {
      expect(field(container, 'extra-days').value).toBe('30');
    });
    expect(value(container, 'keep-at-least')).toBe('1');
  });

  it('asks for packs, and for the shelf a pack lands on, once a pack size is set', async () => {
    const { container, storage } = openApp([detergent]);

    enter(container, 'pack-size', '10');

    await vi.waitFor(() => {
      expect(textOf(container)).toContain(
        "Bring home a 10-pack and you're at a level of 12, safe for emergencies.",
      );
    });
    expect(textOf(container)).toContain('12 units ≈ 360 days of cover.');
    expect(saved(storage)[0]?.packSize).toBe(10);
  });

  it('calls a thing sold singly the smallest a shop sells', async () => {
    const { container } = openApp([{ ...detergent, packSize: 10 }]);

    enter(container, 'pack-size', '1');

    await vi.waitFor(() => {
      expect(textOf(container)).toContain('one at a time');
    });
    expect(value(container, 'keep-at-least')).toBe('1');
  });

  it('ignores a half-typed number instead of guessing', () => {
    const { container, storage } = openApp([detergent]);

    enter(container, 'lead-days', '');

    expect(saved(storage)[0]?.leadDays).toBe(3);
    expect(value(container, 'keep-at-least')).toBe('1');
  });
});

describe('a thing that turns before it is finished', () => {
  it('counts a unit as gone when it turns, in the numbers a household reads', () => {
    const { container } = openApp([butter]);

    expect(value(container, 'keep-at-least')).toBe('1');
    expect(textOf(container)).toContain(
      "Down to 2 units? Bring home 1 more and you're at a level of 3, safe for emergencies.",
    );
  });

  it('says out loud why the numbers are higher than the eating rate suggests', () => {
    const { container } = openApp([butter]);

    expect(container.querySelector('[data-testid="spoil-warning"]')?.textContent).toContain(
      'It turns 7 days after opening, so a unit is really gone in 7 days, not the 14 days it takes to use up.',
    );
  });

  it('writes the warning where the cover line would be, rather than above the cards', () => {
    const { container } = openApp([butter]);

    // One slot, so the warning costs no height of its own.
    expect(textOf(container)).not.toContain('days of cover');
  });

  it('keeps quiet about spoiling for a thing that keeps', () => {
    const { container } = openApp([detergent]);

    expect(container.querySelector('[data-testid="spoil-warning"]')).toBeNull();
  });

  it('lets a thing be marked as gone as soon as it is opened', async () => {
    const { container, storage } = openApp([butter]);

    enter(container, 'fresh-days', '0');

    await vi.waitFor(() => {
      expect(container.querySelector('[data-testid="spoil-warning"]')?.textContent).toContain(
        'It turns at once',
      );
    });
    // A day is the shortest a unit can count as: 2 for the wait, 7 spare.
    expect(value(container, 'keep-at-least')).toBe('7');
    expect(saved(storage)[0]?.freshDays).toBe(0);
  });

  it('calls the top of the slider "never spoils" rather than "365 days"', () => {
    const { container } = openApp([detergent]);

    expect(textOf(container)).toContain('never spoils');
  });

  it('calls the bottom of the slider "spoils at once" rather than "0 days"', () => {
    const { container } = openApp([{ ...butter, freshDays: 0 }]);

    expect(textOf(container)).toContain('spoils at once');
  });
});

describe('handing the shelf over as a link', () => {
  it('copies a link that opens this shelf, where there is nowhere to send it', async () => {
    const { container } = openApp([detergent, tabs]);
    const clipboard = stubClipboard();

    button(container, 'Share').click();

    await vi.waitFor(() => {
      expect(textOf(container)).toContain('Link copied');
    });
    expect(clipboard.written).toHaveLength(1);
    const shelf = shelfInLink(clipboard.written[0] ?? '');
    expect(shelf.things.map((item) => item.name)).toEqual([
      'Laundry detergent',
      'Dishwasher tabs',
    ]);
    expect(shelf.selected).toBe(detergent.id);
    expect(textOf(container)).toContain('Link copied');
  });

  it('hands the link to the phone instead, and leaves the clipboard alone', async () => {
    const { container } = openApp([detergent]);
    const sheet = stubShareSheet();
    const clipboard = stubClipboard();

    button(container, 'Share').click();

    await vi.waitFor(() => {
      expect(sheet.offered).toHaveLength(1);
    });
    expect(shelfInLink(sheet.offered[0] ?? '').things).toEqual([detergent]);
    expect(clipboard.written).toEqual([]);
    // The phone's own sheet is the confirmation; a second one would be noise.
    expect(textOf(container)).not.toContain('Link copied');
  });

  it('says nothing when the share sheet is closed without choosing', async () => {
    const { container } = openApp([detergent]);
    const sheet = stubShareSheet('abandoned');
    const clipboard = stubClipboard();

    button(container, 'Share').click();

    await vi.waitFor(() => {
      expect(sheet.offered).toHaveLength(1);
    });
    await nextFrame();
    // Changing your mind is not a failure, and not a reason to copy instead.
    expect(clipboard.written).toEqual([]);
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it('complains when the share sheet itself falls over', async () => {
    const { container } = openApp([detergent]);
    stubShareSheet('broken');

    button(container, 'Share').click();

    await vi.waitFor(() => {
      expect(textOf(container)).toContain('The link could not be shared.');
    });
  });

  it('copies the link when the share sheet falls over', async () => {
    const { container } = openApp([detergent]);
    const sheet = stubShareSheet('broken');
    const clipboard = stubClipboard();

    button(container, 'Share').click();

    await vi.waitFor(() => {
      expect(clipboard.written).toHaveLength(1);
    });
    // The sheet was tried, and the link was passed on anyway.
    expect(sheet.offered).toHaveLength(1);
    expect(textOf(container)).toContain('Link copied');
  });

  it('complains when there is neither a share sheet nor a clipboard', async () => {
    const { container } = openApp([detergent]);

    button(container, 'Share').click();

    await vi.waitFor(() => {
      expect(textOf(container)).toContain('The link could not be shared.');
    });
  });

  it('complains when the clipboard refuses the link', async () => {
    const { container } = openApp([detergent]);
    stubRefusingClipboard();

    button(container, 'Share').click();

    await vi.waitFor(() => {
      expect(textOf(container)).toContain('The link could not be shared.');
    });
  });

  it('takes on the shelf a link carries, opening the thing it says was open', async () => {
    answerTheQuestionWith(true);
    const shared = { ...tabs, id: 'bar-soap', name: 'Bar soap' };
    arriveAt(`#p=${encodeShelf([shared], shared.id)}`);

    const { container, storage } = openApp([detergent]);

    await vi.waitFor(() => {
      expect(textOf(container)).toContain('Bar soap');
    });
    expect(textOf(container)).toContain('Opened the shelf in the link: 1 thing.');
    // Read once: the address is left clean, so a reload shows the shelf.
    expect(window.location.hash).toBe('');
    // And it is this browser's shelf from now on, rather than something on loan.
    expect(saved(storage)).toEqual([shared]);
    expect(storage.getItem(SELECTED_STORAGE_KEY)).toBe('bar-soap');
  });

  it('keeps the shelf it has when the link is turned down', async () => {
    answerTheQuestionWith(false);
    arriveAt(`#p=${encodeShelf([{ ...tabs, name: 'Bar soap' }], null)}`);

    const { container } = openApp([detergent]);

    await vi.waitFor(() => {
      expect(window.location.hash).toBe('');
    });
    expect(textOf(container)).toContain('Laundry detergent');
    expect(textOf(container)).not.toContain('Bar soap');
  });

  it('asks nothing when the shelf that arrives is all there is to lose', async () => {
    const asked = vi.spyOn(window, 'confirm');
    arriveAt(`#p=${encodeShelf([{ ...tabs, name: 'Bar soap' }], null)}`);

    const { container } = openApp([]);

    await vi.waitFor(() => {
      expect(textOf(container)).toContain('Bar soap');
    });
    expect(asked).not.toHaveBeenCalled();
  });
});
