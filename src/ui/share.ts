/**
 * What came of offering a link to the device: handed to its share sheet, put on
 * the clipboard, waved away, or refused.
 */
export type ShareOutcome = 'shared' | 'copied' | 'declined' | 'failed';

/**
 * Offers a link to whatever the household is holding. A phone gets its own
 * share sheet, which is where messengers, mail and notes all live; anything
 * else gets the clipboard, because a desktop has no one place to send things.
 *
 * Closing the sheet without choosing is a change of mind rather than a
 * failure: it says nothing, and nothing is wrong.
 */
export function offerLink(url: string, title: string): Promise<ShareOutcome> {
  return typeof navigator.share === 'function'
    ? shareWithSheet(url, title)
    : copyToClipboard(url);
}

async function shareWithSheet(url: string, title: string): Promise<ShareOutcome> {
  try {
    await navigator.share({ title, url });
    return 'shared';
  } catch (error) {
    return isDismissal(error) ? 'declined' : 'failed';
  }
}

async function copyToClipboard(url: string): Promise<ShareOutcome> {
  if (typeof navigator.clipboard?.writeText !== 'function') {
    return 'failed';
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}

/**
 * A share sheet closed without choosing anything. The platform reports that as
 * its own `AbortError`, which is not an `Error` everywhere — so it is asked for
 * by name and type rather than by the `Error` it happens to be in a browser.
 */
function isDismissal(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
