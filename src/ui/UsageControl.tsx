/** @jsxImportSource hono/jsx/dom */
import { useState } from 'hono/jsx/dom';
import type { StockItem, StockRequirements } from '../domain/stock-item';
import { LIMITS } from './limits';
import { StepSlider } from './StepSlider';
import { TEXT } from './text';

/** The two ways a household says how fast a thing goes. */
type Framing = 'perUnit' | 'perDay';

/** Which framing the household asked for, and which thing they asked it for. */
interface Choice {
  readonly forId: string;
  readonly framing: Framing;
}

export interface UsageControlProps {
  readonly item: StockItem;
  readonly onChange: (patch: Partial<StockRequirements>) => void;
}

/**
 * "How fast does this go?", asked the way a household thinks about it: a bottle
 * lasts a month, tablets go two a day. Both are the same rate — the pair of
 * whole numbers the store keeps — and the toggle only decides which half of it
 * is on the screen. One a day is the shared edge of the two framings, so
 * nothing the household can say falls between them.
 *
 * Neither framing is kept anywhere. A stored mode would be a second thing able
 * to disagree with the rate; here the rate decides, and the toggle is only the
 * household's answer to "how would you like to say it".
 */
export function UsageControl({ item, onChange }: UsageControlProps) {
  // The choice is kept with the thing it was made for. Another thing then falls
  // back to the framing its own rate fits, with nothing to reset and no effect
  // in the way — the answer for the last thing cannot leak into this one.
  const [chosen, setChosen] = useState<Choice>({ forId: item.id, framing: framingOf(item) });
  const framing = chosen.forId === item.id ? chosen.framing : framingOf(item);
  const choose = (next: Framing) => setChosen({ forId: item.id, framing: next });

  return (
    <div class="flex flex-col gap-1">
      <div class="join self-start" role="group" aria-label="How to say how fast it is used">
        <FramingButton
          label="days each"
          pressed={framing === 'perUnit'}
          onClick={() => choose('perUnit')}
        />
        <FramingButton
          label="a day"
          pressed={framing === 'perDay'}
          onClick={() => choose('perDay')}
        />
      </div>
      {framing === 'perUnit' ? (
        <StepSlider
          id="usage-days"
          tone="primary"
          label="🗓️ One unit lasts"
          unit="day"
          value={within(item.usageDays / item.usageUnits, LIMITS.usageDays)}
          min={LIMITS.usageDays.min}
          max={LIMITS.usageDays.max}
          onChange={(usageDays) => onChange({ usageUnits: 1, usageDays })}
        />
      ) : (
        <StepSlider
          id="usage-a-day"
          tone="primary"
          label="⚡ Used"
          unit="a day"
          unitPlural="a day"
          value={within(item.usageUnits / item.usageDays, LIMITS.usagePerDay)}
          min={LIMITS.usagePerDay.min}
          max={LIMITS.usagePerDay.max}
          onChange={(usageUnits) => onChange({ usageUnits, usageDays: 1 })}
        />
      )}
    </div>
  );
}

interface FramingButtonProps {
  readonly label: string;
  readonly pressed: boolean;
  readonly onClick: () => void;
}

/** One half of the toggle: the words that finish "one unit lasts …" or "… a day". */
function FramingButton({ label, pressed, onClick }: FramingButtonProps) {
  return (
    <button
      type="button"
      class={`btn btn-sm join-item rounded-none ${pressed ? 'btn-primary' : 'btn-outline'} ${TEXT.small}`}
      aria-pressed={String(pressed)}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

/** The framing a rate already fits: quicker than a unit a day reads as "a day". */
function framingOf(item: StockItem): Framing {
  return item.usageUnits > item.usageDays ? 'perDay' : 'perUnit';
}

/**
 * The number the control can show for a rate. A rate from a file may sit
 * outside what a thumb can reach; the nearest number the track holds is also
 * the one the control would store, so what is on screen is never a promise the
 * next touch does not keep.
 */
function within(value: number, limit: { readonly min: number; readonly max: number }): number {
  return Math.min(limit.max, Math.max(limit.min, Math.round(value * 10) / 10));
}
