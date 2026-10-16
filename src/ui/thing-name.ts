/** The one text field in the app, so it always has a predictable id. */
export const THING_NAME_FIELD_ID = 'thing-name';

/**
 * Puts the caret in the name, once the frame has painted it. Both places that
 * land there have just changed the name, so the text is selected and typing
 * replaces it rather than appending to it.
 */
export function focusThingNameSoon(): void {
  requestAnimationFrame(() => {
    const field = document.getElementById(THING_NAME_FIELD_ID);
    if (field instanceof HTMLInputElement) {
      field.focus();
      field.select();
    }
  });
}
