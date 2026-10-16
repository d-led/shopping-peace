/** @jsxImportSource hono/jsx/dom */
import { useState } from 'hono/jsx/dom';
import { searchEmoji } from '../data/emoji';
import { TEXT } from './text';

/** The one emoji search field in the app, so it always has a predictable id. */
export const EMOJI_SEARCH_FIELD_ID = 'emoji-search';

export interface EmojiPickerProps {
  readonly onPick: (symbol: string) => void;
}

/**
 * A keyword search over the household emoji, for the times a household wants
 * a picture in front of a name and cannot face the keyboard of every emoji
 * there has ever been. Typing "milk" beats scrolling past every animal.
 */
export function EmojiPicker({ onPick }: EmojiPickerProps) {
  const [query, setQuery] = useState('');
  const matches = searchEmoji(query);

  return (
    <div class="flex flex-col gap-2 border border-base-300 p-2">
      <input
        id={EMOJI_SEARCH_FIELD_ID}
        type="search"
        class={`input w-full h-auto py-2 rounded-none ${TEXT.body}`}
        placeholder="soap, milk, paper…"
        aria-label="Search emoji by keyword"
        value={query}
        onInput={(event) => setQuery((event.target as HTMLInputElement).value)}
      />
      {matches.length === 0 ? (
        <p class={`text-base-content/70 ${TEXT.small}`}>
          Nothing here for “{query}” — try a plainer word.
        </p>
      ) : (
        <ul class="flex flex-wrap gap-1">
          {matches.map((option) => (
            <li key={option.symbol}>
              <button
                type="button"
                class={`btn btn-lg btn-square rounded-none ${TEXT.body}`}
                aria-label={option.keywords[0] ?? option.symbol}
                data-testid="emoji-choice"
                title={option.keywords.join(', ')}
                onClick={() => onPick(option.symbol)}
              >
                {option.symbol}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
