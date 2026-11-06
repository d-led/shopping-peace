/** @jsxImportSource hono/jsx/dom */
import { TEXT } from './text';

export interface HeadlineProps {
  /** The instruction, numbers and all, as the arithmetic words it. */
  readonly text: string;
}

/**
 * A number with the tick and the punctuation that belong to it, so none of them
 * can be left stranded at the start of a line: `3 ✓,` breaks nowhere inside.
 */
const FIGURE = /(\d+(?:\s*✓)?[,.;:!?]*)/u;

/**
 * The instruction, with its numbers sitting in their own little boxes.
 *
 * The figures are what a household acts on — the level to shop at, what to fetch,
 * how often to look — so each gets a pastel wash inside a thin rounded border,
 * faint enough to read through and strong enough to land on first. The box hugs
 * the digits (`leading-none`, no vertical padding), so a line of text is no taller
 * with the boxes than without them.
 *
 * Why the digits are found here rather than in `planHeadline`: the words have one
 * home, and this is the only place that has to know how they are painted.
 */
export function Headline({ text }: HeadlineProps) {
  return (
    <p class={`text-center font-bold leading-snug ${TEXT.body}`} data-testid="headline">
      {text
        .split(FIGURE)
        .map((piece, index) =>
          /^\d/u.test(piece) ? <Figure key={index} figure={piece} /> : piece,
        )}
    </p>
  );
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
