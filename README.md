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

Everything is measured in **days**, except where a unit is counted.

$$
\text{effective lifespan} = \min(\text{usageDays},\ \text{freshDays})
$$

$$
\text{daily usage rate} = \frac{1}{\text{effective lifespan}}
\qquad\text{(units per day)}
$$

$$
\text{reorder point} = \left\lceil \text{daily usage rate} \times \text{leadDays} \right\rceil
\qquad
\text{spare units} = \left\lceil \text{daily usage rate} \times \text{extraDays} \right\rceil
$$

$$
\text{target stock} = \text{reorder point} + \text{spare units}
\qquad
\text{fetch} = \text{spare units}
$$

| what            | in the words of the screen                                          |
| --------------- | ------------------------------------------------------------------- |
| reorder point   | **Fetch more at** — the units a wait would eat, so fetch below this  |
| spare units     | how much of **Keep at least** is on top of that                      |
| target stock    | **Keep at least** — the level to come back to                        |
| fetch quantity  | how many to bring home when you fetch                                |

Two deliberate decisions, and one place this differs from the textbook formula:

- **The stock level stays tight.** It is only the units that would be used up
  while a replacement is on its way — no padding blurred into it.
- **The spare is added on top**, in whole units, so the household can see which
  half is which. You cannot buy a third of a bottle, so each half is rounded up
  on its own: `ceil(a) + ceil(b)`, not `ceil(a + b)`. The classic
  $ROP = \lceil \text{rate} \times \text{lead time} + \text{buffer stock} \rceil$
  folds the buffer in and rounds once, and can land a whole unit below what this
  app tells a household to keep — with a buffer small enough to vanish inside
  the same ceiling, it would ask for no spare at all.

`usageDays` is *how long one unit lasts*, so the daily rate is one unit over
that many days. If you count in consumption per day instead, the two are
reciprocal: the app's number is already the rate you would type.

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
| `coverage`   | at least 95% of `src/` lines, unit and browser runs *together*        |
| `metrics`    | complexity ≤ 8 and CRAP ≤ 10, per function                           |
| `mutation`   | Stryker: at least 85% of mutants killed                              |

Every stage writes a log to `reports/logs/`, and the reports themselves land in
`reports/` (`coverage.txt`, `crap.txt`, `jscpd/`, `mutation/index.html`). The
gate deletes them before it starts, so a stale report can never pass a stage.

Two of those stages are worth explaining:

- **Coverage is measured across both test runners.** Vitest instruments the
  TypeScript; the browser tests run against a build instrumented by
  `vite-plugin-istanbul`, and each Playwright test hands its `__coverage__`
  back. The two disagree about where a statement begins — a bundler's line 72
  can be the line after the one a reader sees — so `scripts/coverage-report.mjs`
  lets the unit run decide *which lines exist* and lets every run decide *which
  were reached*. A line the browser reached counts even if no unit test went
  near it; a line nothing reached counts against the total. It sits at 98% of
  about 270 lines, and the two lines it does not count are guards the DOM cannot
  produce (a non-numeric number field, a picker open with no thing selected).
- **CRAP** (`scripts/crap-report.mjs`) is the number that says where the next
  bug will be: `complexity² × (1 − coverage)³ + complexity`. A function is
  risky when it is complicated *and* thinly covered. Complexity comes from the
  same linter rule the gate enforces, asked for every function rather than only
  the offenders, so nothing is measured twice or measured differently.
- **Mutation testing cannot be measured here yet**, and the gate says so rather
  than reporting a number that describes the tool: `@stryker-mutator/vitest-runner`
  10 executes no tests per mutant under vitest 5, so every mutant is reported as
  survived. `scripts/mutation-report.mjs` notices exactly that and exits with
  "not measurable", which the gate shows as `–` instead of `✓`. When the runner
  catches up, the same command starts enforcing the 85% bar by itself.


## Where the presets live

Presets are kept in the browser's `localStorage` and written on every change —
there is no save button, and nothing is ever sent anywhere. The picker also
remembers **which thing was open**, so a reload lands where the household left
off rather than at the top of the list; a thing that has since been deleted is
simply forgotten.

