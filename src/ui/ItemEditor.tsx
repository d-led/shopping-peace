import { FRESHNESS_NEVER, type StockItem, type StockRequirements } from '../domain/stock-item';
import { planStock, spoilsBeforeEmpty } from '../domain/stock-plan';
import { KpiCard } from './KpiCard';
import { StepSlider } from './StepSlider';
import { fetchCard, itemLabel, keepCard, planCover, planHeadline, spoilsWarning } from './copy';
import { TEXT } from './text';

/**
 * Slider limits: wide enough for a year's worth of a slow item, tight enough to
 * stay usable with a thumb. Every one starts where the plan starts making
 * sense — no reserve is a choice a household is allowed to make, and the
 * arithmetic has always handled it.
 */
export const LIMITS = {
  usageDays: { min: 1, max: 365 },
  leadDays: { min: 0, max: 60 },
  extraDays: { min: 0, max: 180 },
  freshDays: { min: 0, max: FRESHNESS_NEVER },
  // A case of 48 is about as big as a household buys of anything.
  packSize: { min: 1, max: 48 },
} as const;

export interface ItemEditorProps {
  readonly item: StockItem;
  readonly onChange: (id: string, requirements: Partial<StockRequirements>) => void;
  readonly onOpenThingPicker: () => void;
}

export function ItemEditor({ item, onChange, onOpenThingPicker }: ItemEditorProps) {
  const plan = planStock(item);
  const keep = keepCard(plan);
  const fetch = fetchCard(plan);

  return (
    <section class="card min-w-0 bg-base-100 shadow-xl border border-base-300 rounded-none sm:rounded-box">
      <div class="card-body min-w-0 p-4 md:p-8 gap-4 md:gap-6">
        <div class="min-w-0">
          <span class={`block font-black uppercase tracking-wider text-base-content/70 mb-1 ${TEXT.small}`}>
            The thing
          </span>
          <button
            type="button"
            class={`btn w-full h-auto min-h-16 justify-between gap-2 rounded-none px-4 py-3 normal-case shadow-sm ${TEXT.body}`}
            aria-haspopup="dialog"
            onClick={onOpenThingPicker}
          >
            <span class="block min-w-0 text-left font-bold break-words">{itemLabel(item)}</span>
            <span aria-hidden="true" class="shrink-0 opacity-60">
              ▾
            </span>
          </button>
        </div>

        <div class="grid grid-cols-2 gap-3 md:gap-4">
          <KpiCard
            tone="success"
            title="Keep at least"
            value={keep.value}
            caption={keep.caption}
            hint={
              plan.packSize > 1
                ? 'The reserve you hold on top of the wait. A pack is bigger than that, so a fetch lands you higher.'
                : 'The reserve: what you hold on top of what the wait eats up.'
            }
            testId="keep-at-least"
          />
          <KpiCard
            tone="warning"
            title="Fetch more at"
            value={fetch.value}
            caption={fetch.caption}
            hint="Shop when the last spare is opened: the wait would otherwise eat what is left."
            testId="fetch-more-at"
          />
        </div>

        <p class={`text-center font-bold leading-snug ${TEXT.body}`}>{planHeadline(plan)}</p>

        {/* One slot, one line tall either way: a thing that turns says so where
            the cover figure would otherwise sit, so a warning adds no height of
            its own. The figure itself is a nicety, and a phone screen has no
            room for niceties — it keeps that line for the warning alone. */}
        {spoilsBeforeEmpty(item) ? (
          <p
            class={`alert alert-warning rounded-none py-1 ${TEXT.small}`}
            role="alert"
            data-testid="spoil-warning"
          >
            ⏰ {spoilsWarning(item)}
          </p>
        ) : (
          <p
            class={`hidden text-center leading-tight text-base-content/70 sm:block ${TEXT.small}`}
          >
            {planCover(item, plan)}
          </p>
        )}

        <p
          class={`border-t border-base-200 pt-4 text-center font-black uppercase tracking-wide text-base-content/70 ${TEXT.small}`}
        >
          Fine-tune the parameters
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
            id="pack-size"
            tone="success"
            label="📦 Sold in packs of"
            unit="unit"
            value={item.packSize}
            min={LIMITS.packSize.min}
            max={LIMITS.packSize.max}
            minLabel="one at a time"
            // The level kept at home is about how the thing is used; this only
            // decides what a fetch brings home, since packs cannot be split.
            hint="How many units arrive in one package. Buying is counted in packs; keeping is counted in single units."
            onChange={(packSize) => onChange(item.id, { packSize })}
          />
          <StepSlider
            id="fresh-days"
            tone="info"
            label="🕐 Fresh after opening"
            unit="day"
            minLabel="spoils at once"
            maxLabel="never spoils"
            // Said on hover as well as in the banner: this is the dial that
            // makes the numbers above look wrong until you know why.
            hint={
              spoilsBeforeEmpty(item)
                ? 'It turns before a unit is used up, so the plan counts each unit as gone when it turns.'
                : 'How long it stays good once it is opened. The top of the range means it keeps.'
            }
            value={item.freshDays}
            min={LIMITS.freshDays.min}
            max={LIMITS.freshDays.max}
            onChange={(freshDays) => onChange(item.id, { freshDays })}
          />
        </div>

        <p class={`text-center text-base-content/70 ${TEXT.small}`}>
          Saved as you go · delete and rename live under the thing's name
        </p>
      </div>
    </section>
  );
}
