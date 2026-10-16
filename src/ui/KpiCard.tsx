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
  readonly testId: string;
}

/** A solid, high-contrast box that stays readable from a step back. */
export function KpiCard({ tone, title, value, caption, testId }: KpiCardProps) {
  return (
    <div class={`min-w-0 rounded-2xl border-2 p-3 md:p-4 text-center ${TONE_CARD[tone]}`}>
      <span
        class={`block font-black uppercase tracking-tight md:tracking-wide opacity-75 break-words ${TEXT.small}`}
      >
        {title}
      </span>
      <span
        class={`block font-black leading-none mt-1 md:mt-2 ${TEXT.display}`}
        data-testid={testId}
      >
        {value}
      </span>
      <span class={`block font-semibold opacity-80 mt-1 break-words ${TEXT.small}`}>
        {caption}
      </span>
    </div>
  );
}
