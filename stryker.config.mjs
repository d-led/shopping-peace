/**
 * Mutation testing: how much of the test suite actually notices when the code
 * changes. Coverage says a line was reached; this says a line was *checked*.
 *
 * Mutants are only made in the layers that hold decisions — the arithmetic,
 * the file format, the store, the copy. React-style components are mutated
 * mostly into things that fail to render, which teaches nothing.
 */
export default {
  packageManager: 'npm',
  testRunner: 'vitest',
  plugins: ['@stryker-mutator/vitest-runner'],
  reporters: ['clear-text', 'progress', 'html', 'json'],
  htmlReporter: { fileName: 'reports/mutation/index.html' },
  jsonReporter: { fileName: 'reports/mutation/mutation.json' },
  coverageAnalysis: 'perTest',
  mutate: [
    'src/domain/**/*.ts',
    'src/data/**/*.ts',
    'src/app/**/*.ts',
    'src/ui/copy.ts',
    // Nothing branches here: a baked-in constant and a URL.
    '!src/build.ts',
    '!src/**/*.d.ts',
    // A table of emoji and their keywords, not a decision anybody makes. Every
    // entry is a module-level constant, so mutating them means running the
    // whole suite per entry — minutes of work to learn that a test disliked it.
    '!src/data/emoji.ts',
  ],
  // A mutant of a type annotation cannot be killed by running the code, since
  // nothing runs types.
  checkers: [],
  // Stryker normally rewrites tsconfig.json inside its sandbox so that mutants
  // keep type-checking. It does that with `ts.parseConfigFileTextToJson`, which
  // TypeScript 7 no longer ships, and vitest transpiles without type-checking
  // anyway — so the rewrite is pointed at a file that is deliberately absent.
  tsconfigFile: 'tsconfig.mutants.json',
  thresholds: { high: 95, low: 85, break: 85 },
  vitest: { configFile: 'vite.config.ts' },
};
