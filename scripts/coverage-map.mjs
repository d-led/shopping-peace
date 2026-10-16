/**
 * Line coverage, read out of istanbul maps.
 *
 * Two runners measure this app: vitest instruments the TypeScript directly,
 * the browser measures an instrumented build. They rarely agree on what a
 * "statement" is, so adding their counters up would quietly distort the
 * percentages. Lines are the one unit both can be trusted on: a line was
 * reached or it was not, whoever was watching.
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
 * Which lines of which files exist, and which of them anything ever ran.
 * Returns one entry per source file, keyed by absolute path.
 */
export async function lineCoverage(sources) {
  const files = new Map();

  for (const path of await coverageFiles(...sources)) {
    const map = JSON.parse(await readFile(path, 'utf8'));

    for (const [file, data] of Object.entries(map)) {
      if (file.startsWith(`${ROOT}/src/`)) {
        collect(files, file, data);
      }
    }
  }

  return files;
}

/** Adds one file's statements to the running picture of what was reached. */
function collect(files, file, data) {
  const entry = files.get(file) ?? { instrumented: new Set(), covered: new Set() };
  files.set(file, entry);

  // A statement counts on the line it starts on. Its span often runs to the
  // end of the enclosing body, which would make every line look covered.
  for (const [id, span] of Object.entries(data.statementMap ?? {})) {
    const line = span.start.line;
    entry.instrumented.add(line);
    if ((data.s?.[id] ?? 0) > 0) {
      entry.covered.add(line);
    }
  }
}

export { fmt };

/** The share of lines anything ran, for one file or all of them together. */
export function share(entry) {
  return entry.instrumented.size === 0 ? 1 : entry.covered.size / entry.instrumented.size;
}
