import { useState } from 'hono/jsx/dom';
import { Explanation } from './Explanation';
import { Hint } from './Hint';
import { TEXT } from './text';

const TONE_CARD = {
  warning: 'bg-warning text-warning-content border-warning',
  success: 'bg-success text-success-content border-success',
} as const;

export type KpiTone = keyof typeof TONE_CARD;

export interface KpiCardProps {
  readonly tone: KpiTone;
  readonly title: string;
  readonly value: number;
  readonly caption: string;
  /** The sum the figure came from, for a pointer that rests on it. */
  readonly hint?: string;
  readonly testId: string;
}

/**
 * A solid, high-contrast box that stays readable from a step back.
 *
 * The caption underneath says what the number counts, which is usually the whole
 * of the explanation. A figure the plan *worked out* can also carry its sum, said
 * on the number itself and only when it is asked for: the cards that already
 * explain themselves in their caption need none, and get none.
 */
export function KpiCard({ tone, title, value, caption, hint, testId }: KpiCardProps) {
  const [asked, setAsked] = useState<string | null>(null);

  return (
    <div
      class={`relative min-w-0 rounded-2xl border-2 p-3 md:p-4 text-center ${TONE_CARD[tone]}`}
    >
      <span
        class={`block font-black uppercase tracking-tight md:tracking-wide break-words ${TEXT.small}`}
      >
        {title}
      </span>
      <span
        class={`block font-black leading-none mt-1 md:mt-2 ${TEXT.display}`}
        data-testid={testId}
      >
        {hint === undefined ? value : <Hint text={hint} onAsk={setAsked}>{value}</Hint>}
      </span>
      <span class={`block font-semibold mt-1 break-words ${TEXT.small}`}>
        {caption}
      </span>
      <Explanation text={asked} testId="card-hint" />
    </div>
  );
}
