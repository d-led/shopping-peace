#!/usr/bin/env node
/**
 * What the unit tests and the browser tests covered together.
 *
 * Neither run tells the whole story on its own: the unit tests never open a
 * picker, and the browser tests never poke at an edge case in the arithmetic.
 * A line counts as covered when either of them reached it.
 *
 * Usage: node scripts/coverage-report.mjs [--min-lines 95] [--sources a,b]
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ROOT, fmt, lineCoverage, share } from './coverage-map.mjs';

const DEFAULTS = {
  'min-lines': 90,
  sources: 'coverage/coverage-final.json,coverage-e2e',
  report: 'reports/coverage.txt',
};

function options(argv) {
  const chosen = { ...DEFAULTS };
  for (let index = 0; index < argv.length; index += 2) {
    const key = (argv[index] ?? '').replace(/^--/u, '');
    if (!(key in chosen)) {
      throw new Error(`Unknown option ${argv[index] ?? ''}.`);
    }
    chosen[key] = key === 'min-lines' ? Number(argv[index + 1]) : argv[index + 1];
  }
  return chosen;
}

async function main() {
  const chosen = options(process.argv.slice(2));
  const sources = chosen.sources.split(',');
  const files = await lineCoverage(sources);

  const perFile = [...files.entries()]
    .map(([path, entry]) => ({ path: fmt(path), ...entry, share: share(entry) }))
    .sort((left, right) => left.share - right.share);

  const all = { instrumented: new Set(), covered: new Set() };
  for (const entry of files.values()) {
    for (const line of entry.instrumented) all.instrumented.add(`${entry}:${line}`);
    for (const line of entry.covered) all.covered.add(`${entry}:${line}`);
  }

  const total = share(all);
  const lines = [
    `Coverage of src/, unit tests and browser tests together (${sources.join(' + ')})`,
    '',
    ...perFile.map(
      (file) =>
        `  ${(file.share * 100).toFixed(1).padStart(5)}%  ${String(file.covered.size).padStart(4)}/${String(file.instrumented.size).padEnd(4)} lines  ${file.path}`,
    ),
    '',
    `Total: ${(total * 100).toFixed(2)}% of ${all.instrumented.size} lines, bar ${chosen['min-lines']}%.`,
  ];

  const report = `${lines.join('\n')}\n`;
  console.log(report);
  await mkdir(resolve(ROOT, 'reports'), { recursive: true });
  await writeFile(resolve(ROOT, chosen.report), report);

  if (total * 100 < chosen['min-lines']) {
    process.exitCode = 1;
  }
}

await main();