Exports come in two sizes and one format. **📤 All** writes every thing to
`shopping-peace-presets-<date>.json`; **📤 This one** writes just the thing on
screen to a file named after it, so two exports are told apart in a downloads
folder. Both hold a *list* — of one, or of all — so import never has to know
which it was given.

**📥 Import** replaces the whole shelf, so it asks first, naming how many things
are about to be replaced. Saying no leaves everything exactly as it was.

**Restore defaults** brings back any starter thing that is no longer in the
list, matched by name. It only ever adds: anything the household has added,
renamed or retuned is left exactly as it is, so pressing it twice does nothing
the second time.

## Naming things

A name is a short line of text with a picture on the front, and the picker has a
small **🙂 Emoji** button for the picture. It opens a keyword search over the
whole published emoji set — 1,391 of them — with the household's own words for
everyday things leading it, so `milk` offers 🥛 before anything rarer, and
`whale` still finds 🐋. Words match anywhere in a keyword and every word has to
match, so `cat food` is narrower than `food`. Picking one puts it in front of
the name, replacing any emoji already there, and hands the name back ready to
type.

Three things are deliberate:

- **Only what one character can draw.** The set is filtered to symbols that are
  a single code point, or one plus the variation selector that asks for the
  coloured drawing of it. Joined-up sequences (🧑‍🍳, 🏳️‍🌈) are drawn differently
  on every platform and look broken wherever the fonts disagree.
- **Characters, not images.** A name holds a character, not an icon id, so
  nothing has to be fetched and nothing has to be licensed as artwork. The cost
  is that the drawing is whatever the device has — and the whole keyword set
  costs about 16 kB gzipped.
- **The words are generated, the household words are not.**
  `src/data/emoji-catalogue.ts` comes from [emojilib](https://github.com/muan/emojilib)
  (MIT) by way of `npm run build:catalogue`;
  `src/data/household-emoji.ts` is hand-written. A test fails if the generated
  file is out of step with the data it came from.

[OpenMoji](https://github.com/hfg-gmuend/openmoji) (4,500+ emoji) and its
siblings — Microsoft Fluent, Google Noto, Streamline, all aggregated by
[Iconify](https://icon-sets.iconify.design/) — are the other way to go, and the
only way to get a picture that looks *identical* on every device. They are
artwork rather than data, so that road means bundling SVG files into `dist/`,
storing an icon id in the name instead of a character, rendering SVG beside the
text, and honouring the licences: OpenMoji is **CC BY-SA 4.0**, which asks for
attribution *and* share-alike on whatever ships its data, while Fluent is MIT and
Noto is Apache-2.0.

## Layout

```
quality-gate.sh    the local gate: the stages, and the bar each one holds
tsconfig.json      strict, noUncheckedIndexedAccess, no implicit any
stryker.config.mjs which code gets mutated, and how much has to die
.jscpd.json        what counts as a duplicate, and how much is too much
scripts/
  coverage-report.mjs  unit + browser line coverage, with a bar
  crap-report.mjs      complexity × coverage, per function
  build-emoji-catalogue.mjs  the emoji set, from emojilib's data (MIT)
src/
  domain/          the arithmetic and its vocabulary — no DOM, no storage
    stock-item.ts    usageDays, leadDays, extraDays, freshDays
    stock-plan.ts    planStock() -> reorderPoint, spareUnits, targetStock
  data/            the JSON file format, where presets are kept, the thing that
                   was open last, and the emoji behind the keyword search
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
- two taps on a thing in quick succession pick it and leave — the same as the
  **✓ OK** button, and the usual way out of a picker on a touch screen. The row
  counts the taps itself, because a phone does not report that gesture as a
  `dblclick`: it is also how you zoom;
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

No emoji artwork is bundled. The emoji are plain Unicode characters drawn by
whatever emoji font the device already has, so no font licence applies; the
words they are found by come from [emojilib](https://github.com/muan/emojilib)
(MIT) and are generated into `src/data/emoji-catalogue.ts`. Shipping an icon set
instead — [OpenMoji](https://github.com/hfg-gmuend/openmoji) (CC BY-SA 4.0,
attribution *and* share-alike), Microsoft Fluent (MIT) or Google Noto
(Apache-2.0) — would mean adding that licence, and its files, to the notices
file and to `dist/`.

## License

MIT — see [LICENSE](LICENSE).
