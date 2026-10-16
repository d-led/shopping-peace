import type { Locator, Page } from '@playwright/test';
import { expect, test } from './support/coverage';
import { openAppWith, openThingPicker } from './support/app';
import { detergent, tabs } from './support/things';

/**
 * The gestures a hand makes in a kitchen, on the screens that have the hands.
 *
 * These live apart from the rest of the picker's work because they are the part
 * that genuinely differs by device: a phone reports a double tap in a way a
 * mouse never does, and a row that listens for the wrong one is a row that
 * cannot be used with one wet hand. Everything else the picker does is the same
 * page load wherever it runs, so it is checked once, on the desktop.
 */

test.describe('picking a thing with a thumb', () => {
  test('takes two taps on a thing as OK', async ({ page, hasTouch }) => {
    await openAppWith(page, [detergent, tabs]);
    await openThingPicker(page);
    const row = page.getByRole('dialog').getByRole('button', { name: /🧽 Dishwasher tabs/u });

    await tapTwice(page, row, hasTouch);

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('[aria-haspopup="dialog"]')).toContainText('Dishwasher tabs');
    await expect(page.getByTestId('keep-at-least')).toHaveText('3');
  });

  test('takes two taps on a touch screen, which is not a double click', async ({
    page,
    hasTouch,
  }) => {
    // The gesture a phone actually performs. A double *click* is a mouse one,
    // and a phone does not report a double tap as `dblclick` at all.
    test.skip(!hasTouch, 'this gesture needs a touch screen');
    await openAppWith(page, [detergent, tabs]);
    await openThingPicker(page);
    const row = page.getByRole('dialog').getByRole('button', { name: /🧽 Dishwasher tabs/u });

    await tapTwice(page, row, true);

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('[aria-haspopup="dialog"]')).toContainText('Dishwasher tabs');
  });

  test('leaves a single tap short of leaving', async ({ page }) => {
    await openAppWith(page, [detergent, tabs]);
    await openThingPicker(page);

    await page.getByRole('dialog').getByRole('button', { name: /🧽 Dishwasher tabs/u }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('#thing-name')).toHaveValue('Dishwasher tabs');
  });
});

/**
 * Two taps on the same thing, quickly.
 *
 * Deliberately not `locator.click()` twice: that checks the element is stable
 * and enabled in between, which on a busy machine takes longer than the app's
 * own window for "that was a double tap" — and the timing is the thing under
 * test here. Same place, same element, a few milliseconds apart, which is what
 * a thumb does.
 */
async function tapTwice(page: Page, row: Locator, touch: boolean): Promise<void> {
  const box = await row.boundingBox();
  if (box === null) {
    throw new Error('The thing to tap has no box on screen.');
  }
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  if (touch) {
    await page.touchscreen.tap(x, y);
    await page.touchscreen.tap(x, y);
    return;
  }

  await page.mouse.click(x, y);
  await page.mouse.click(x, y);
}
