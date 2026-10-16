import fc from 'fast-check';

/**
 * How many cases each property gets.
 *
 * A hundred is plenty while writing a property; the quality gate runs the same
 * properties a thousand times, which is where the awkward combinations come
 * up. Importing this file is what applies the setting, so a property test
 * starts with `import './support/property';` and nothing else.
 */
fc.configureGlobal({ numRuns: Number(process.env.FC_RUNS ?? 100) });
