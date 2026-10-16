import { newId } from '../domain/ids';
import { FRESHNESS_NEVER, UNNAMED_ITEM, type StockItem } from '../domain/stock-item';

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
  return `shopping-peace-presets-${day(date)}.json`;
}

/**
 * A file holding one thing, named after it: a household exporting a single
 * preset should be able to tell it apart from the whole shelf. The contents are
 * a list either way, so import does not care which one it is given.
 */
export function onePresetFilename(name: string, date: Date): string {
  return `shopping-peace-${slugOf(name)}-${day(date)}.json`;
}

function day(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** A filename-safe version of a name, or "preset" when nothing survives. */
function slugOf(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '');
  return slug === '' ? 'preset' : slug.slice(0, 40);
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
  if (!isRecord(entry)) {
    throw new InvalidPresetFileError(`Preset ${position(index)} is not an object.`);
  }
  const where = `Preset ${position(index)}`;
  return {
    id: readId(entry.id, createId),
    name: readName(entry.name, where),
    usageDays: readNumber(entry.usageDays, where, 'usageDays', 1),
    leadDays: readNumber(entry.leadDays, where, 'leadDays', 0),
    extraDays: readNumber(entry.extraDays, where, 'extraDays', 0),
    // Files written before the freshness slider existed mean "never spoils".
    freshDays: readNumber(entry.freshDays ?? FRESHNESS_NEVER, where, 'freshDays', 0),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readId(value: unknown, createId: () => string): string {
  return typeof value === 'string' && value !== '' ? value : createId();
}

function readName(value: unknown, where: string): string {
  if (value === undefined || value === null) {
    return UNNAMED_ITEM;
  }
  if (typeof value !== 'string') {
    throw new InvalidPresetFileError(`${where} has a name that is not text.`);
  }
  return value.trim() === '' ? UNNAMED_ITEM : value;
}

function readNumber(value: unknown, where: string, field: string, minimum: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum) {
    throw new InvalidPresetFileError(`${where} needs ${field} to be at least ${minimum}.`);
  }
  return value;
}

function position(index: number): string {
  return `#${index + 1}`;
}
