/** @jsxImportSource hono/jsx/dom */
import { SOURCE_URL } from '../build';
import { TEXT } from './text';

/** The GitHub mark, drawn inline so nothing has to be fetched. */
function Octocat() {
  return (
    <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

/** A commit, as git writes it: hex, and enough of it to be unique. */
const COMMIT = /^[0-9a-f]{7,40}$/u;

export interface SourceStampProps {
  /** The short commit the bundle was built from, baked in at build time. */
  readonly sha: string;
}

/**
 * Where this came from: the source on GitHub, and which commit this copy of it
 * is. A household with a deployed copy can then say which one they are looking
 * at without opening anything.
 */
export function SourceStamp({ sha }: SourceStampProps) {
  return (
    <p
      class={`flex flex-wrap items-center justify-center gap-2 text-base-content/60 ${TEXT.small}`}
    >
      <a
        class="inline-flex items-center gap-2 underline"
        href={SOURCE_URL}
        target="_blank"
        rel="noreferrer"
        aria-label="Source on GitHub"
        title="Source on GitHub"
      >
        <Octocat />
        <span>Source on GitHub</span>
      </a>
      {COMMIT.test(sha) ? (
        <a
          class="underline"
          href={`${SOURCE_URL}/commit/${sha}`}
          target="_blank"
          rel="noreferrer"
          title={`Built from commit ${sha}`}
          data-testid="build-sha"
        >
          {sha}
        </a>
      ) : (
        <span data-testid="build-sha">{sha}</span>
      )}
    </p>
  );
}
