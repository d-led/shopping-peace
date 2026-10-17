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
 * there is nothing on the shelf but the wait itself, so there is no quantity to
 * name: the household tops up as the shelf reaches that level.
 *
 * With a reserve, the level a fetch lands on is named for what it is: a shelf
 * that still carries the whole emergency reserve, a pack's worth above the
 * floor the household asked for. A bigger pack leaves a bigger surplus, and
 * saying so out loud is what stops those extra units reading as stock that
 * appeared from nowhere.
 */
export function planHeadline(plan: StockPlan): string {
  if (plan.reserveUnits === 0) {
    return `Down to ${units(plan.reorderPoint)}? Nothing is kept spare, so fetch ${packed(plan)} as this one runs out.`;
  }
  return `Down to ${units(plan.reorderPoint)}? Bring home ${packed(plan)} and you're at a level of ${plan.shelfAfterFetch}, safe for emergencies.`;
}

/**
 * How the fetching is asked for: in single units, or in whole packages when the
 * shop does not sell them one at a time. A shop will not sell three quarters of
 * a pack, and coming home with more of something that keeps is better than
 * coming home with less than the household wanted.
 */
function packed(plan: StockPlan): string {
  const { packSize, packsPerFetch, reserveUnits } = plan;
  if (packSize === 1) {
    return reserveUnits === 0 ? 'the next unit' : `${plan.fetchQuantity} more`;
  }
  return packsPerFetch === 1 ? `a ${packSize}-pack` : `${packsPerFetch} packs of ${packSize}`;
}

/**
 * How long the shelf lasts once a fetch has landed — the number a household can
 * picture, and the one that says how much cupboard space this needs. It counts
 * the packages, so it can be higher than the reserve.
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
 * The reserve, as the counter a household watches: the units kept above what a
 * wait eats. It is not spent while an order travels — that is the whole point
 * of a reserve — so this number stays true from one fetch to the next.
 *
 * With no reserve there is no counter to watch, so the card falls back to the
 * level the shelf must not drop below and says that nothing is spare.
 */
export function keepCard(plan: StockPlan): PlanCard {
  if (plan.reserveUnits === 0) {
    return { value: plan.reorderPoint, caption: `${unitWord(plan.reorderPoint)} — nothing spare` };
  }
  return { value: plan.reserveUnits, caption: `${unitWord(plan.reserveUnits)} spare` };
}

/**
 * When to shop: the level the shelf is allowed to fall to, which is the wait
 * plus the reserve. The caption adds the two up out loud, because a household
 * counting bottles should not have to work out where the number came from.
 */
export function fetchCard(plan: StockPlan): PlanCard {
  const { reorderPoint, reserveUnits, waitUnits } = plan;
  if (reserveUnits === 0 || waitUnits === 0) {
    return { value: reorderPoint, caption: `${unitWord(reorderPoint)} left` };
  }
  return {
    value: reorderPoint,
    caption: `${reserveUnits} spare + ${waitUnits} for the wait`,
  };
}

/**
 * The reserve as it sits on the shelf, rather than as it is bought: whole
 * packs, then the units outside one. `2 packs of 10 + 3 units` is a cupboard a
 * household can look at and check; `23 units` is only a sum.
 */
export function reserveHolding(plan: StockPlan): string {
  const { packSize, reservePacks, reserveLooseUnits } = plan;
  if (packSize === 1) {
    return units(plan.reserveUnits);
  }
  if (reservePacks === 0) {
    return onTheirOwn(reserveLooseUnits);
  }
  const whole = packCount(reservePacks, packSize);
  return reserveLooseUnits === 0 ? whole : `${whole} + ${units(reserveLooseUnits)}`;
}

/**
 * What the reserve card says it means. The reserve is stock that has to be
 * there, not stock the plan spends: the two cards above count what to fetch and
 * what to keep, and this one says the kept part is a floor. Buying it back
 * after it has been used is a shop of its own, not part of the usual top-up.
 */
export const RESERVE_NOTE = 'Must be there. If it gets used, buy it back.';

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

/** Asking to replace the shelf, naming where the replacement is coming from. */
export function replaceQuestion(here: number, incoming: number, source: string): string {
  return `Replace the ${countThings(here)} here with the ${countThings(incoming)} in ${source}?`;
}

/**
 * Importing replaces the shelf, so it asks first and says what is at stake —
 * including how many things are about to be replaced.
 */
export function importQuestion(here: number, incoming: number): string {
  return replaceQuestion(here, incoming, 'this file');
}

/** The same question for a shelf that arrived in a link, which is not a file. */
export function sharedShelfQuestion(here: number, incoming: number): string {
  return replaceQuestion(here, incoming, 'this link');
}

export function exportedNotice(count: number): string {
  return `Exported ${countThings(count)}.`;
}

export function importedNotice(count: number): string {
  return `Imported ${countThings(count)}.`;
}

/** The shelf in a link has replaced what was here, which is worth saying. */
export function openedSharedShelfNotice(count: number): string {
  return `Opened the shelf in the link: ${countThings(count)}.`;
}

/**
 * A link goes to the clipboard on anything that is not a phone. The household
 * still has to be told, because copying leaves nothing on the screen to see.
 */
export function linkCopiedNotice(): string {
  return 'Link copied — paste it wherever it is going.';
}

/** No share sheet, and no clipboard either: that is worth complaining about. */
export function linkNotSharedNotice(): string {
  return 'The link could not be shared.';
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

/** "1 pack of 10", "2 packs of 10": a shop's unit, as a shelf reads it. */
function packCount(count: number, size: number): string {
  return `${count} ${count === 1 ? 'pack' : 'packs'} of ${size}`;
}

/** Units that are not inside a whole package, out on the shelf. */
function onTheirOwn(count: number): string {
  return `${units(count)} on ${count === 1 ? 'its' : 'their'} own`;
}
