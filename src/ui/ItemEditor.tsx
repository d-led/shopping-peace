import { FRESHNESS_NEVER, type StockItem, type StockRequirements } from '../domain/stock-item';
import { planStock, spoilsBeforeEmpty } from '../domain/stock-plan';
import { KpiCard } from './KpiCard';
import { StepSlider } from './StepSlider';
import { itemName, planCover, planHeadline, spareNote, spoilsWarning } from './plan-copy';
import { TEXT } from './text';

/** Slider limits: wide enough for a year's worth of a slow item, tight enough
 *  to stay usable with a thumb. */
export const LIMITS = {
  usageDays: { min: 1, max: 365 },
  leadDays: { min: 0, max: 60 },
  extraDays: { min: 1, max: 180 },
  freshDays: { min: 0, max: FRESHNESS_NEVER },
} as const;

export interface ItemEditorProps {
  readonly item: StockItem;
  readonly onChange: (id: string, requirements: Partial<StockRequirements>) => void;
  readonly onOpenThingPicker: () => void;
}

export function ItemEditor({ item, onChange, onOpenThingPicker }: ItemEditorProps) {
  const plan = planStock(item);

  return (
    <section class="card min-w-0 bg-base-100 shadow-xl border border-base-300">
      <div class="card-body min-w-0 p-4 md:p-8 gap-4 md:gap-6">
        <div class="min-w-0">
          <span class={`block font-black uppercase tracking-wider text-base-content/60 mb-1 ${TEXT.small}`}>
            The thing
          </span>
          <button
            type="button"
            class={`btn w-full h-auto min-h-16 justify-between gap-2 rounded-none px-4 py-3 normal-case shadow-sm ${TEXT.body}`}
            aria-haspopup="dialog"
            onClick={onOpenThingPicker}
          >
            <span class="block min-w-0 text-left font-bold break-words">{itemName(item)}</span>
            <span aria-hidden="true" class="shrink-0 opacity-60">
              ▾
            </span>
          </button>
        </div>

        {spoilsBeforeEmpty(item) && (
          <p
            class={`alert alert-warning rounded-none ${TEXT.small}`}
            role="alert"
            data-testid="spoil-warning"
          >
            ⏰ {spoilsWarning(item)}
          </p>
        )}

        <div class="grid grid-cols-2 gap-3 md:gap-4">
          <KpiCard
            tone="success"
            title="Keep at least"
            value={plan.targetStock}
            caption={spareNote(plan)}
            testId="target-stock"
          />
          <KpiCard
            tone="warning"
            title="Fetch more at"
            value={plan.reorderPoint}
            caption="stored units left"
            testId="reorder-point"
          />
        </div>

        <p class={`text-center font-bold leading-snug ${TEXT.body}`}>{planHeadline(plan)}</p>
        <p class={`text-center text-base-content/60 ${TEXT.small}`}>{planCover(item, plan)}</p>

        <p
          class={`border-t border-base-200 pt-4 text-center font-black uppercase tracking-wide text-base-content/40 ${TEXT.small}`}
        >
          Fine-tune the uncertainties
        </p>

        <div class="flex flex-col gap-6">
          <StepSlider
            id="usage-days"
            tone="primary"
            label="🗓️ One unit lasts"
            unit="day"
            value={item.usageDays}
            min={LIMITS.usageDays.min}
            max={LIMITS.usageDays.max}
            onChange={(usageDays) => onChange(item.id, { usageDays })}
          />
          <StepSlider
            id="lead-days"
            tone="secondary"
            label="🚚 Fetch takes"
            unit="day"
            value={item.leadDays}
            min={LIMITS.leadDays.min}
            max={LIMITS.leadDays.max}
            onChange={(leadDays) => onChange(item.id, { leadDays })}
          />
          <StepSlider
            id="extra-days"
            tone="accent"
            label="🛡️ Emergency days reserve"
            unit="day"
            value={item.extraDays}
            min={LIMITS.extraDays.min}
            max={LIMITS.extraDays.max}
            onChange={(extraDays) => onChange(item.id, { extraDays })}
          />
          <StepSlider
            id="fresh-days"
            tone="info"
            label="🕐 Fresh after opening"
            unit="day"
            minLabel="spoils at once"
            maxLabel="never spoils"
            value={item.freshDays}
            min={LIMITS.freshDays.min}
            max={LIMITS.freshDays.max}
            onChange={(freshDays) => onChange(item.id, { freshDays })}
          />
        </div>

        <p class={`text-center text-base-content/50 ${TEXT.small}`}>
          Saved as you go · delete and rename live under the thing's name
        </p>
      </div>
    </section>
  );
}
