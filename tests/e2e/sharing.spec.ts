import { encodeShelf } from '../../src/data/share-link';
import { openAppWith } from './support/app';
import { expect, test } from './support/coverage';
import { detergent } from './support/things';

/**
 * A shared link, opened in a tab that already has the app sitting in it — which
 * is how it happens in practice: the link is pasted into whatever is open.
 *
 * Only the fragment changes, so the browser does no reload and the page is
 * never built again. An app that reads its address once, on the way in, will
 * sit there and do nothing; this is the test that says so.
 */
test.describe('a shelf arriving in the address', () => {
  test('opens the shelf a link carries, in a tab that was already open', async ({ page }) => {
    await openAppWith(page, [detergent]);
    const shared = { ...detergent, id: 'bar-soap', name: 'Bar soap' };

    page.once('dialog', (dialog) => dialog.accept());
    await page.evaluate((hash: string) => {
      window.location.hash = hash;
    }, `#p=${encodeShelf([shared], shared.id)}`);

    await expect(page.locator('[aria-haspopup="dialog"]')).toContainText('Bar soap');
    await expect(page.getByRole('status')).toContainText('Opened the shelf in the link: 1 thing.');

    // Read once, so a reload shows the shelf instead of asking the same
    // question a second time.
    expect(page.url()).not.toContain('#p=');
  });
});
