import { expect, type Page } from '@playwright/test';
import { PRESETS_STORAGE_KEY } from '../../../src/data/presets';
import type { StockItem } from '../../../src/domain/stock-item';

/** Opens the app with the browser's storage emptied, so it seeds its own start. */
export async function openFreshApp(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
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

/** Every text size the browser actually painted, largest last. */
export function paintedFontSizes(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const TEXTUAL_INPUTS = ['text', 'number', 'search', 'tel', 'url', 'email', 'password'];
    const showsText = (element: Element): boolean => {
      if (element instanceof HTMLInputElement) {
        return TEXTUAL_INPUTS.includes(element.type) && element.value !== '';
      }
      if (element instanceof HTMLTextAreaElement) {
        return element.value !== '';
      }
      return element.children.length === 0 && (element.textContent ?? '').trim() !== '';
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
    return [...sizes].sort();
  });
}

/** Either the numbers are there, or the screen is the "nothing yet" one. */
async function mainScreenIsReady(page: Page): Promise<void> {
  const numbers = page.getByTestId('target-stock');
  const emptyShelf = page.getByRole('heading', { name: 'No things yet' });
  await expect(numbers.or(emptyShelf)).toBeVisible();
}
