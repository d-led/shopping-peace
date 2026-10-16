import { expect, test } from './support/coverage';
import type { StockItem } from '../../src/domain/stock-item';
import { openAppWith, openFreshApp, paintedFontSizes } from './support/app';

/** Eaten over a fortnight, but sour a week after opening. */
const perishable: StockItem = {
  id: 'butter',
  name: '🧈 Butter',
  usageDays: 14,
  leadDays: 2,
  extraDays: 7,
  freshDays: 7,
};

test.describe('the screen a household opens', () => {
  test('shows the numbers for the first thing straight away', async ({ page }) => {
    await openFreshApp(page);

    await expect(page.locator('[aria-haspopup="dialog"]')).toContainText('Dishwasher tabs');
    await expect(page.getByText('Keep at least')).toBeVisible();
    await expect(page.getByText('Fetch more at')).toBeVisible();
    await expect(page.getByTestId('reorder-point')).toHaveText('1');
    await expect(page.getByTestId('target-stock')).toHaveText('2');
    await expect(page.getByText('Saved as you go', { exact: false })).toBeVisible();
  });

  test('never scrolls sideways', async ({ page }) => {
    await openFreshApp(page);

    const overflowBy = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );

    expect(overflowBy, 'the page is wider than the screen').toBeLessThanOrEqual(0);
  });

  test('never scrolls sideways on the narrowest phone, or in the picker', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await openFreshApp(page);

    const sideways = () =>
      page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );

    expect(await sideways(), 'the main screen is wider than the screen').toBeLessThanOrEqual(0);

    await page.locator('[aria-haspopup="dialog"]').click();

    expect(await sideways(), 'the picker is wider than the screen').toBeLessThanOrEqual(0);

    await page.getByRole('button', { name: /Emoji/u }).click();

    expect(await sideways(), 'the emoji search is wider than the screen').toBeLessThanOrEqual(0);
  });

  test('puts both numbers above the fold, with no scrolling at all', async ({ page }) => {
    await openFreshApp(page);

    const keep = await page.getByTestId('target-stock').boundingBox();
    const viewport = page.viewportSize();

    expect(keep).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(keep!.y + keep!.height).toBeLessThanOrEqual(viewport!.height);
  });

  test('reads in order: the thing, then how much to keep, then when to fetch', async ({ page }) => {
    await openFreshApp(page);

    const thing = await page.locator('[aria-haspopup="dialog"]').boundingBox();
    const keep = await page.getByTestId('target-stock').boundingBox();
    const fetchAt = await page.getByTestId('reorder-point').boundingBox();

    expect(thing!.y).toBeLessThan(keep!.y);
    expect(keep!.x).toBeLessThan(fetchAt!.x);
  });

  test('uses no more than three text sizes', async ({ page }) => {
    await openFreshApp(page);

    const sizes = await paintedFontSizes(page);

    expect(sizes.length, `sizes on screen: ${sizes.join(', ')}`).toBeLessThanOrEqual(3);
  });

  test('sizes the slider labels to be read, not squinted at', async ({ page }) => {
    await openFreshApp(page);

    const labelSizes = await page.evaluate(() =>
      [...document.querySelectorAll('main label')].map((label) =>
        Number.parseFloat(getComputedStyle(label).fontSize),
      ),
    );

    // How long a unit lasts, how long a fetch takes, the emergency reserve,
    // and how long the thing stays fresh after opening.
    expect(labelSizes).toHaveLength(4);
    expect(Math.min(...labelSizes), 'a slider label is caption-sized').toBeGreaterThanOrEqual(16);
  });

  test('warns when a thing turns before a unit is finished', async ({ page }) => {
    await openAppWith(page, [perishable]);

    await expect(page.getByTestId('spoil-warning')).toContainText('It turns 7 days after opening');
    await expect(page.getByTestId('target-stock')).toHaveText('2');
  });

  test('says nothing about turning for a thing that keeps', async ({ page }) => {
    await openFreshApp(page);

    await expect(page.getByTestId('spoil-warning')).toHaveCount(0);
  });

  test('names the ends of the shelf life slider instead of leaving them as numbers', async ({
    page,
  }) => {
    await openAppWith(page, [{ ...perishable, freshDays: 0 }]);

    await expect(page.getByText('spoils at once')).toBeVisible();

    await page.locator('#fresh-days').fill('365');

    await expect(page.getByText('never spoils')).toBeVisible();
  });

  test('says where it came from, and which commit this copy is', async ({ page }) => {
    await openFreshApp(page);

    await expect(page.getByRole('link', { name: 'Source on GitHub' })).toBeVisible();
    await expect(page.getByTestId('build-sha')).toHaveText(/^[0-9a-f]{7}$/u);
  });

  test('keeps renaming and deleting off the main screen', async ({ page }) => {
    await openFreshApp(page);

    await expect(page.getByRole('button', { name: /Delete/u })).toHaveCount(0);
    await expect(page.locator('#thing-name')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Export/u })).toHaveCount(0);
  });
});
