/**
 * jsdom 31 knows the `HTMLDialogElement` type but not what it does: there is no
 * `showModal()` and no `close()`.
 *
 * The app opens the thing picker as a real modal dialog, so the suite gives
 * jsdom the two calls the app makes — show it, and close it, firing the `close`
 * event the app listens to — and nothing more. What a dialog is *for* — the top
 * layer, the inert page behind it, focus kept inside, Escape and the back
 * gesture — is the browser's, and the browser tests press those for real.
 */
export function teachJsdomToOpenDialogs(): void {
  const prototype = window.HTMLDialogElement?.prototype;
  if (prototype === undefined || typeof prototype.showModal === 'function') {
    return;
  }

  const show = function (this: HTMLDialogElement): void {
    this.open = true;
  };
  const close = function (this: HTMLDialogElement): void {
    if (!this.open) {
      return;
    }
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };

  Object.assign(prototype, { show, showModal: show, close });
}

teachJsdomToOpenDialogs();
