/** @jsxImportSource hono/jsx/dom */
import { TEXT } from './text';

/**
 * The picture in front of a label, sized as a picture rather than as words.
 *
 * Hidden from screen readers on purpose: they read the words beside it just
 * fine, and "outbox tray" is noise before every export button.
 */
export function Icon({ symbol }: { readonly symbol: string }) {
  return (
    <span aria-hidden="true" class={`${TEXT.icon} leading-none`}>
      {symbol}
    </span>
  );
}
