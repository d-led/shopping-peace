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
 * Nothing is drawn or positioned here: the sentence decides where the explanation
 * goes, so it can be kept inside the paragraph and off the edge of a phone
 * screen. This only says which explanation is wanted, and stops saying it when
 * the pointer, the focus or the tap moves on.
 */
export function Hint({ text, onAsk, describedBy, children }: HintProps) {
  const ask = () => onAsk(text);
  const forget = () => onAsk(null);

  return (
    <span
      class="cursor-help"
      tabindex={0}
      aria-describedby={describedBy}
      onPointerEnter={ask}
      onPointerLeave={forget}
      onFocus={ask}
      onBlur={forget}
    >
      {children}
    </span>
  );
}
