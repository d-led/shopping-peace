/** @jsxImportSource hono/jsx/dom */
import { render } from 'hono/jsx/dom';
import { ItemStore } from './app/item-store';
import { LocalStoragePresetRepository, starterPresets } from './data/presets';
import { LocalStorageSelectionRepository } from './data/selection';
import { App } from './ui/App';
import './style.css';

const root = document.getElementById('root');
if (root === null) {
  throw new Error('The page has no #root element to render into.');
}

const store = new ItemStore(
  new LocalStoragePresetRepository(window.localStorage),
  new LocalStorageSelectionRepository(window.localStorage),
  { starterItems: starterPresets },
);
store.load();

render(<App store={store} />, root);
