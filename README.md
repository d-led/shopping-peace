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
| **Keep at least**                           | `2` units             |
| **Fetch more at**                           | `1` unit left         |
| Down to 1? Bring home 1 more …              | … and you're back at 2 |

## The arithmetic

Everything is measured in **days**, so nothing has to be converted by hand.

```
usageDays    how many days one unit lasts
leadDays     how many days it takes to get a replacement home
extraDays    extra days of stock kept on top of the tight level
freshDays    how many days it stays good after opening (365 means "never spoils")

effectiveUsageDays = min(usageDays, freshDays)   never below 1 day

reorderPoint  = ceil(leadDays  / effectiveUsageDays)   when to start fetching again
spareUnits    = ceil(extraDays / effectiveUsageDays)   whole units kept for surprises
targetStock   = reorderPoint + spareUnits              how many to keep
fetchQuantity = spareUnits                             how many to fetch at the trigger
```

Two deliberate decisions:

- **The stock level stays tight.** It is only the units that would be used up
  while a replacement is on its way — no padding blurred into it.
- **The spare is added on top**, in whole units, so the household can see which
  half is which. You cannot buy a third of a bottle, so each half is rounded up
  on its own.

### When a thing goes off before it is finished

Butter eaten over a fortnight that turns sour a week after opening is a
*weekly* thing, not a fortnightly one: the plan counts a unit as gone when it
turns, so `effectiveUsageDays` is the shorter of the two. Nothing is counted as
gone in less than a day — a thing that will not keep at all is a day's worth of
use, not a division by zero.

A shelf life longer than the unit lasts changes nothing, and 365 days is the
slider's top end, which reads as **never spoils**. Files written before the
slider existed are read the same way.

When `freshDays` is shorter than `usageDays`, the screen says so out loud above
the numbers, because they will look higher than the eating rate suggests. A
household that eats two units a week and buys two at a time wastes one of them,
and a plan that pretends otherwise is worse than no plan.

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
| `npm run gate`      | the whole quality gate (below)                             |

`npm run test:e2e` starts its own server: Playwright builds the app and serves
`dist/` with the small dependency-free server in `tests/e2e/server.mjs`, so
there is nothing to start by hand. The first run needs the browsers once:

```bash
npx playwright install chromium webkit
```

## The quality gate

```bash
./quality-gate.sh              # everything, then a table saying what failed
./quality-gate.sh --fast       # skip mutation testing, which is the slow one
./quality-gate.sh --only lint,unit
./quality-gate.sh --list       # the stages, and the bar each one holds
```

Nine stages, and the bars all live at the top of `quality-gate.sh` so there is
never a question of which number a check compared against:

| stage        | what it holds to                                                    |
| ------------ | ------------------------------------------------------------------- |
| `types`      | `tsc --noEmit`                                                       |
| `lint`       | `oxlint` with no findings                                            |
| `duplicates` | `jscpd`: at most 1% duplicated lines in `src/` and `tests/`           |
| `unit`       | Vitest with coverage, all green                                      |
| `properties` | the fast-check properties at 1000 runs each                          |
| `e2e`        | Playwright on three devices, against an instrumented build            |
| `coverage`   | at least 90% of `src/` lines, unit and browser runs *together*        |
| `metrics`    | complexity ≤ 8 and CRAP ≤ 10, per function                           |
| `mutation`   | Stryker: at least 85% of mutants killed                              |

Every stage writes a log to `reports/logs/`, and the reports themselves land in
`reports/` (`coverage.txt`, `crap.txt`, `jscpd/`, `mutation/index.html`). The
gate deletes them before it starts, so a stale report can never pass a stage.

Two of those stages are worth explaining:

- **Coverage is measured across both test runners.** Vitest instruments the
  TypeScript; the browser tests run against a build instrumented by
  `vite-plugin-istanbul`, and each Playwright test hands its `__coverage__`
  back. The two instrumenters disagree about what a statement is, so
  `scripts/coverage-report.mjs` counts *lines* instead — a line was reached or
  it was not, whoever was watching. A line the browser reached counts even if
  no unit test ever went near it.
- **CRAP** (`scripts/crap-report.mjs`) is the number that says where the next
  bug will be: `complexity² × (1 − coverage)³ + complexity`. A function is
  risky when it is complicated *and* thinly covered. Complexity comes from the
  same linter rule the gate enforces, asked for every function rather than only
  the offenders, so nothing is measured twice or measured differently.


