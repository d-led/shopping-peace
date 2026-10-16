import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { test as base } from '@playwright/test';

/** Where the raw browser coverage lands, one file per test. */
const RAW_COVERAGE_DIR = 'coverage-e2e';

const SOURCES = `${process.cwd()}/src/`;

/**
 * The instrumented build reports source files by absolute path, the same way
 * vitest does, so the two can simply be merged. Anything outside `src/` — the
 * test helpers, say — is not what is being measured.
 */
function onlySources(coverage: Record<string, unknown>): Record<string, unknown> {
  const kept: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(coverage)) {
    const path = resolve(key.split('?')[0] ?? '');
    if (path.startsWith(SOURCES)) {
      kept[path] = value;
    }
  }

  return kept;
}

/**
 * The usual Playwright `test`, plus the coverage the browser just collected for
 * the instrumented build. Two runners cover this app — vitest in the unit
 * tests, a real browser in these — and a line is only genuinely uncovered when
 * neither has been near it.
 */
export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    await use(page);

    if (process.env.COVERAGE_E2E !== '1') {
      return;
    }

    const collected = await page.evaluate(
      () => (globalThis as { __coverage__?: Record<string, unknown> }).__coverage__ ?? null,
    );
    if (collected === null) {
      return;
    }

    await mkdir(RAW_COVERAGE_DIR, { recursive: true });
    const label = `${testInfo.workerIndex}-${testInfo.title}`.replace(/[^\w.-]+/gu, '-');
    await writeFile(
      join(RAW_COVERAGE_DIR, `${label}.json`),
      JSON.stringify(onlySources(collected)),
    );
  },
});

export { expect } from '@playwright/test';
