import { TEXT } from './text';

const TONE_RANGE = {
  primary: 'range-primary',
  secondary: 'range-secondary',
  accent: 'range-accent',
  info: 'range-info',
  success: 'range-success',
} as const;

export type SliderTone = keyof typeof TONE_RANGE;

export interface StepSliderProps {
  readonly id: string;
  readonly label: string;
  /** Singular unit, e.g. "day"; the plural is formed by adding an s. */
  readonly unit: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly tone: SliderTone;
  /** Wording for the bottom of the range, where the bare number misleads. */
  readonly minLabel?: string;
  /** Wording for the top of the range, where the bare number misleads. */
  readonly maxLabel?: string;
  /** Said on hover, for a number that needs a word with it. */
  readonly hint?: string;
  readonly onChange: (value: number) => void;
}

/**
 * A typed number, a track to sweep, and thumb-sized −/+ buttons either side.
 * Everything flows: no fixed-width pill, and nothing that can push the page
 * sideways on a narrow screen.
 */
export function StepSlider({
  id,
  label,
  unit,
  value,
  min,
  max,
  tone,
  minLabel,
  maxLabel,
  hint,
  onChange,
}: StepSliderProps) {
  // An imported preset may sit outside the usual range; widen the track rather
  // than lying about the value.
  const highest = Math.max(max, value);
  const sliderId = `${id}-slider`;
  // At the ends of the range the unit says less than the meaning does.
  const ending = value === min ? minLabel : value === max ? maxLabel : undefined;

  const commit = (wanted: number) => {
    if (!Number.isFinite(wanted)) {
      return;
    }
    const withinRange = Math.min(highest, Math.max(min, wanted));
    if (withinRange !== value) {
      onChange(withinRange);
    }
  };

  return (
    <div class="w-full min-w-0" title={hint}>
      <div class="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <label class={`min-w-0 flex-auto font-bold ${TEXT.body}`} for={id}>
          {label}
        </label>
        {/* On a narrow screen the number drops to its own line, and ms-auto
            keeps it against the right edge rather than stranded on the left. */}
        <span class="ms-auto flex shrink-0 items-center gap-1">
          <input
            id={id}
            type="number"
            inputmode="numeric"
            class={`input h-12 w-20 min-w-0 rounded-none text-center font-bold md:w-24 ${TEXT.body}`}
            min={min}
            max={highest}
            value={value}
            onInput={(event) => {
              const typed = (event.target as HTMLInputElement).value;
              if (typed !== '') {
                commit(Number(typed));
              }
            }}
          />
          <span class={`font-bold text-base-content/70 ${TEXT.small}`}>
            {ending ?? (value === 1 ? unit : `${unit}s`)}
          </span>
        </span>
      </div>
      <div class="mt-1 flex items-center gap-2 md:gap-3">
        <button
          type="button"
          class={`btn btn-circle btn-lg shrink-0 ${TEXT.body}`}
          aria-label={`Decrease ${label}`}
          onClick={() => commit(value - 1)}
        >
          −
        </button>
        <input
          id={sliderId}
          type="range"
          min={min}
          max={highest}
          step={1}
          value={value}
          // The track is a second way into the same number, so it carries the
          // same name as the label beside it: an unlabelled slider is a
          // control a screen reader announces as nothing at all.
          aria-label={label}
          class={`range range-lg min-w-0 flex-1 ${TONE_RANGE[tone]}`}
          onInput={(event) => commit(Number((event.target as HTMLInputElement).value))}
        />
        <button
          type="button"
          class={`btn btn-circle btn-lg shrink-0 ${TEXT.body}`}
          aria-label={`Increase ${label}`}
          onClick={() => commit(value + 1)}
        >
          +
        </button>
      </div>
    </div>
  );
}
