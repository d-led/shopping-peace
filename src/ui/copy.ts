import { InvalidPresetFileError } from '../data/presets-file';
import { effectiveUsageDays, type StockPlan } from '../domain/stock-plan';
import { UNNAMED_ITEM, type StockItem } from '../domain/stock-item';

/** What to call a thing on screen, even when it has not been named yet. */
export function itemName(item: StockItem): string {
  return item.name.trim() === '' ? UNNAMED_ITEM : item.name;
}

/** The name with its picture in front, which is how the shelf reads. */
export function itemLabel(item: StockItem): string {
  return item.emoji === '' ? itemName(item) : `${item.emoji} ${itemName(item)}`;
}

/** The picture a thing has, or a face to stand for having none yet. */
export function pictureOf(item: StockItem): string {
  return item.emoji === '' ? '🙂' : item.emoji;
}

/**
 * What the picture button reads. The same words are its accessible name, with
 * what pressing it does said beside them: a screen reader should hear the
 * label a household can see, not a word that is not on the button.
 */
export function pictureButtonLabel(item: StockItem): string {
  return `${pictureOf(item)} Picture`;
}

/**
 * The instruction a busy person reads from across the kitchen. With no reserve
 * nothing is added on top of the tight level, so there is no quantity to name:
 * the household is living on the lead time itself, and tops up as the shelf
 * reaches it.
 */
export function planHeadline(plan: StockPlan): string {
  if (plan.fetchQuantity === 0) {
    return `Down to ${units(plan.reorderPoint)}? Nothing is kept spare, so fetch the next unit as this one runs out.`;
  }
  return `Down to ${units(plan.reorderPoint)}? Bring home ${plan.fetchQuantity} more and you're back at ${plan.targetStock}.`;
}

/** How long a full top-up lasts — the number a household can picture. */
export function planCover(item: StockItem, plan: StockPlan): string {
  const cover = Math.round(plan.targetStock * effectiveUsageDays(item));
  return `${units(plan.targetStock)} ≈ ${cover} ${cover === 1 ? 'day' : 'days'} of cover.`;
}

/**
 * Said out loud when a thing turns before the household gets through a unit,
 * because the numbers below then count a unit shorter than its own use would.
 */
export function spoilsWarning(item: StockItem): string {
  const turns = item.freshDays === 0 ? 'at once' : `${days(item.freshDays)} after opening`;
  return `It turns ${turns}, so a unit is really gone in ${days(effectiveUsageDays(item))}, not the ${days(item.usageDays)} it takes to use up.`;
}

/** One of the two plan cards: the number, and what the number counts. */
export interface PlanCard {
  readonly value: number;
  readonly caption: string;
}

/**
 * The reserve, as the counter a household watches: the units held on top of
 * what the wait eats. Counting the reserve rather than the whole shelf is what
 * makes the fetch level below mean something.
 *
 * With no reserve there is no counter to watch, so the card falls back to the
 * tight level itself and says that nothing is kept on top of it.
 */
export function keepCard(plan: StockPlan): PlanCard {
  if (plan.spareUnits === 0) {
    return { value: plan.targetStock, caption: `${unitWord(plan.targetStock)} — nothing spare` };
  }
  return { value: plan.spareUnits, caption: `${unitWord(plan.spareUnits)} spare` };
}

/**
 * When to shop: the moment the last spare is opened. On a shelf with no reserve
 * that moment is the tight level itself, so the card counts stored units there.
 */
export function fetchCard(plan: StockPlan): PlanCard {
  return plan.spareUnits === 0
    ? { value: plan.reorderPoint, caption: `${unitWord(plan.reorderPoint)} left` }
    : { value: 0, caption: 'spare units left' };
}

/** The subtitle under each thing in the picker. */
export function itemSummary(item: StockItem): string {
  return `1 unit lasts ${days(item.usageDays)} · ${days(item.leadDays)} to fetch`;
}

/** "1 thing" / "3 things", for the export and import messages. */
export function countThings(count: number): string {
  return `${count} ${count === 1 ? 'thing' : 'things'}`;
}

/** The question before a thing disappears, naming it so there is no doubt. */
export function deleteQuestion(item: StockItem): string {
  return `Delete ${item.name.trim() === '' ? 'this thing' : itemLabel(item)}?`;
}

/** What to say when the file somebody picked was not a presets file. */
export function importFailed(error: unknown): string {
  return error instanceof InvalidPresetFileError ? error.message : 'That file could not be read.';
}

/**
 * Importing replaces the shelf, so it asks first and says what is at stake —
 * including how many things are about to be replaced.
 */
export function importQuestion(here: number, incoming: number): string {
  return `Replace the ${countThings(here)} here with the ${countThings(incoming)} in this file?`;
}

export function exportedNotice(count: number): string {
  return `Exported ${countThings(count)}.`;
}

export function importedNotice(count: number): string {
  return `Imported ${countThings(count)}.`;
}

/** Nothing to bring back is not a failure, so it gets its own sentence. */
export function restoredNotice(count: number): string {
  return count === 0
    ? 'The starter things are all here already.'
    : `Brought back ${countThings(count)}.`;
}

function days(count: number): string {
  return `${count} ${count === 1 ? 'day' : 'days'}`;
}

/** The word on its own, for captions that already have a number above them. */
function unitWord(count: number): string {
  return count === 1 ? 'unit' : 'units';
}

function units(count: number): string {
  return `${count} ${unitWord(count)}`;
}
