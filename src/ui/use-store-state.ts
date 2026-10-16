import { useSyncExternalStore } from 'hono/jsx/dom';
import type { ItemStore, ItemStoreState } from '../app/item-store';

/**
 * Re-renders the calling component whenever the store changes, and catches up
 * with anything that changed before the subscription was installed.
 */
export function useStoreState(store: ItemStore): ItemStoreState {
  return useSyncExternalStore(store.subscribe, store.getState);
}
