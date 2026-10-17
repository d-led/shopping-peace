import { newId } from '../domain/ids';
import { FRESHNESS_NEVER, UNNAMED_ITEM, type StockItem } from '../domain/stock-item';
import { splitEmoji } from './emoji';

/** Raised when an imported file cannot be understood. */
export class InvalidPresetFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPresetFileError';
  }
}

/** What an export calls itself, so a file can be recognised for what it is. */
export const PRESET_FILE_FORMAT = 'shopping-peace';

/**
 * The version of the format, raised when the shape changes in a way that older
 * copies of the app could not read. A file from a newer version is refused
 * with an explanation rather than half-read.
 */
export const PRESET_FILE_VERSION = 1;

/** An export: the things, and enough about the file to place it. */
export interface PresetFile {
  readonly format: typeof PRESET_FILE_FORMAT;
  readonly version: number;
  /** When it was written, so a household with three copies can tell them apart. */
  readonly exported: string;
  /**
   * The thing that was open when this was written, by id, so a shelf that
   * travels — as a file, or as a link — opens where the sender left it. Left
   * out rather than written as null, and read back as nothing when the shelf
   * no longer holds it.
   */
  readonly selected?: string;
  readonly things: readonly StockItem[];
}

/**
 * What an export holds, once it has been read: the things, and the one that was
 * open. A file on disk and a share link carry the same export, so they are read
 * by the same code and refused for the same reasons.
 */
export interface PresetShelf {
  readonly things: StockItem[];
  /** The open thing, or null when the export names none the shelf still has. */
  readonly selected: string | null;
}

/** The export as an object: what gets written out, indented or compact. */
export function presetFile(
  items: readonly StockItem[],
  exportedAt: Date,
  selected: string | null = null,
): PresetFile {
  return {
    format: PRESET_FILE_FORMAT,
    version: PRESET_FILE_VERSION,
    exported: exportedAt.toISOString(),
    ...(selected === null ? {} : { selected }),
    things: items,
  };
}

/** The export as a file: indented, because a household may open it and read it. */
export function serializePresets(
  items: readonly StockItem[],
  exportedAt: Date = new Date(),
  selected: string | null = null,
): string {
  return JSON.stringify(presetFile(items, exportedAt, selected), null, 2);
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
 * Reads the export format back in: strict about the numbers that drive the
 * maths, forgiving about a missing name, emoji or id. Files written before the
 * format was versioned — a bare list of things — are still read.
 */
export function parsePresetFile(text: string, createId: () => string = newId): PresetShelf {
  const parsed = parseJson(text);
  const things = thingsIn(parsed).map((entry, index) => toStockItem(entry, index, createId));
  return { things, selected: selectedIn(parsed, things) };
}

/** Just the things, for the callers with nothing to do with which one was open. */
export function parsePresets(text: string, createId: () => string = newId): StockItem[] {
  return parsePresetFile(text, createId).things;
}

/**
 * The open thing, when the export names one that is really on the shelf. A
 * missing, stale or unreadable id reads the same as none at all: the shelf
 * still opens, on whatever the app would have opened anyway.
 */
function selectedIn(parsed: unknown, things: readonly StockItem[]): string | null {
  if (!isRecord(parsed)) {
    return null;
  }
  const wanted = parsed.selected;
  if (typeof wanted !== 'string') {
    return null;
  }
  return things.some((item) => item.id === wanted) ? wanted : null;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new InvalidPresetFileError('This file is not valid JSON.');
  }
}

/** The things in a file, from either shape the format has ever had. */
function thingsIn(parsed: unknown): readonly unknown[] {
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (!isRecord(parsed)) {
    throw new InvalidPresetFileError('This file should contain a list of presets.');
  }
  checkVersion(parsed.version);
  if (!Array.isArray(parsed.things)) {
    throw new InvalidPresetFileError('This file should contain a list of presets.');
  }
  return parsed.things;
}

function checkVersion(version: unknown): void {
  if (typeof version !== 'number') {
    throw new InvalidPresetFileError(
      `This file has no version, so it cannot be read as a ${PRESET_FILE_FORMAT} file.`,
    );
  }
  if (version > PRESET_FILE_VERSION) {
    throw new InvalidPresetFileError(
      `This file was written by a newer Shopping Peace (version ${version}; this copy reads ${PRESET_FILE_VERSION}).`,
    );
  }
}

function toStockItem(entry: unknown, index: number, createId: () => string): StockItem {
  if (!isRecord(entry)) {
    throw new InvalidPresetFileError(`Preset ${position(index)} is not an object.`);
  }
  const where = `Preset ${position(index)}`;
  const named = nameAndEmoji(entry, where);
  return {
    id: readId(entry.id, createId),
    name: named.name,
    emoji: named.emoji,
    usageDays: readNumber(entry.usageDays, where, 'usageDays', 1),
    leadDays: readNumber(entry.leadDays, where, 'leadDays', 0),
    extraDays: readNumber(entry.extraDays, where, 'extraDays', 0),
    // Files written before the freshness slider existed mean "never spoils".
    freshDays: readNumber(entry.freshDays ?? FRESHNESS_NEVER, where, 'freshDays', 0),
    // Files written before packs were a thing mean "sold one at a time".
    packSize: readNumber(entry.packSize ?? 1, where, 'packSize', 1),
  };
}

/**
 * The name and the picture beside it. The picture has had a field of its own
 * since version 1; a file that does not mention one kept the emoji inside the
 * text, and that is the one place the two are pulled apart.
 */
function nameAndEmoji(
  entry: Record<string, unknown>,
  where: string,
): { name: string; emoji: string } {
  const written = readOptionalText(entry.name, where, 'name');
  const named =
    'emoji' in entry
      ? { name: written, emoji: readOptionalText(entry.emoji, where, 'emoji') }
      : splitEmoji(written);

  return { name: named.name.trim() === '' ? UNNAMED_ITEM : named.name, emoji: named.emoji };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readId(value: unknown, createId: () => string): string {
  return typeof value === 'string' && value !== '' ? value : createId();
}

/** Text that may be missing, but has to be text when it is there. */
function readOptionalText(value: unknown, where: string, field: string): string {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value !== 'string') {
    throw new InvalidPresetFileError(`${where}: ${field} is not text.`);
  }
  return value;
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
