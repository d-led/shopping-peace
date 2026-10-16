import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './support/coverage';
import { openAppWith, openFreshApp, openThingPicker } from './support/app';
import { perishable } from './support/things';

/**
 * Accessibility, checked the way a screen reader would find it rather than by
 * eye.
 *
 * Playwright has no accessibility rules of its own; axe-core is the engine
 * every browser-based audit uses, Lighthouse (Google's) among them. Running it
 * here means the rules are checked on the real, painted page — the same page
 * the tests above click through — instead of on a hand-written DOM. It runs on
 * the desktop only: what axe inspects is the DOM and the colours, neither of
 * which changes with the viewport, and the analysis is the most expensive thing
 * in this suite.
 */

async function complaintsAbout(page: Page): Promise<string[]> {
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations.map(
    (violation) =>
      `${violation.id} (${violation.impact ?? 'unknown'}): ${violation.help} — ${violation.nodes
        .map((node) => node.target.join(' '))
        .join(', ')}`,
  );
}

test.describe('the page a screen reader reads', () => {
  test('has nothing to complain about on the main screen', async ({ page }) => {
    await openFreshApp(page);

    expect(await complaintsAbout(page)).toEqual([]);
  });

  test('has nothing to complain about while a warning is showing', async ({ page }) => {
    await openAppWith(page, [perishable]);

    expect(await complaintsAbout(page)).toEqual([]);
  });

  test('has nothing to complain about with the thing picker open', async ({ page }) => {
    await openFreshApp(page);
    await openThingPicker(page);

    expect(await complaintsAbout(page)).toEqual([]);
  });

  test('has nothing to complain about with the emoji search open', async ({ page }) => {
    await openFreshApp(page);
    await openThingPicker(page);
    await page.getByRole('button', { name: /Picture/u }).click();
    await expect(page.locator('#emoji-search')).toBeVisible();

    expect(await complaintsAbout(page)).toEqual([]);
  });
});
