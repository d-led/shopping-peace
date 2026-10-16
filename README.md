# 🛒 Shopping Peace

Never run out of dish tabs again.

Households are just-in-time supply chains with worse planning. A thing is used up
at some average rate, and getting a replacement takes days — a shop run, a
delivery, a weekend where nothing is open. Shopping Peace turns those two facts
into the three numbers that actually matter, big enough to read from across the
kitchen:

| what                                        | example               |
| ------------------------------------------- | --------------------- |
| **The thing**                               | 🧴 Laundry detergent   |
| **Keep up to**                              | `2` units             |
| **Fetch more at**                           | `1` unit left         |
| Down to 1? Bring home 1 more …              | … and you're back at 2 |

## The arithmetic

Everything is measured in **days**, so nothing has to be converted by hand.

```
usageDays    how many days one unit lasts
leadDays     how many days it takes to get a replacement home
extraDays    extra days of stock kept on top of the tight level

reorderPoint  = ceil(leadDays  / usageDays)   when to start fetching again
spareUnits    = ceil(extraDays / usageDays)   whole units kept for surprises
targetStock   = reorderPoint + spareUnits     how many to keep
fetchQuantity = spareUnits                    how many to fetch at the trigger
```

Two deliberate decisions:

- **The stock level stays tight.** It is only the units that would be used up
  while a replacement is on its way — no padding blurred into it.
- **The spare is added on top**, in whole units, so the household can see which
  half is which. You cannot buy a third of a bottle, so each half is rounded up
  on its own.

## Running it

```bash
npm install
npm run dev          # http://localhost:5173, hot reload while you edit
```

| command             | what it does                                              |
| ------------------- | --------------------------------------------------------- |
| `npm run dev`       | dev server with live reload                                |
| `npm test`          | unit and component tests (Vitest + jsdom)                  |
| `npm run test:watch`| the same, watching for changes                             |
| `npm run coverage`  | unit tests with a coverage report in `coverage/`            |
| `npm run test:e2e`  | browser tests on iPhone, iPad and desktop (Playwright)      |
| `npm run typecheck` | `tsc --noEmit`                                             |
| `npm run build`     | typecheck, then build into `dist/`                         |
| `npm run preview`   | serve a build you already made                             |

`npm run test:e2e` starts its own server: Playwright builds the app and serves
`dist/` with the small dependency-free server in `tests/e2e/server.mjs`, so
there is nothing to start by hand. The first run needs the browsers once:

```bash
npx playwright install chromium webkit
```

## Where the presets live

Presets are kept in the browser's `localStorage` and written on every change —
there is no save button, and nothing is ever sent anywhere. The thing picker
exports them as a dated JSON file and reads one back in, so a household can move
them between devices or keep a copy.

## Layout

```
src/
  domain/          the arithmetic and its vocabulary — no DOM, no storage
    stock-item.ts    usageDays, leadDays, extraDays
    stock-plan.ts    planStock() -> reorderPoint, spareUnits, targetStock
  data/            the JSON file format and where presets are kept
  app/             ItemStore: the selected thing and every change, persisted
  ui/              Hono JSX components for the screen and the picker
tests/
  *.test.ts(x)     unit and component tests
  e2e/             Playwright specs, one embedded static server
```

Rules the screen follows, since it is used with wet hands:

- three text sizes for the whole app, defined in `src/ui/text.ts`;
- nothing wider than the screen — no sideways scrolling anywhere;
- the two numbers are visible without scrolling, on a 375 px phone;
- every tap target is thumb-sized, with ± buttons beside each slider for hands
  that cannot aim at a track.

## Deploying

Pressing to `main` publishes to GitHub Pages through
`.github/workflows/deploy.yml`. The build uses relative asset paths, so it works
from a project URL such as `https://<user>.github.io/<repo>/`. Enable it once
under **Settings → Pages → Source: GitHub Actions**.

## License

MIT — see [LICENSE](LICENSE).
