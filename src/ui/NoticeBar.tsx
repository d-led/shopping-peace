/** @jsxImportSource hono/jsx/dom */
import { TEXT } from './text';

/** Something the household should know, said once and then dismissed. */
export interface Notice {
  readonly tone: 'success' | 'error';
  readonly text: string;
}

export interface NoticeBarProps {
  readonly notice: Notice | null;
  readonly onDismiss: () => void;
}

/**
 * The line at the bottom of the screen: what just happened, in the household's
 * own words, and a way to make it go away.
 */
export function NoticeBar({ notice, onDismiss }: NoticeBarProps) {
  if (notice === null) {
    return null;
  }

  return (
    <div class="fixed inset-x-0 bottom-4 z-[200] flex justify-center px-3" role="status">
      <div
        class={`alert max-w-lg rounded-none shadow-lg ${
          notice.tone === 'error' ? 'alert-error' : 'alert-success'
        }`}
      >
        <span class={`flex-1 font-semibold ${TEXT.small}`}>{notice.text}</span>
        <button
          type="button"
          class="btn btn-sm rounded-none"
          aria-label="Dismiss"
          onClick={onDismiss}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
