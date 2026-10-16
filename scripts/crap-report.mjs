#!/usr/bin/env node
/**
 * CRAP, or "how much would this function hurt to change": a function is risky
 * when it is complicated *and* thinly covered, because the two multiply.
 *
 *   crap = complexity² × (1 − coverage)³ + complexity
 *
 * Complexity comes from the linter (one source of truth, the same number the
 * complexity rule enforces) and coverage from the merged unit + browser run.
 * Neither alone says much: three branches at 100% coverage is a friend, three
 * branches at 30% is where the next bug lives.
 *
 * Usage: node scripts/crap-report.mjs [--coverage <file>] [--lint <file>]
 *                                     [--max-crap <n>] [--max-complexity <n>]
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { ROOT, fmt, lineCoverage } from './coverage-map.mjs';

const DEFAULTS = {
  sources: 'coverage/coverage-final.json,coverage-e2e',
  lint: 'reports/oxlint-complexity.json',
  report: 'reports/crap.txt',
  maxCrap: 10,
  maxComplexity: 8,
};

function options(argv) {
  const chosen = { ...DEFAULTS };
  const names = {
    '--sources': 'sources',
    '--lint': 'lint',
    '--report': 'report',
    '--max-crap': 'maxCrap',
    '--max-complexity': 'maxComplexity',
  };

  for (let index = 0; index < argv.length; index += 2) {
    const key = names[argv[index] ?? ''];
    if (key === undefined) {
      throw new Error(`Unknown option ${argv[index] ?? ''}.`);
    }
    const value = argv[index + 1] ?? '';
    chosen[key] = typeof DEFAULTS[key] === 'number' ? Number(value) : value;
  }

  return chosen;
}

/** The linter's per-function complexity, which is what the rule enforces too. */
function complexity(diagnostics) {
  const found = [];
  const named =
    /(?:function|method|constructor|getter|setter) `([^`]+)` has a complexity of (\d+)/u;

  for (const diagnostic of diagnostics) {
    const match = named.exec(diagnostic.message);
    const span = diagnostic.labels?.[0]?.span;
    if (match === null || span === undefined) {
      continue;
    }
    found.push({
      file: fmt(resolve(diagnostic.filename)),
      name: match[1] ?? '?',
      complexity: Number(match[2] ?? 1),
      startLine: span.line,
      endOffset: span.offset + span.length,
      offset: span.offset,
    });
  }

  return found;
}

/** Which line the function ends on, counting the file the way the linter did. */
async function endLineOf(source, function_) {
  const bytes = await readFile(resolve(ROOT, source));
  const slice = bytes.subarray(function_.offset, function_.endOffset);
  return function_.startLine + (slice.toString('utf8').match(/\n/gu)?.length ?? 0);
}

/** The share of the function's own lines that anything ever reached. */
function coverageOf(entry, startLine, endLine) {
  const own = [...(entry?.instrumented ?? [])].filter(
    (line) => line >= startLine && line <= endLine,
  );
  if (own.length === 0) {
    return null;
  }
  return own.filter((line) => entry.covered.has(line)).length / own.length;
}

function crapOf(complexity_, coverage) {
  return complexity_ ** 2 * (1 - coverage) ** 3 + complexity_;
}

function row(function_) {
  const crap =
    function_.coverage === null
      ? '     ?'
      : crapOf(function_.complexity, function_.coverage).toFixed(2).padStart(6);
  const covers = function_.coverage === null ? '  ?  ' : function_.coverage.toFixed(2);
  return [
    crap,
    String(function_.complexity).padStart(5),
    covers.padStart(6),
    function_.name.padEnd(30),
    `${function_.file}:${function_.startLine}`,
  ].join('  ');
}

async function main() {
  const chosen = options(process.argv.slice(2));
  const diagnostics = JSON.parse(await readFile(resolve(ROOT, chosen.lint), 'utf8')).diagnostics;
  const statements = await lineCoverage(chosen.sources.split(','));

  if (statements.size === 0) {
    console.error(
      `No coverage in ${chosen.sources}. CRAP multiplies complexity by\n` +
        'uncovered code, so the tests have to have run before this report means anything.',
    );
    process.exitCode = 1;
    return;
  }

  const measured = [];
  for (const function_ of complexity(diagnostics)) {
    const source = resolve(ROOT, function_.file);
    const endLine = await endLineOf(function_.file, function_);
    measured.push({
      ...function_,
      coverage: coverageOf(statements.get(source), function_.startLine, endLine),
    });
  }

  measured.sort((left, right) => {
    const leftCrap = left.coverage === null ? -1 : crapOf(left.complexity, left.coverage);
    const rightCrap = right.coverage === null ? -1 : crapOf(right.complexity, right.coverage);
    return rightCrap - leftCrap || right.complexity - left.complexity;
  });

  const unmeasured = measured.filter((function_) => function_.coverage === null);
  const tooComplex = measured.filter(
    (function_) => function_.complexity > chosen.maxComplexity,
  );
  const tooRisky = measured.filter(
    (function_) =>
      function_.coverage !== null && crapOf(function_.complexity, function_.coverage) > chosen.maxCrap,
  );

  const lines = [
    `CRAP: complexity² × (1 − coverage)³ + complexity`,
    `${measured.length} functions, worst first. Bar: complexity ≤ ${chosen.maxComplexity}, CRAP ≤ ${chosen.maxCrap}.`,
    '',
    '  crap   comp  cover  function                        where',
    ...measured.slice(0, 15).map(row),
    '',
    unmeasured.length === 0
      ? 'Every function was measured.'
      : `${unmeasured.length} function(s) had no statements to measure: ${unmeasured
          .map((function_) => function_.name)
          .join(', ')}`,
    `${tooComplex.length} over the complexity bar, ${tooRisky.length} over the CRAP bar.`,
  ];

  const report = `${lines.join('\n')}\n`;
  console.log(report);
  await mkdir(dirname(resolve(ROOT, chosen.report)), { recursive: true });
  await writeFile(resolve(ROOT, chosen.report), report);

  if (tooComplex.length > 0 || tooRisky.length > 0) {
    process.exitCode = 1;
  }
}

await main();
