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
 * A sheet that fails is a reason to copy instead of giving up — the household
 * asked for the link to be passed on, and the clipboard passes it on. Closing
 * the sheet without choosing is neither: it is a change of mind, and it says
 * nothing.
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
    return isDismissal(error) ? 'declined' : copyToClipboard(url);
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
