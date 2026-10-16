import type { StockItem } from '../domain/stock-item';
import { UNNAMED_ITEM } from '../domain/stock-item';
import type { StockPlan } from '../domain/stock-plan';

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
  const days = Math.round(plan.targetStock * item.usageDays);
  return `${units(plan.targetStock)} ≈ ${days} ${days === 1 ? 'day' : 'days'} of cover.`;
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

function days(count: number): string {
  return `${count} ${count === 1 ? 'day' : 'days'}`;
}

function units(count: number): string {
  return `${count} ${count === 1 ? 'unit' : 'units'}`;
}
