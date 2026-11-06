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

  test('takes the picture a thumb picks out of the search', async ({ page, hasTouch }) => {
    await openAppWith(page, [detergent]);
    await openThingPicker(page);
    const picker = page.getByRole('dialog');

    // The way a hand does it: search for the word, then tap the picture.
    await picker.getByRole('button', { name: /Picture/u }).click();
    await page.locator('#emoji-search').fill('soap');
    await tapAt(page, picker.getByRole('button', { name: 'soap', exact: true }), hasTouch);

    await expect(picker.getByRole('button', { name: /Picture/u })).toContainText('🧼');
    // Picking one settles it: the search folds away and the name has the caret.
    await expect(picker.getByTestId('emoji-choice')).toHaveCount(0);
    await expect(page.locator('#thing-name')).toBeFocused();
  });

  test('reaches the last picture on a screen a keyboard has eaten into', async ({
    page,
    hasTouch,
  }) => {
    // The height a phone has left once the keyboard is up for the search field.
    // The page behind the sheet never moves, so the foot of the sheet has to
    // scroll by itself or the lower pictures are simply out of reach.
    await page.setViewportSize({ width: 375, height: 360 });
    await openAppWith(page, [detergent]);
    await openThingPicker(page);
    const picker = page.getByRole('dialog');

    await picker.getByRole('button', { name: /Picture/u }).click();
    const lastOnOffer = picker.getByTestId('emoji-choice').last();
    await lastOnOffer.scrollIntoViewIfNeeded();
    const symbol = (await lastOnOffer.textContent()) ?? '';
    expect(symbol).not.toBe('');

    await tapAt(page, lastOnOffer, hasTouch);

    await expect(picker.getByRole('button', { name: /Picture/u })).toContainText(symbol);
  });
});

/**
 * One tap in the middle of something, with the thumb the device has.
 *
 * Deliberately not `locator.click()`: that checks the element is stable and
 * enabled first, which is not what a thumb does, and on a touch screen it is
 * the touch itself — not a mouse event — that the app has to survive.
 */
async function tapAt(page: Page, target: Locator, touch: boolean): Promise<void> {
  const box = await target.boundingBox();
  if (box === null) {
    throw new Error('The thing to tap has no box on screen.');
  }
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  if (touch) {
    await page.touchscreen.tap(x, y);
    return;
  }

  await page.mouse.click(x, y);
}

/**
 * Two taps on the same thing, quickly.
 *
 * Back to back, which is what a thumb does: on a busy machine a second
 * `locator.click()` takes longer than the app's own window for "that was a
 * double tap", and the timing is the thing under test here.
 */
async function tapTwice(page: Page, row: Locator, touch: boolean): Promise<void> {
  await tapAt(page, row, touch);
  await tapAt(page, row, touch);
}
