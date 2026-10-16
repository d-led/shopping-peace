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
    return `Down to ${units(plan.reorderPoint)}? Nothing is kept spare, so fetch ${packed(plan)} as this one runs out.`;
  }
  return `Down to ${units(plan.reorderPoint)}? Bring home ${packed(plan)} and you're back at ${plan.shelfAfterFetch}.`;
}

/**
 * How the fetching is asked for: in single units, or in whole packages when the
 * shop does not sell them one at a time. A shop will not sell three quarters of
 * a pack, and coming home with more of something that keeps is better than
 * coming home with less than the household wanted.
 */
function packed(plan: StockPlan): string {
  const { packSize, packsPerFetch, fetchQuantity } = plan;
  if (packSize === 1) {
    return fetchQuantity === 0 ? 'the next unit' : `${fetchQuantity} more`;
  }
  return packsPerFetch === 1 ? `a ${packSize}-pack` : `${packsPerFetch} packs of ${packSize}`;
}

/**
 * How long the shelf lasts once it has been topped up — the number a household
 * can picture, and the one that says how much cupboard space this needs. It
 * counts the packages, so it can be higher than the level the cards aim at.
 */
export function planCover(item: StockItem, plan: StockPlan): string {
  const cover = Math.round(plan.shelfAfterFetch * effectiveUsageDays(item));
  return `${units(plan.shelfAfterFetch)} ≈ ${cover} ${cover === 1 ? 'day' : 'days'} of cover.`;
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
  const sold = item.packSize > 1 ? ` · ${item.packSize} per pack` : '';
  return `1 unit lasts ${days(item.usageDays)} · ${days(item.leadDays)} to fetch${sold}`;
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

/** Nothing to lose is worth saying: a reset on an empty shelf loses nothing. */
export function resetNotice(discarded: number): string {
  return discarded === 0
    ? 'Back to the starter things.'
    : `Back to the starter things — ${countThings(discarded)} of yours deleted.`;
}

/**
 * A notice says its piece and goes. Three words a second is a household reading
 * over the sink rather than a novel, and the two seconds before that are for
 * noticing that something appeared at all. Nothing says less than three seconds
 * or longer than ten, however long the sentence is: a line that will not go
 * away is a line in the way.
 */
const WORDS_PER_SECOND = 3;
const NOTICING_SECONDS = 2;
const LEAST_SECONDS = 3;
const MOST_SECONDS = 10;

export function readingTime(text: string): number {
  const words = text.split(/\s+/u).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
  const seconds = Math.ceil(NOTICING_SECONDS + words / WORDS_PER_SECOND);

  return Math.min(MOST_SECONDS, Math.max(LEAST_SECONDS, seconds)) * 1000;
}

/** What a reset throws away is everything, so it asks first. */
export function resetQuestion(count: number): string {
  return `Delete all ${countThings(count)} and start again from the starter ones?`;
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
