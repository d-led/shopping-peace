/**
 * Three reading sizes for the whole app, and no more: labels and captions,
 * everything a person reads normally, and the two numbers the app exists for.
 * Each one grows on a larger screen. A picture in front of a label is not
 * reading, so it is the one thing sized separately — see `icon`.
 */
export const TEXT = {
  /** Labels, captions, units, footnotes. */
  small: 'text-sm md:text-base',
  /** Names, instructions, buttons, typed numbers. */
  body: 'text-lg md:text-2xl',
  /** The two numbers worth reading from across the kitchen. */
  display: 'text-4xl md:text-6xl',
  /** The picture in front of a label, and the mark beside a chosen thing. */
  icon: 'text-2xl md:text-3xl',
} as const;
