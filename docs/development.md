# Development

Node 22 or newer (`engines` in `package.json`; CI runs 24). Nothing else has to
be installed to work on the app.

```bash
npm install
npm run dev          # http://localhost:5173, hot reload while you edit
```

The first browser-test run also needs the browsers once:

```bash
npx playwright install chromium webkit
```

## Commands

| command | what it does |
| ------- | ------------ |
| `npm run dev` | dev server with live reload |
| `npm run build` | typecheck, then build into `dist/` |
| `npm run preview` | serve a build you already made |
| `npm test` | unit and component tests (Vitest + jsdom) |
| `npm run test:watch` | the same, watching for changes |
| `npm run test:properties` | the fast-check properties, 1000 runs each |
| `npm run coverage` | unit tests with a coverage report in `coverage/` |
| `npm run coverage:all` | unit and browser line counts together, with the bar |
| `npm run crap` | complexity × coverage, per function |
| `npm run duplicates` | jscpd over `src/` and `tests/` |
| `npm run test:e2e` | browser tests: the phone screens, then the desktop |
| `npm run build:catalogue` | regenerate the emoji set from emojilib |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run gate` | the quality gate, the everyday half of it |
| `npm run gate:full` | the quality gate, slow stages included |
| `npm run mutation` | Stryker — see [the gate](quality-gate.md) for why it is not a stage |

`npm run test:e2e` starts its own server: Playwright builds the app and serves
`dist/` with the small dependency-free server in `tests/e2e/server.mjs` on port
4173, so there is nothing to start by hand.

## What the tests are

- `tests/*.test.ts(x)` — unit and component tests, close to the module they
  describe. The arithmetic, the file format, the store and the copy are tested
  through their own behaviour; the components are rendered with jsdom and read
  the way a household would.
- `tests/*.properties.test.ts` — fast-check properties over any household's
  numbers, run at 1000 cases by `npm run test:properties` and by the gate. They
  are what say "for every lead time, the wait is enough" rather than naming one.
- `tests/e2e/` — five Playwright specs, 74 tests in all, across three projects.
  `main-screen` and `touch` run on `iphone-mini` and `ipad-mini` as well as the
  desktop; `things`, `accessibility` and `sharing` load the same page at any
  width, so they run on the desktop alone. `tests/e2e/support/` holds the fixture
  the specs start from, and the coverage extension that hands each test's
  `__coverage__` back.

Two details that are easy to trip over:

- jsdom is configured with `pretendToBeVisual`, because Hono's JSX (and the
  focus-on-the-name behaviour) needs `requestAnimationFrame` to exist.
- the browser coverage build is instrumented by `vite-plugin-istanbul` only when
  `COVERAGE_E2E=1`, which the gate's coverage stage sets. A production build
  carries no counters.

## Layout

```
quality-gate.sh        the local gate: the stages, what each costs, and its bar
package.json           the scripts above, and the toolchain
tsconfig.json          strict, noUncheckedIndexedAccess, no implicit any
vite.config.ts         Vite + Tailwind + daisyUI, `base: './'`, the commit baked in
playwright.config.ts   three projects, and the server the browser tests start
stryker.config.mjs     which code gets mutated, and how much has to die
.jscpd.json            what counts as a duplicate, and how much is too much
scripts/
  coverage-report.mjs        unit + browser line coverage, with a bar
  coverage-map.mjs           reads the two istanbul maps into one line set
  crap-report.mjs            complexity × coverage, per function
  mutation-report.mjs        reads what stryker left behind
  build-emoji-catalogue.mjs  the emoji set, from emojilib's data (MIT)
src/
  domain/          the arithmetic and its vocabulary — no DOM, no storage
    stock-item.ts    usageDays, leadDays, extraDays, freshDays, packSize
    stock-plan.ts    planStock() -> the plan, and the effective lifespan
    ids.ts           ids for things added, imported or shared without one
  data/            the file format, where presets are kept, share links, emoji
  app/             ItemStore: the selected thing and every change, persisted
  ui/              Hono JSX components, the screen's copy, the sizing rules
  build.ts         the commit this copy was built from
  style.css        Tailwind + daisyUI, and the theme fixes the contrast rule forced
tests/
  *.test.ts(x)     unit and component tests, property tests among them
  support/         the fixture the specs build their things with
  e2e/             Playwright specs, one embedded static server, coverage fixture
reports/           the gate's artefacts, rebuilt every run (git-ignored)
```

## House rules

- `src/domain` imports nothing outside itself: no DOM, no storage, no clock. The
  arithmetic is testable without a browser, and nothing there can reach into the
  screen.
- The words on the screen live in `src/ui/copy.ts`, so the phrasing is tested
  like behaviour and the components stay markup.
- `ItemStore` (`src/app/item-store.ts`) is the only writer. Every change is
  persisted as it is made — there is no save button, and no place for one.
- Three reading sizes for the whole app, in `src/ui/text.ts`; a picture in front
  of a label is sized as a picture. See [the screen](screen.md).
- The commit shown at the foot of the screen is `BUILD_SHA`, baked in by
  `vite.config.ts`; see [deploying](deploying.md).
