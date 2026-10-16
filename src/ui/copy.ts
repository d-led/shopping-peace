import { InvalidPresetFileError } from '../data/presets-file';
import { effectiveUsageDays, type StockPlan } from '../domain/stock-plan';
import { UNNAMED_ITEM, type StockItem } from '../domain/stock-item';

/** What to call a thing on screen, even when it has not been named yet. */
export function itemName(item: StockItem): string {
  return item.name.trim() === '' ? UNNAMED_ITEM : item.name;
}

/** The one-line instruction a busy person reads from across the kitchen. */
export function planHeadline(plan: StockPlan): string {
  return `Down to ${plan.reorderPoint}? Bring home ${plan.fetchQuantity} more and you're back at ${plan.targetStock}.`;
}

/** How long a full top-up lasts — the number a household can picture. */
export function planCover(item: StockItem, plan: StockPlan): string {
  const cover = Math.round(plan.targetStock * effectiveUsageDays(item));
  return `${units(plan.targetStock)} ≈ ${cover} ${cover === 1 ? 'day' : 'days'} of cover.`;
}

/**
 * Said out loud when a thing turns before the household gets through a unit,
 * because the numbers below then look higher than they used to.
 */
export function spoilsWarning(item: StockItem): string {
  const turns = item.freshDays === 0 ? 'at once' : `${days(item.freshDays)} after opening`;
  return `It turns ${turns}, though one unit lasts ${days(item.usageDays)} — the plan counts a unit as gone in ${days(effectiveUsageDays(item))}.`;
}

/** Says out loud how much of the shelf is spare, since the tight part is small. */
export function spareNote(plan: StockPlan): string {
  return plan.spareUnits === 0 ? 'units' : `units — ${plan.spareUnits} spare`;
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
  return `Delete ${item.name.trim() === '' ? 'this thing' : item.name}?`;
}

/** What to say when the file somebody picked was not a presets file. */
export function importFailed(error: unknown): string {
  return error instanceof InvalidPresetFileError ? error.message : 'That file could not be read.';
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

function units(count: number): string {
  return `${count} ${count === 1 ? 'unit' : 'units'}`;
}