## Where the presets live

Presets are kept in the browser's `localStorage` and written on every change —
there is no save button, and nothing is ever sent anywhere. The thing picker
exports them as a dated JSON file and reads one back in, so a household can move
them between devices or keep a copy.

**Restore defaults** brings back any starter thing that is no longer in the
list, matched by name. It only ever adds: anything the household has added,
renamed or retuned is left exactly as it is, so pressing it twice does nothing
the second time.

## Naming things

A name is a short line of text with a picture on the front, and the picker has a
small **🙂 Emoji** button for the picture. It opens a keyword search over about a
hundred and forty household things — `milk`, `loo roll`, `cat litter` — instead
of the keyboard of every emoji in Unicode. Words match anywhere in a keyword and
every word has to match, so `cat food` is narrower than `food`. Picking one puts
it in front of the name, replacing any emoji already there, and hands the name
back ready to type.

The catalogue lives in `src/data/emoji.ts` and is deliberately small and
hand-written: it is offline, it needs no icon files, and a name holds one
character rather than an icon id. Large open icon sets (OpenMoji, Fluent, Noto,
Streamline, aggregated by [Iconify](https://icon-sets.iconify.design/)) are the
other way to go if a picture has to look the same on every device — at the cost
of bundling SVG assets and honouring each licence.

## Layout

```
quality-gate.sh    the local gate: the stages, and the bar each one holds
tsconfig.json      strict, noUncheckedIndexedAccess, no implicit any
stryker.config.mjs which code gets mutated, and how much has to die
.jscpd.json        what counts as a duplicate, and how much is too much
scripts/
  coverage-report.mjs  unit + browser line coverage, with a bar
  crap-report.mjs      complexity × coverage, per function
src/
  domain/          the arithmetic and its vocabulary — no DOM, no storage
    stock-item.ts    usageDays, leadDays, extraDays, freshDays
    stock-plan.ts    planStock() -> reorderPoint, spareUnits, targetStock
  data/            the JSON file format, where presets are kept, and the emoji
                   catalogue behind the keyword search
  app/             ItemStore: the selected thing and every change, persisted
  ui/              Hono JSX components for the screen and the picker
tests/
  *.test.ts(x)     unit and component tests
  e2e/             Playwright specs, one embedded static server, coverage fixture
reports/           the gate's artefacts, rebuilt every run (git-ignored)
```

Rules the screen follows, since it is used with wet hands:

- three text sizes for the whole app, defined in `src/ui/text.ts`;
- nothing wider than the screen — no sideways scrolling anywhere;
- the two numbers are visible without scrolling, on a 375 px phone;
- switching things keeps the sheet open, so the one you just picked can be
  renamed before you close it;
- a double press on a thing picks it and leaves — the same as the **✓ OK**
  button, and the usual way out of a picker on a touch screen;
- every tap target is thumb-sized, with ± buttons beside each slider for hands
  that cannot aim at a track.

## Deploying

Pressing to `main` publishes to GitHub Pages through
`.github/workflows/deploy.yml`. The build uses relative asset paths, so it works
from a project URL such as `https://<user>.github.io/<repo>/`. Enable it once
under **Settings → Pages → Source: GitHub Actions**.

### Which commit is this?

The bottom of the screen carries the GitHub mark, linking to the source, next to
the short commit the bundle was built from — so a copy on a phone can name its
own version. That commit is baked in at build time (`define` in
`vite.config.ts`): the Pages workflow hands over `github.sha` as `BUILD_SHA`, a
local build asks `git rev-parse --short HEAD`, and a build with neither says
`dev`.

## Attributions

The GitHub mark in `src/ui/SourceStamp.tsx` is from
[Octicons](https://github.com/primer/octicons) (MIT, © GitHub Inc.); its notice
is in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

No emoji artwork is bundled. The emoji in `src/data/emoji.ts` are plain Unicode
characters drawn by whatever emoji font the device already has, and their
keywords are hand-written here, so there is nothing to attribute. Shipping an
icon set instead — [OpenMoji](https://github.com/hfg-gmuend/openmoji)
(CC BY-SA 4.0, attribution required), Microsoft Fluent (MIT) or Google Noto
(Apache-2.0) — would mean adding that licence to the notices file.

## License

MIT — see [LICENSE](LICENSE).
