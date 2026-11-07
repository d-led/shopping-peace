/** @jsxImportSource hono/jsx/dom */
import { TEXT } from './text';

export interface ExplanationProps {
  /** The sum behind a figure, or `null` when nobody is asking about one. */
  readonly text: string | null;
  readonly testId?: string;
}

/**
 * The sum behind a figure, shown while a household asks about it.
 *
 * Two numbers and an operation, never a sentence: this is for a person in a
 * kitchen with one hand full, checking a figure at a glance, not for somebody
 * reading an explanation. Absolutely placed, so nothing on the screen moves and no
 * line of text grows while it is up.
 *
 * It is as wide as its words need and no wider than the phone allows: a sum that
 * does not fit on one line wraps in the middle rather than running off the edge,
 * where the half of it that says why would be the half that disappears.
 */
export function Explanation({ text, testId = 'figure-hint' }: ExplanationProps) {
  if (text === null) {
    return null;
  }

  return (
    <span
      class={`pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 text-balance rounded-lg bg-neutral px-3 py-1.5 text-neutral-content shadow-lg ${TEXT.body}`}
      data-testid={testId}
    >
      {text}
    </span>
  );
}
