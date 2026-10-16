import { newId } from '../domain/ids';
import { UNNAMED_ITEM, type StockItem } from '../domain/stock-item';

/** Raised when an imported file cannot be understood. */
export class InvalidPresetFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPresetFileError';
  }
}

export function serializePresets(items: readonly StockItem[]): string {
  return JSON.stringify(items, null, 2);
}

export function exportFilename(date: Date): string {
  return `shopping-peace-presets-${date.toISOString().slice(0, 10)}.json`;
}

/**
 * Reads the export format back in. Strict about the numbers that drive the
 * maths, forgiving about a missing name or id.
 */
export function parsePresets(text: string, createId: () => string = newId): StockItem[] {
  const parsed = parseJson(text);
  if (!Array.isArray(parsed)) {
    throw new InvalidPresetFileError('This file should contain a list of presets.');
  }
  return parsed.map((entry, index) => toStockItem(entry, index, createId));
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new InvalidPresetFileError('This file is not valid JSON.');
  }
}

function toStockItem(entry: unknown, index: number, createId: () => string): StockItem {
  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    throw new InvalidPresetFileError(`Preset ${position(index)} is not an object.`);
  }
  const record = entry as Record<string, unknown>;
  return {
    id: readId(record.id, createId),
    name: readName(record.name, index),
    usageDays: readNumber(record.usageDays, index, 'usageDays', 1),
    leadDays: readNumber(record.leadDays, index, 'leadDays', 0),
    extraDays: readNumber(record.extraDays, index, 'extraDays', 0),
  };
}

function readId(value: unknown, createId: () => string): string {
  return typeof value === 'string' && value !== '' ? value : createId();
}

function readName(value: unknown, index: number): string {
  if (value === undefined || value === null) {
    return UNNAMED_ITEM;
  }
  if (typeof value !== 'string') {
    throw new InvalidPresetFileError(`Preset ${position(index)} has a name that is not text.`);
  }
  return value.trim() === '' ? UNNAMED_ITEM : value;
}

function readNumber(value: unknown, index: number, field: string, minimum: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum) {
    throw new InvalidPresetFileError(
      `Preset ${position(index)} needs ${field} to be at least ${minimum}.`,
    );
  }
  return value;
}

function position(index: number): string {
  return `#${index + 1}`;
}
