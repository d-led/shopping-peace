/** @jsxImportSource hono/jsx/dom */
import type { Child } from 'hono/jsx';
import { useState } from 'hono/jsx/dom';
import type { HeadlinePart } from './copy';
import { Explanation } from './Explanation';
import { Hint } from './Hint';
import { TEXT } from './text';

export interface HeadlineProps {
  /** The instruction in pieces, the figures carrying what they mean. */
  readonly parts: readonly HeadlinePart[];
}

/**
 * A number with the tick and the punctuation that belong to it, so none of them
 * can be left stranded at the start of a line: `3 ✓,` breaks nowhere inside.
 */
const FIGURE = /(\d+(?:\s*✓)?[,.;:!?]*)/u;

/**
 * The instruction, with each figure in its own little box.
 *
 * The figures are what a household acts on — the level to shop at, what to fetch,
 * how often to look — so each gets a pastel wash inside a thin rounded border,
 * faint enough to read through and strong enough to land on first. The box hugs
 * the digits (`leading-none`, no vertical padding), so a line of text is no taller
 * with the boxes than without them.
 *
 * Pointing at a figure, focusing it or tapping it explains it, and the explaining
 * happens *here* rather than under the finger: a tooltip hung off a number near
 * the edge of a phone is a tooltip half off the screen, so it is a pill above the
 * paragraph instead, absolutely placed so that nothing moves and nothing grows.
 */
export function Headline({ parts }: HeadlineProps) {
  const [asked, setAsked] = useState<string | null>(null);

  return (
    <p
      class={`relative text-center font-bold leading-snug ${TEXT.body}`}
      data-testid="headline"
    >
      {parts.map((part, index) => figuresIn(part, index, setAsked))}
      {parts.map((part, index) =>
        part.hint === undefined ? null : (
          <span key={hintId(index)} id={hintId(index)} class="sr-only">
            {part.hint}
          </span>
        ),
      )}
      <Explanation text={asked} />
    </p>
  );
}

/** The figures of one part, each boxed and each explained when the part knows how. */
function figuresIn(
  part: HeadlinePart,
  partIndex: number,
  onAsk: (hint: string | null) => void,
): Child[] {
  return part.text.split(FIGURE).map((piece, index) => {
    if (!/^\d/u.test(piece)) {
      return piece;
    }

    const box = <Figure key={index} figure={piece} />;
    return part.hint === undefined ? (
      box
    ) : (
      <Hint
        key={index}
        text={part.hint}
        onAsk={onAsk}
        describedBy={hintId(partIndex)}
      >
        {box}
      </Hint>
    );
  });
}

/** Where a part's explanation lives, for the figure that describes it. */
function hintId(partIndex: number): string {
  return `headline-hint-${partIndex}`;
}

/**
 * One figure: the number in its box, then the tick that says the level holds, then
 * whatever punctuation followed — all in one unbreakable run, because a comma at
 * the start of a line is not a sentence.
 */
function Figure({ figure }: { readonly figure: string }) {
  const [digits = ''] = figure.match(/^\d+/u) ?? [];
  const rest = figure.slice(digits.length);

  return (
    <span class="whitespace-nowrap">
      <span class="inline-block rounded-md border border-primary/30 bg-primary/10 px-1 leading-none">
        {digits}
      </span>
      {rest.includes('✓') && <span class="text-success"> ✓</span>}
      {rest.replace('✓', '').trimStart()}
    </span>
  );
}
