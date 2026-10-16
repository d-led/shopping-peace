import { execFileSync } from 'node:child_process';
import tailwindcss from '@tailwindcss/vite';
import istanbul from 'vite-plugin-istanbul';
import { defineConfig } from 'vitest/config';

/**
 * The browser tests measure an instrumented build; nothing else does.
 */
const e2eCoverage = process.env.COVERAGE_E2E === '1';

/**
 * The short commit this build came from: what CI was told, else what git says.
 * Vite bakes it into the bundle, so a deployed copy can name its own version.
 */
function commitSha(): string {
  const told = process.env.BUILD_SHA ?? '';
  if (told !== '') {
    return told.slice(0, 7);
  }
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD']).toString().trim();
  } catch {
    return 'dev';
  }
}

export default defineConfig({
  // Relative asset paths keep the built site working from any location,
  // including a GitHub Pages project URL such as /avoid-running-out-of/.
  base: './',
  // Only the instrumented build needs them, to line its counters up with src.
  build: { sourcemap: e2eCoverage },
  plugins: [
    tailwindcss(),
    // The browser tests run against an instrumented build, so what Playwright
    // covers can be counted together with what vitest covers. Off by default:
    // counters in a production bundle are dead weight.
    ...(e2eCoverage
      ? [
          istanbul({
            include: ['src/**/*.ts', 'src/**/*.tsx'],
            exclude: ['tests/**'],
            extension: ['.ts', '.tsx'],
            requireEnv: false,
            // Production builds are left alone unless the plugin is told
            // otherwise; this bundle exists purely to be measured.
            forceBuildInstrument: true,
          }),
        ]
      : []),
  ],
  define: { __BUILD_SHA__: JSON.stringify(commitSha()) },
  test: {
    environment: 'jsdom',
    environmentOptions: { jsdom: { pretendToBeVisual: true } },
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
});
