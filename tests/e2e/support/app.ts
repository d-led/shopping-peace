import { expect, type Page } from '@playwright/test';
import { PRESETS_STORAGE_KEY } from '../../../src/data/presets';
import type { StockItem } from '../../../src/domain/stock-item';

/**
 * Opens the app with nothing stored.
 *
 * No clearing and no reload: Playwright hands every test a fresh browser
 * context, and a fresh context has an empty `localStorage`. One page load is
 * all this needs.
 */
export async function openFreshApp(page: Page): Promise<void> {
  await page.goto('/');
  await mainScreenIsReady(page);
}

/** Opens the app with exactly these presets, as a household would have set them. */
export async function openAppWith(page: Page, presets: readonly StockItem[]): Promise<void> {
  await page.goto('/');
  await page.evaluate(
    ({ key, items }) => {
      window.localStorage.setItem(key, JSON.stringify(items));
    },
    { key: PRESETS_STORAGE_KEY, items: presets },
  );
  await page.reload();
  await mainScreenIsReady(page);
}

/** The thing picker is one press away from the name of the thing on screen. */
export async function openThingPicker(page: Page): Promise<void> {
  await page.locator('[aria-haspopup="dialog"]').click();
  await expect(page.getByRole('dialog', { name: 'Which thing?' })).toBeVisible();
}

/**
 * Every size a household actually reads, largest last: the pictures in front of
 * the labels and the ticks beside a chosen thing are marks, not reading, and
 * they are hidden from screen readers for the same reason.
 */
export function paintedFontSizes(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const TEXTUAL_INPUTS = new Set(['text', 'number', 'search', 'tel', 'url', 'email', 'password']);
    const isMark = (element: Element): boolean =>
      element.getAttribute('aria-hidden') === 'true' && element.children.length === 0;
    const showsText = (element: Element): boolean => {
      if (element instanceof HTMLInputElement) {
        return TEXTUAL_INPUTS.has(element.type) && element.value !== '';
      }
      if (element instanceof HTMLTextAreaElement) {
        return element.value !== '';
      }
      return (
        !isMark(element) &&
        element.children.length === 0 &&
        (element.textContent ?? '').trim() !== ''
      );
    };

    const sizes = new Set<string>();
    for (const element of document.querySelectorAll('body *')) {
      if (!showsText(element)) {
        continue;
      }
      const style = getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden') {
        continue;
      }
      sizes.add(style.fontSize);
    }
    return [...sizes].toSorted();
  });
}

/** Either the numbers are there, or the screen is the "nothing yet" one. */
async function mainScreenIsReady(page: Page): Promise<void> {
  const numbers = page.getByTestId('keep-at-least');
  const emptyShelf = page.getByRole('heading', { name: 'No things yet' });
  await expect(numbers.or(emptyShelf)).toBeVisible();
}
