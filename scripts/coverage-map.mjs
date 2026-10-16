/**
 * Line coverage, read out of istanbul maps.
 *
 * Two runners measure this app: vitest instruments the TypeScript itself, and
 * the browser measures an instrumented build. They do not agree about where a
 * statement begins — a bundler's idea of line 72 can be the line after the one
 * a reader sees — so the two cannot simply be added together. Instead:
 *
 *   - the **first** source decides which lines exist. It instruments the source
 *     exactly, so every line it names is a line somebody could cover.
 *   - **every** source may mark those lines covered. The browser never widens
 *     what counts as coverable, which is what made this number misleading: it
 *     named lines as required that no run could ever reach.
 *
 * So a line only the browser reached — a download button, say — counts as
 * covered, and a line nobody's tests reached still counts against the total.
 */
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

export const ROOT = resolve(import.meta.dirname, '..');

function fmt(path) {
  return path.replace(`${ROOT}/`, '');
}

/** Every coverage map in a directory, or the one file if a file is named. */
export async function coverageFiles(...sources) {
  const found = [];

  for (const source of sources) {
    const path = resolve(ROOT, source);
    if (path.endsWith('.json')) {
      found.push(path);
      continue;
    }
    const entries = await readdir(path).catch(() => []);
    found.push(...entries.filter((name) => name.endsWith('.json')).map((name) => `${path}/${name}`));
  }

  return found;
}

/**
 * Which lines of which source files exist, and which of them anything ever ran.
 * Returns one entry per source file, keyed by absolute path.
 */
export async function lineCoverage(sources) {
  const [reference, ...runners] = sources;
  const files = new Map();

  for (const path of await coverageFiles(reference)) {
    const map = JSON.parse(await readFile(path, 'utf8'));

    for (const [file, data] of Object.entries(map)) {
      if (file.startsWith(`${ROOT}/src/`)) {
        collectReference(entryFor(files, file), data);
      }
    }
  }

  for (const path of await coverageFiles(...runners)) {
    const map = JSON.parse(await readFile(path, 'utf8'));

    for (const [file, data] of Object.entries(map)) {
      const entry = files.get(file);
      if (entry !== undefined) {
        collectCoverage(entry, data);
      }
    }
  }

  return files;
}

function entryFor(files, file) {
  const entry = files.get(file) ?? { instrumented: new Set(), covered: new Set() };
  files.set(file, entry);
  return entry;
}

/** The reference run: it decides which lines exist, and what it reached. */
function collectReference(entry, data) {
  for (const [id, span] of Object.entries(data.statementMap ?? {})) {
    entry.instrumented.add(span.start.line);
    collectCoverage(entry, data, [id, span]);
  }
}

/**
 * Any other run: it can only ever add coverage. A statement counts on the line
 * it starts on — its span often runs to the end of the enclosing body, which
 * would make every line inside it look covered.
 */
function collectCoverage(entry, data, only) {
  const statements = only === undefined ? Object.entries(data.statementMap ?? {}) : [only];

  for (const [id, span] of statements) {
    if ((data.s?.[id] ?? 0) > 0) {
      entry.covered.add(span.start.line);
    }
  }
}

export { fmt };

/** Lines that have to be covered, and how many of them anything did cover. */
export function tally(entry) {
  const covered = [...entry.instrumented].filter((line) => entry.covered.has(line)).length;
  return { covered, instrumented: entry.instrumented.size };
}

/** The share of lines anything ran, for one file or all of them together. */
export function share(entry) {
  const { covered, instrumented } = tally(entry);
  return instrumented === 0 ? 1 : covered / instrumented;
}
