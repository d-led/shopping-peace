import type { StockPlan } from '../domain/stock-plan';
import { RESERVE_NOTE, reserveHolding } from './copy';
import { TEXT } from './text';

export interface ReserveCardProps {
  readonly plan: StockPlan;
}

/**
 * The reserve, told apart from the shopping: stock that has to be on the shelf,
 * in the packages and single units a cupboard really holds.
 *
 * Deliberately not one of the two big numbers above — those are things to act
 * on. This one is a floor to check, so it is drawn in plain colours: no tone,
 * no display-sized figure competing with the numbers the screen exists for.
 */
export function ReserveCard({ plan }: ReserveCardProps) {
  if (plan.reserveUnits === 0) {
    return null;
  }

  return (
    <div
      class="min-w-0 rounded-2xl border-2 border-base-300 bg-base-100 p-3 md:p-4 text-center"
      data-testid="in-reserve"
    >
      <span
        class={`block font-black uppercase tracking-tight md:tracking-wide ${TEXT.small}`}
      >
        In reserve
      </span>
      <span class={`block font-bold mt-1 break-words ${TEXT.body}`}>
        {reserveHolding(plan)}
      </span>
      <span class={`block mt-1 text-base-content/70 ${TEXT.small}`}>{RESERVE_NOTE}</span>
    </div>
  );
}
