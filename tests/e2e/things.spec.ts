import { readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import type { StockItem } from '../../src/domain/stock-item';
import { openAppWith, openFreshApp, openThingPicker, paintedFontSizes } from './support/app';

/** 1 unit lasts 30 days, 3 days to fetch, 30 extra: fetch at 1, keep 2. */
const detergent: StockItem = {
  id: 'detergent',
  name: '🧴 Laundry detergent',
  usageDays: 30,
  leadDays: 3,
  extraDays: 30,
};

/** Fast used, slow to fetch: fetch at 5, keep 8. */
const tabs: StockItem = {
  id: 'tabs',
  name: '🧽 Dishwasher tabs',
  usageDays: 10,
  leadDays: 45,
  extraDays: 30,
};

test.describe('the full screen of things', () => {
  test('lists every thing, and switching keeps the sheet open for editing', async ({ page }) => {
    await openAppWith(page, [detergent, tabs]);
    await openThingPicker(page);
    const picker = page.getByRole('dialog');

    await expect(picker.getByRole('button', { name: /🧴 Laundry detergent/ })).toBeVisible();

    // No ellipsis anywhere: a long name wraps instead of being clipped.
    const clipped = await picker
      .getByTestId('picker-thing-name')
      .evaluateAll(
        (names) => names.filter((name) => name.scrollWidth > name.clientWidth + 1).length,
      );
    expect(clipped, 'a thing name is clipped with an ellipsis').toBe(0);

    await picker.getByRole('button', { name: /🧽 Dishwasher tabs/ }).click();

    // The sheet stays put, and now points at the thing that was just picked.
    await expect(picker).toBeVisible();
    await expect(page.locator('#thing-name')).toHaveValue('🧽 Dishwasher tabs');
    await expect(page.getByTestId('reorder-point')).toHaveText('5');
    await expect(page.getByTestId('target-stock')).toHaveText('8');

    await picker.getByRole('button', { name: 'OK' }).click();
    await expect(page.locator('[aria-haspopup="dialog"]')).toContainText('🧽 Dishwasher tabs');
  });

  test('takes a double press on a thing as OK', async ({ page }) => {
    await openAppWith(page, [detergent, tabs]);
    await openThingPicker(page);

    await page.getByRole('dialog').getByRole('button', { name: /🧽 Dishwasher tabs/ }).dblclick();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('[aria-haspopup="dialog"]')).toContainText('Dishwasher tabs');
    await expect(page.getByTestId('reorder-point')).toHaveText('5');
  });

  test('renames the thing you just switched to, before closing', async ({ page }) => {
    await openAppWith(page, [detergent, tabs]);
    await openThingPicker(page);
    const picker = page.getByRole('dialog');

    await picker.getByRole('button', { name: /🧽 Dishwasher tabs/ }).click();
    await expect(page.locator('#thing-name')).toHaveValue('🧽 Dishwasher tabs');

    await page.locator('#thing-name').fill('Fairy tabs');
    await picker.getByRole('button', { name: 'OK' }).click();

    await expect(page.locator('[aria-haspopup="dialog"]')).toContainText('Fairy tabs');

    // A reload opens the first thing again, but the new name stuck.
    await page.reload();
    await openThingPicker(page);
    await expect(page.getByRole('dialog').getByRole('button', { name: /Fairy tabs/ })).toBeVisible();
  });

  test('uses no more than three text sizes here either', async ({ page }) => {
    await openAppWith(page, [detergent, tabs]);
    await openThingPicker(page);

    const sizes = await paintedFontSizes(page);

    expect(sizes.length, `sizes on screen: ${sizes.join(', ')}`).toBeLessThanOrEqual(3);
  });

  test('renames the thing, and the name is still there after a reload', async ({ page }) => {
    await openAppWith(page, [detergent]);
    await openThingPicker(page);

    await page.locator('#thing-name').fill('🧼 Dish soap');
    await page.getByRole('button', { name: 'OK' }).click();

    await expect(page.locator('[aria-haspopup="dialog"]')).toContainText('🧼 Dish soap');
    await page.reload();
    await expect(page.locator('[aria-haspopup="dialog"]')).toContainText('🧼 Dish soap');
  });

  test('adds a thing from the + button and hands over the name field', async ({ page }) => {
    await openAppWith(page, [detergent]);
    await openThingPicker(page);
    const picker = page.getByRole('dialog');

    await picker.getByRole('button', { name: 'New thing' }).click();

    await expect(page.locator('#thing-name')).toHaveValue('New thing');
    await expect(page.locator('#thing-name')).toBeFocused();

    await page.locator('#thing-name').fill('🧻 Toilet paper');
    await picker.getByRole('button', { name: 'OK' }).click();

    await expect(page.locator('[aria-haspopup="dialog"]')).toContainText('🧻 Toilet paper');
    await openThingPicker(page);
    await expect(picker.getByRole('button', { name: /🧻 Toilet paper/ })).toBeVisible();
  });

  test('deletes the thing on screen, but only after asking', async ({ page }) => {
    await openAppWith(page, [detergent, tabs]);
    await openThingPicker(page);
    const picker = page.getByRole('dialog');
    const deleteButton = picker.getByRole('button', { name: /🗑️ Delete/ });

    // The one destructive action is the small one, down below a separator.
    const [deleteBox, exportBox] = await Promise.all([
      deleteButton.boundingBox(),
      picker.getByRole('button', { name: /Export/ }).boundingBox(),
    ]);
    expect(deleteBox).not.toBeNull();
    expect(exportBox).not.toBeNull();
    expect(deleteBox!.height).toBeLessThan(exportBox!.height);

    page.once('dialog', (dialog) => dialog.dismiss());
    await deleteButton.click();
    await expect(picker.getByRole('button', { name: /🧴 Laundry detergent/ })).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await deleteButton.click();

    await expect(picker.getByRole('button', { name: /🧴 Laundry detergent/ })).toHaveCount(0);
    await page.reload();
    await expect(page.locator('[aria-haspopup="dialog"]')).toContainText('🧽 Dishwasher tabs');
  });

  test('restore defaults brings back the starter things that were deleted', async ({ page }) => {
    await openAppWith(page, [tabs]);
    await openThingPicker(page);
    const picker = page.getByRole('dialog');

    await picker.getByRole('button', { name: '↩️ Restore defaults' }).click();

    await expect(page.getByRole('status')).toContainText('Brought back 4 things');
    await expect(picker.getByRole('button', { name: /🧴 Laundry detergent/ })).toBeVisible();
    await expect(picker.getByRole('button', { name: /🐾 Cat litter/ })).toBeVisible();
  });

  test('restore defaults says so when there is nothing to bring back', async ({ page }) => {
    await openFreshApp(page);
    await openThingPicker(page);

    await page.getByRole('dialog').getByRole('button', { name: '↩️ Restore defaults' }).click();

    await expect(page.getByRole('status')).toContainText('all here already');
  });

  test('brings the starter things back to an empty screen', async ({ page }) => {
    await openAppWith(page, []);

    await page.getByRole('button', { name: '↩️ Bring back the starter things' }).click();

    await expect(page.getByRole('status')).toContainText('Brought back 5 things');
    await expect(page.locator('[aria-haspopup="dialog"]')).toContainText('Dishwasher tabs');
  });
});

