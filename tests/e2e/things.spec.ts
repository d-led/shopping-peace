import { readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from './support/coverage';
import { openAppWith, openThingPicker, paintedFontSizes } from './support/app';
import { detergent, tabs } from './support/things';

/**
 * The picker: switching, renaming, deleting, and the files that travel in and
 * out. Checked on the desktop rather than on all three device profiles — the
 * page load is the same one, and what differs by device (layout, touch, the
 * two-tap gesture) lives in `main-screen.spec.ts` and `touch.spec.ts`.
 */

test.describe('the full screen of things', () => {
  test('lists every thing, and switching keeps the sheet open for editing', async ({ page }) => {
    await openAppWith(page, [detergent, tabs]);
    await openThingPicker(page);
    const picker = page.getByRole('dialog');

    await expect(picker.getByRole('button', { name: /🧴 Laundry detergent/u })).toBeVisible();

    // No ellipsis anywhere: a long name wraps instead of being clipped.
    const clipped = await picker
      .getByTestId('picker-thing-name')
      .evaluateAll(
        (names) => names.filter((name) => name.scrollWidth > name.clientWidth + 1).length,
      );
    expect(clipped, 'a thing name is clipped with an ellipsis').toBe(0);

    await picker.getByRole('button', { name: /🧽 Dishwasher tabs/u }).click();

    // The sheet stays put, and now points at the thing that was just picked.
    await expect(picker).toBeVisible();
    await expect(page.locator('#thing-name')).toHaveValue('Dishwasher tabs');
    // Three spares, plus the five units a forty-five day wait eats: eight.
    await expect(page.getByTestId('keep-at-least')).toHaveText('3');
    await expect(page.getByTestId('fetch-more-at')).toHaveText('8');

    await picker.getByRole('button', { name: 'OK' }).click();
    await expect(page.locator('[aria-haspopup="dialog"]')).toContainText('🧽 Dishwasher tabs');
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

  test('comes back to the thing you were on, not to the first one', async ({ page }) => {
    await openAppWith(page, [detergent, tabs]);
    await openThingPicker(page);

    await page.getByRole('dialog').getByRole('button', { name: /🧽 Dishwasher tabs/u }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'OK' }).click();
    await expect(page.locator('[aria-haspopup="dialog"]')).toContainText('🧽 Dishwasher tabs');

    await page.reload();

    await expect(page.locator('[aria-haspopup="dialog"]')).toContainText('🧽 Dishwasher tabs');
    await expect(page.getByTestId('keep-at-least')).toHaveText('3');
  });

  test('takes the picture it is offered, and leaves the name alone', async ({ page }) => {
    await openAppWith(page, [detergent]);
    await openThingPicker(page);
    const picker = page.getByRole('dialog');

    await picker.getByRole('button', { name: /Picture/u }).click();
    await page.locator('#emoji-search').fill('milk');
    await picker.getByRole('button', { name: 'milk', exact: true }).click();

    // The picture has a field of its own: the name is still just the name.
    await expect(page.locator('#thing-name')).toHaveValue('Laundry detergent');
    // The sheet stays open, and the caret is back in the name.
    await expect(page.locator('#thing-name')).toBeFocused();

    // Typing a picture in front of the name is still taken as the picture.
    await page.locator('#thing-name').fill('🥛 Semi-skimmed milk');
    await picker.getByRole('button', { name: 'OK' }).click();
    await page.reload();
    await expect(page.locator('[aria-haspopup="dialog"]')).toContainText('🥛 Semi-skimmed milk');
    await openThingPicker(page);
    await expect(page.locator('#thing-name')).toHaveValue('Semi-skimmed milk');
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
    await expect(picker.getByRole('button', { name: /🧻 Toilet paper/u })).toBeVisible();
  });

  test('deletes the thing on screen, but only after asking', async ({ page }) => {
    await openAppWith(page, [detergent, tabs]);
    await openThingPicker(page);
    const picker = page.getByRole('dialog');
    const deleteButton = picker.getByRole('button', { name: /🗑️ Delete/u });

    // The one destructive action is the small one, down below a separator.
    const [deleteBox, exportBox] = await Promise.all([
      deleteButton.boundingBox(),
      picker.getByRole('button', { name: 'Export all' }).boundingBox(),
    ]);
    expect(deleteBox).not.toBeNull();
    expect(exportBox).not.toBeNull();
    expect(deleteBox!.height).toBeLessThan(exportBox!.height);

    page.once('dialog', (dialog) => dialog.dismiss());
    await deleteButton.click();
    await expect(picker.getByRole('button', { name: /🧴 Laundry detergent/u })).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await deleteButton.click();

    await expect(picker.getByRole('button', { name: /🧴 Laundry detergent/u })).toHaveCount(0);
    await page.reload();
    await expect(page.locator('[aria-haspopup="dialog"]')).toContainText('🧽 Dishwasher tabs');
  });

  test('starts the shelf again from the starter things, after asking', async ({ page }) => {
    await openAppWith(page, [tabs]);
    await openThingPicker(page);
    const picker = page.getByRole('dialog');

    // Told no, the shelf is left exactly as it was.
    page.once('dialog', (dialog) => dialog.dismiss());
    await picker.getByRole('button', { name: '↩️ Reset to defaults' }).click();
    await expect(picker.getByRole('button', { name: /🧴 Laundry detergent/u })).toHaveCount(0);

    page.once('dialog', (dialog) => dialog.accept());
    await picker.getByRole('button', { name: '↩️ Reset to defaults' }).click();

    await expect(page.getByRole('status')).toContainText('Back to the starter things');
    await expect(picker.getByRole('button', { name: /🧴 Laundry detergent/u })).toBeVisible();
    await expect(picker.getByRole('button', { name: /🧈 Butter/u })).toBeVisible();

    await page.reload();
    await openThingPicker(page);
    await expect(picker.getByRole('button', { name: /🧈 Butter/u })).toBeVisible();
  });

  test('starts the shelf again on an empty screen, without asking', async ({ page }) => {
    await openAppWith(page, []);

    await page.getByRole('button', { name: '↩️ Bring back the starter things' }).click();

    await expect(page.getByRole('status')).toContainText('Back to the starter things');
    await expect(page.locator('[aria-haspopup="dialog"]')).toContainText('Dishwasher tabs');
    await expect(page.getByTestId('keep-at-least')).toHaveText('7');

    // Starting again is not "shown once": the shelf they land on is written down.
    await page.reload();
    await expect(page.locator('[aria-haspopup="dialog"]')).toContainText('Dishwasher tabs');
  });
});

test.describe('numbers being changed by hand', () => {
  test('recalculates as the number is typed, and keeps it after a reload', async ({ page }) => {
    await openAppWith(page, [detergent]);

    await page.locator('#lead-days').fill('45');

    // A 45-day wait eats two units instead of one, so the level to fetch at
    // grows with it: two units of wait, one of reserve, one fetched.
    await expect(
      page.getByText("Down to 3 units? Bring home 1 more and you're at a level of 4, safe for emergencies."),
    ).toBeVisible();
    await page.reload();
    await expect(page.locator('#lead-days')).toHaveValue('45');
    await expect(
      page.getByText("Down to 3 units? Bring home 1 more and you're at a level of 4, safe for emergencies."),
    ).toBeVisible();
  });

  test('steps with the ± buttons, which need no aiming', async ({ page }) => {
    await openAppWith(page, [detergent]);

    // Matched loosely on purpose: the wording of the label is copy that changes.
    await page.getByRole('button', { name: /^Increase 🛡️/u }).click();

    await expect(page.locator('#extra-days')).toHaveValue('31');
    // 31 extra days no longer fit inside one 30-day unit, so a second spare.
    await expect(page.getByTestId('keep-at-least')).toHaveText('2');
  });
});

test.describe('files in and out', () => {
  test('exports every thing as a dated JSON file', async ({ page }) => {
    await openAppWith(page, [detergent, tabs]);
    await openThingPicker(page);
    const exportAll = page.getByRole('dialog').getByRole('button', { name: 'Export all' });

    // The button says what it does, in the words a household would use.
    await expect(exportAll).toContainText('Export all');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      exportAll.click(),
    ]);

    expect(download.suggestedFilename()).toMatch(
      /^shopping-peace-presets-\d{4}-\d{2}-\d{2}\.json$/u,
    );
    const exported = await download.path();
    expect(exported).not.toBeNull();
    const file = JSON.parse(await readFile(exported!, 'utf8'));

    // A file that says what it is and when it was written, holding the things.
    expect(file).toMatchObject({
      format: 'shopping-peace',
      version: 1,
      exported: expect.any(String),
    });
    expect(file.things).toEqual([detergent, tabs]);
  });

  test('says what happened, and then gets out of the way on its own', async ({ page }) => {
    await openAppWith(page, [detergent, tabs]);
    await openThingPicker(page);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('dialog').getByRole('button', { name: 'Export all' }).click(),
    ]);
    await download.path();

    await expect(page.getByRole('status')).toContainText('Exported 2 things.');
    // Three words and a picture of a message: three seconds, then gone.
    await expect(page.getByRole('status')).toHaveCount(0, { timeout: 8000 });
  });

  test('exports one thing, in a file named after it', async ({ page }) => {
    await openAppWith(page, [detergent, tabs]);
    await openThingPicker(page);
    const picker = page.getByRole('dialog');

    // The thing on screen, which is the one the sheet has highlighted.
    await picker.getByRole('button', { name: /🧽 Dishwasher tabs/u }).click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      picker.getByRole('button', { name: 'Export this one' }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(
      /^shopping-peace-dishwasher-tabs-\d{4}-\d{2}-\d{2}\.json$/u,
    );
    const exported = await download.path();
    expect(exported).not.toBeNull();
    // One thing in the same shape as the whole shelf, so import cannot tell the
    // difference.
    expect(JSON.parse(await readFile(exported!, 'utf8')).things).toEqual([tabs]);
  });

  test('imports presets from a file and says so', async ({ page }) => {
    await openAppWith(page, [detergent]);
    const file = await writeTempFile(
      'import.json',
      JSON.stringify({
        format: 'shopping-peace',
        version: 1,
        exported: '2026-10-16T08:00:00.000Z',
        things: [
          { id: 'soap', name: 'Dish soap', emoji: '🧼', usageDays: 20, leadDays: 2, extraDays: 40 },
        ],
      }),
    );

    await importFile(page, file);

    // 20 days a unit, 2 days to fetch, 40 extra days: two spares.
    await expect(page.getByTestId('keep-at-least')).toHaveText('2');

    await page.reload();
    await expect(page.locator('[aria-haspopup="dialog"]')).toContainText('🧼 Dish soap');
    await expect(page.getByTestId('keep-at-least')).toHaveText('2');
  });

  test('imports the file it used to write, with the picture inside the name', async ({ page }) => {
    await openAppWith(page, [detergent]);
    // No version, no emoji field: what this app wrote before the format was
    // versioned. The file is still read, and the picture is kept.
    const file = await writeTempFile(
      'older.json',
      '[{"id": "soap", "name": "🧼 Dish soap", "usageDays": 20, "leadDays": 2, "extraDays": 40}]',
    );

    await importFile(page, file);

    // The picture came out of the name, and the name is just the name now.
    await expect(page.locator('[aria-haspopup="dialog"]')).toContainText('🧼 Dish soap');
    await openThingPicker(page);
    await expect(page.locator('#thing-name')).toHaveValue('Dish soap');
  });

  test('asks before a file replaces the shelf, and keeps it when told no', async ({ page }) => {
    await openAppWith(page, [detergent]);
    const file = await writeTempFile(
      'replacement.json',
      JSON.stringify([
        { id: 'soap', name: '🧼 Dish soap', usageDays: 20, leadDays: 2, extraDays: 40 },
      ]),
    );

    await openThingPicker(page);
    page.once('dialog', (dialog) => dialog.dismiss());
    await page.locator('input[type="file"]').setInputFiles(file);

    await expect(page.getByRole('dialog').getByRole('button', { name: /🧴 Laundry detergent/u }))
      .toBeVisible();
    await expect(page.getByRole('status')).toHaveCount(0);
    await page.reload();
    await expect(page.locator('[aria-haspopup="dialog"]')).toContainText('🧴 Laundry detergent');
  });

  test('explains a file it cannot read, and keeps the presets it had', async ({ page }) => {
    await openAppWith(page, [detergent]);
    const file = await writeTempFile('broken.json', 'not json at all');

    await openThingPicker(page);
    await page.locator('input[type="file"]').setInputFiles(file);

    await expect(page.getByRole('status')).toContainText('not valid JSON');
    await expect(
      page.getByRole('dialog').getByRole('button', { name: /🧴 Laundry detergent/u }),
    ).toBeVisible();
  });
});

/**
 * The whole errand of importing a file: choose it, answer the question about
 * replacing the shelf, and let the app say what came in and get out of the way.
 * It is handed the file itself, so writing one — the I/O — stays with the test
 * that has one to write.
 *
 * The tests about *not* importing — a file from a newer copy, a file that cannot
 * be read — take those steps themselves: not importing is the behaviour they
 * are there to pin down.
 */
async function importFile(page: Page, path: string): Promise<void> {
  await openThingPicker(page);
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('input[type="file"]').setInputFiles(path);

  await expect(page.getByRole('status')).toContainText('Imported 1 thing');
  await page.getByRole('dialog').getByRole('button', { name: 'OK' }).click();
}

async function writeTempFile(name: string, contents: string): Promise<string> {
  const path = join(tmpdir(), `shopping-peace-${name}`);
  await writeFile(path, contents);
  return path;
}
