#!/usr/bin/env node
/**
 * The mutation score — or an honest "not measurable".
 *
 * Coverage says a line was reached; mutation says a change to that line was
 * noticed. It is the one measurement here that can be fooled by its own tool
 * chain, so it checks its work: if mutants that tests are *known* to cover are
 * reported as survived without a single test having run, then the score is not
 * a score, and printing it would be worse than printing nothing.
 *
 * Exit codes: 0 measured and above the bar, 1 measured and below it, 3 not
 * measurable at all.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const REPORT = 'reports/mutation/mutation.json';

async function versionOf(name) {
  const manifest = await readFile(resolve(ROOT, 'node_modules', name, 'package.json'), 'utf8');
  return JSON.parse(manifest).version;
}

async function main() {
  const argv = process.argv.slice(2);
  const breakAt = Number(argv[argv.indexOf('--break') + 1] ?? 85);

  const report = JSON.parse(await readFile(resolve(ROOT, REPORT), 'utf8'));
  const mutants = Object.values(report.files).flatMap((file) => file.mutants);
  const withStatus = (status) => mutants.filter((mutant) => mutant.status === status);

  const killed = withStatus('Killed').length + withStatus('Timeout').length;
  const survived = withStatus('Survived').length;
  const uncovered = withStatus('NoCoverage').length;

  // Mutants that were not killed although tests are known to reach them.
  const neverRan = withStatus('Survived').filter(
    (mutant) => mutant.testsCompleted === 0 && (mutant.coveredBy ?? []).length > 0,
  );

  if (neverRan.length > 0) {
    const runner = await versionOf('@stryker-mutator/vitest-runner');
    const vitest = await versionOf('vitest');
    console.error(
      [
        `${neverRan.length} of ${survived} surviving mutants had tests covering them, but`,
        'not one test was executed for them, so the score would describe the runner',
        'rather than the tests. No mutation score is reported.',
        '',
        `Blame @stryker-mutator/vitest-runner ${runner} with vitest ${vitest}. Run`,
        '`npx stryker run` by hand once the runner supports that vitest; until then',
        'the gate holds no mutation bar.',
      ].join('\n'),
    );
    process.exitCode = 3;
    return;
  }

  const score = killed + survived === 0 ? 0 : (killed / (killed + survived)) * 100;
  console.log(
    [
      `Mutation score ${score.toFixed(2)}%, bar ${breakAt}%.`,
      `${killed} killed, ${survived} survived, ${uncovered} never reached by a test.`,
      `Details: ${REPORT} and reports/mutation/index.html.`,
    ].join('\n'),
  );

  if (score < breakAt) {
    process.exitCode = 1;
  }
}

await main();
