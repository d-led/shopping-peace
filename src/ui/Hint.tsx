/** @jsxImportSource hono/jsx/dom */
import type { Child } from 'hono/jsx';

export interface HintProps {
  /** What the figure means, in one short sentence. */
  readonly text: string;
  /** Asked for when the figure is pointed at, focused or tapped; `null` to put it away. */
  readonly onAsk: (hint: string | null) => void;
  /** The element holding the same words for a screen reader. */
  readonly describedBy?: string;
  readonly children: Child;
}

/**
 * A figure that asks for its explanation when it is pointed at, focused, or
 * tapped — which is all a household does with a number it does not recognise.
 *
 * It is a button, because that is what it is: something to land on and press. A
 * focusable span would put a tab stop on the page that a keyboard can reach but
 * cannot operate, and that no screen reader would call anything. The button's
 * own chrome is stripped back by `hint-figure`, so the figure keeps the words
 * and the size around it.
 *
 * Nothing is drawn or positioned here: the sentence decides where the
 * explanation goes, so it can be kept inside the paragraph and off the edge of
 * a phone screen. This only says which explanation is wanted, and stops saying
 * it when the pointer, the focus or the tap moves on.
 */
export function Hint({ text, onAsk, describedBy, children }: HintProps) {
  const ask = () => onAsk(text);
  const forget = () => onAsk(null);

  return (
    <button
      type="button"
      class="hint-figure cursor-help"
      aria-describedby={describedBy}
      onPointerEnter={ask}
      onPointerLeave={forget}
      onFocus={ask}
      onBlur={forget}
      // A thumb tap takes no focus on a touch screen, so the figure takes it
      // itself: the explanation then stays up after the finger lifts, and goes
      // when the thumb lands somewhere else — which is what a blur is.
      onClick={(event: MouseEvent) => {
        (event.currentTarget as HTMLButtonElement | null)?.focus();
      }}
    >
      {children}
    </button>
  );
}