test.describe('numbers being changed by hand', () => {
  test('recalculates as the number is typed, and keeps it after a reload', async ({ page }) => {
    await openAppWith(page, [detergent]);

    await page.locator('#lead-days').fill('45');

    await expect(page.getByTestId('reorder-point')).toHaveText('2');
    await expect(page.getByTestId('target-stock')).toHaveText('3');
    await page.reload();
    await expect(page.locator('#lead-days')).toHaveValue('45');
    await expect(page.getByTestId('target-stock')).toHaveText('3');
  });

  test('steps with the ± buttons, which need no aiming', async ({ page }) => {
    await openAppWith(page, [detergent]);

    // Matched loosely on purpose: the wording of the label is copy that changes.
    await page.getByRole('button', { name: /^Increase 🛡️/u }).click();

    await expect(page.locator('#extra-days')).toHaveValue('31');
    // 31 extra days no longer fit inside one 30-day unit.
    await expect(page.getByTestId('target-stock')).toHaveText('3');
  });
});

test.describe('files in and out', () => {
  test('exports the presets as a dated JSON file', async ({ page }) => {
    await openAppWith(page, [detergent]);
    await openThingPicker(page);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('dialog').getByRole('button', { name: '📤 Export' }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(
      /^shopping-peace-presets-\d{4}-\d{2}-\d{2}\.json$/,
    );
    const exported = await download.path();
    expect(exported).not.toBeNull();
    expect(JSON.parse(await readFile(exported!, 'utf8'))).toEqual([detergent]);
  });

  test('imports presets from a file and says so', async ({ page }) => {
    await openAppWith(page, [detergent]);
    const file = await writeTempFile(
      'import.json',
      JSON.stringify([
        { id: 'soap', name: '🧼 Dish soap', usageDays: 20, leadDays: 2, extraDays: 40 },
      ]),
    );

    await openThingPicker(page);
    await page.locator('input[type="file"]').setInputFiles(file);

    await expect(page.getByRole('status')).toContainText('Imported 1 thing');
    await page.getByRole('dialog').getByRole('button', { name: 'OK' }).click();
    // 20 days a unit, 2 days to fetch, 40 extra days: one tight, two spare.
    await expect(page.getByTestId('target-stock')).toHaveText('3');
  });

  test('explains a file it cannot read, and keeps the presets it had', async ({ page }) => {
    await openAppWith(page, [detergent]);
    const file = await writeTempFile('broken.json', 'not json at all');

    await openThingPicker(page);
    await page.locator('input[type="file"]').setInputFiles(file);

    await expect(page.getByRole('status')).toContainText('not valid JSON');
    await expect(
      page.getByRole('dialog').getByRole('button', { name: /🧴 Laundry detergent/ }),
    ).toBeVisible();
  });
});

async function writeTempFile(name: string, contents: string): Promise<string> {
  const path = join(tmpdir(), `shopping-peace-${name}`);
  await writeFile(path, contents);
  return path;
}
