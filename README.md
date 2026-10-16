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
| **Fetch more at**                           | `0` spare units left  |
| **Keep at least**                           | `1` unit spare        |
| Down to 1 unit? Bring home 1 more …         | … and you're at a level of 2, safe for emergencies |

Both cards count the **reserve**: the units held on top of what a wait eats up.
Counting that rather than the whole shelf is what gives the fetch number
something to say — *keep one spare, and shop again when the last one is opened* —
where "keep two units, fetch at one" made the reader do the subtraction. With the
reserve set to zero there is no counter to watch, so the cards fall back to the
tight level and say that nothing is kept spare.

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
| reorder point   | *Down to …?* in the headline — the units a wait would eat, so shop before the shelf is that low |
| spare units     | **Keep at least** — the reserve; the **Fetch more at** card is where it runs out |
| target stock    | the level a fetch aims back for                                      |
| fetch quantity  | how many units that would be, before a shop's pack size is taken into account |
| pack size       | **Sold in packs of** — what one package holds; `1` is sold one at a time |
| packs to fetch  | the *Bring home …* of the headline, once packs are in play            |
| shelf after fetch | what the cupboard really holds then, and what **days of cover** counts |

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

When `freshDays` is shorter than `usageDays`, the screen says so out loud — in
the same slot the "days of cover" line would otherwise fill, so the warning
costs no height of its own — because the numbers will look higher than the
eating rate suggests. A household that eats two units a week and buys two at a
time wastes one of them, and a plan that pretends otherwise is worse than no
plan. The cover figure only appears from 640 px up: on a phone that line is
there for the warning, and for nothing else.

### When the shop only sells packs

A shop sells packages: ten rolls of toilet paper, twenty-four tins, six bottles.
Nothing about that changes how the thing is *used*, so it does not touch the
level kept at home — the cards stay in single units, because that is what a
shelf is counted in. It changes the fetching, since nobody sells three quarters
of a pack:

$$
\text{packs to fetch} = \max\left(1,\ \left\lceil \frac{\text{spare units}}{\text{pack size}} \right\rceil\right)
\qquad
\text{shelf after a fetch} = \text{reorder point} + \text{packs} \times \text{pack size}
$$

At least one pack, because one pack is the smallest thing a shop will sell: a
household that keeps no reserve still comes home with a pack, and the headline
says so rather than asking for a tenth of one.

**Worked through: ten rolls at a time.** A roll lasts two days, fetching takes
four days, three rolls of reserve, ten to a pack.

| what the screen says | the numbers behind it |
| -------------------- | --------------------- |
| **Keep at least** `3` units spare | reserve $= \lceil 6 \text{ days} \div 2 \rceil = 3$ |
| **Fetch more at** `0` spare units left | reorder point $= \lceil 4 \text{ days} \div 2 \rceil = 2$ |
| *Down to 2 units? Bring home a 10-pack and you're at a level of 12, safe for emergencies.* | packs $= \lceil 3 \div 10 \rceil = 1$, shelf $= 2 + 10 = 12$ |
| `12 units ≈ 24 days of cover.` | $12 \times 2$ days |

The shelf ends up *above* the level the cards aim at, and that is the honest
answer rather than a rounding error: the household wanted three spare rolls and
could only buy ten, so it lands with eight spare instead of three.

Where this differs from the textbook bulk-quantity rule is the trigger, not the
padding. That rule keeps the reserve intact *through* the wait, so it fetches
when five rolls are left and adds a ten-pack to that — fifteen rolls of cupboard
space. This app fetches when the reserve is spent (two rolls left, which still
covers the four days), so the ten-pack arrives where the reserve used to be and
twelve rolls is the most the shelf ever holds: the same protection against
running out, three rolls less space, and a shelf space figure that is really the
highest the cupboard gets.

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
| `npm run test:e2e`  | browser tests: the phone screens, then the desktop            |
| `npm run typecheck` | `tsc --noEmit`                                             |
| `npm run build`     | typecheck, then build into `dist/`                         |
| `npm run preview`   | serve a build you already made                             |
| `npm run gate`      | the quality gate, the everyday half of it (below)          |
| `npm run gate:full` | the quality gate, slow stages included                     |

`npm run test:e2e` starts its own server: Playwright builds the app and serves
`dist/` with the small dependency-free server in `tests/e2e/server.mjs`, so
there is nothing to start by hand. The first run needs the browsers once:

```bash
npx playwright install chromium webkit
```

## The quality gate

```bash
./quality-gate.sh              # the everyday bar: about 40 seconds
./quality-gate.sh --full       # everything, including the slow stages
./quality-gate.sh --only lint,unit
./quality-gate.sh --skip e2e
./quality-gate.sh --list       # the checks, what each costs, and its bar
```

Checks are split by what they cost. Some finish in seconds and run by
default; the other two take minutes, and only `--full` runs them:

- `e2e` is a production build plus 70 browser tests — the two phone screens and
  the desktop;
- `coverage` is the unit and browser line counts *together*, so it needs that
  run to have happened (asked for on its own, it says exactly that and reports
  "not measurable" rather than a smaller number wearing the same name).

Mutation testing is deliberately *not* one of them, and the reason is worth
saying out loud: `@stryker-mutator/vitest-runner` 10 reports no tests per mutant
under vitest 5, so a sweep of its 15k mutants spends hours arriving at "every
mutant survived" — a fact about the tool, not about these tests. `npm run
mutation` still runs it for anybody who wants to see that with their own eyes,
and `node scripts/mutation-report.mjs --break 85` reads the report it leaves.

The bars all live at the top of `quality-gate.sh`, so there is never a question
of which number a check compared against:

| stage        | cost  | what it holds to                                                    |
| ------------ | ----- | ------------------------------------------------------------------- |
| `types`      | quick | `tsc --noEmit`                                                       |
| `lint`       | quick | `oxlint` with no findings                                            |
| `workflows`  | quick | `actionlint` over `.github/workflows`, shellcheck included           |
| `duplicates` | quick | `jscpd`: at most 1% duplicated lines in `src/` and `tests/`           |
| `unit`       | quick | Vitest with coverage, all green                                      |
| `properties` | quick | the fast-check properties at 1000 runs each                          |
| `metrics`    | quick | complexity ≤ 8 and CRAP ≤ 10, per function                           |
| `e2e`        | slow  | Playwright: the phone screens, then the desktop, axe included         |
| `coverage`   | slow  | at least 95% of `src/` lines, unit and browser runs *together*        |

`workflows` is the one stage that is not an npm script: `actionlint` is a Go
tool, and it wants `shellcheck` for the shell inside the `run:` steps. The gate
finds both on `PATH` or in `$HOME/go/bin`, and hands the linter the exact
`shellcheck` to use — left to itself it would check less on a machine that
happens not to have one. With either missing, the stage reports "not measurable"
and says which command installs it:

```bash
go install github.com/rhysd/actionlint/cmd/actionlint@latest
brew install shellcheck   # or your package manager's shellcheck
```

Every stage writes a log to `reports/logs/`, and the reports themselves land in
`reports/` (`coverage.txt`, `crap.txt`, `jscpd/`, `mutation/index.html`). The
gate deletes them before it starts, so a stale report can never pass a stage.

Three of those checks are worth explaining, and one thing inside `e2e`:

- **Coverage is measured across both test runners.** Vitest instruments the
  TypeScript; the browser tests run against a build instrumented by
  `vite-plugin-istanbul`, and each Playwright test hands its `__coverage__`
  back. The two disagree about where a statement begins — a bundler's line 72
  can be the line after the one a reader sees — so `scripts/coverage-report.mjs`
  lets the unit run decide *which lines exist* and lets every run decide *which
  were reached*. A line the browser reached counts even if no unit test went
  near it; a line nothing reached counts against the total. It sits at 99% of
  about 330 lines, and the lines it does not count are guards the DOM cannot
  produce (a non-numeric number field, a picker open with no thing selected).
- **CRAP** (`scripts/crap-report.mjs`) is the number that says where the next
  bug will be: `complexity² × (1 − coverage)³ + complexity`. A function is
  risky when it is complicated *and* thinly covered. Complexity comes from the
  same linter rule the gate enforces, asked for every function rather than only
  the offenders, so nothing is measured twice or measured differently.
- **Accessibility is part of the browser run**, not a stage of its own, so it
  cannot be skipped on its own. Playwright has no accessibility rules —
  `tests/e2e/accessibility.spec.ts` drives
  [axe-core](https://github.com/dequelabs/axe-core), the engine every
  browser-based audit uses, Lighthouse (Google's) among them, over the main
  screen, the spoilage warning, the picker and the picture search. It fails on
  any finding, and it earned its keep immediately: muted text at 40–60 %
  opacity is under 4.5:1 on this theme, `<header>` inside the dialog made a
  second banner landmark, and the picture button was labelled "Emoji" while
  reading "Picture".
- **Mutation testing cannot be measured here**, and rather than report a number
  that describes the tool, the gate leaves it to a command: run `npm run
  mutation` when you want to see why, since the vitest runner reports no tests
  per mutant and every mutant therefore comes back survived.


## Where the presets live

Presets are kept in the browser's `localStorage` and written on every change —
there is no save button, and nothing is ever sent anywhere. The picker also
remembers **which thing was open**, so a reload lands where the household left
off rather than at the top of the list; a thing that has since been deleted is
simply forgotten.

Exports come in two sizes and one format, under two plainly named buttons —
**📤 Export all**, **📤 Export this one**, **📥 Import**. **Export all** writes
every thing to `shopping-peace-presets-<date>.json`; **Export this one** writes
just the thing on screen to a file named after it, so two exports are told apart
in a downloads folder. Both hold a *list* — of one, or of all — so import never
has to know which it was given. Both write the same document:

```json
{
  "format": "shopping-peace",
  "version": 1,
  "exported": "2026-10-16T08:00:00.000Z",
  "things": [
    {
      "id": "a1b2c3",
      "name": "Laundry detergent",
      "emoji": "🧴",
      "usageDays": 30,
      "leadDays": 3,
      "extraDays": 30,
      "freshDays": 365,
      "packSize": 1
    }
  ]
}
```

The object, rather than a bare list, is there so a file can say what it is
(`format`), when it was written (`exported`) and — the reason it exists — which
shape it is (`version`). A file written by a newer copy of the app is refused
with a sentence naming both versions instead of being half-read. Import still
takes the bare list this app wrote before the format was versioned, and a
picture left inside a name is moved out of it and into the `emoji` field on the
way in. A field the file does not mention is the safe one: no `freshDays` means
it keeps, no `packSize` means sold one at a time. A future icon set would arrive
as a second field beside `emoji` — an id — rather than replacing the character.

**📥 Import** replaces the whole shelf, so it asks first, naming how many things
are about to be replaced. Saying no leaves everything exactly as it was.

**Reset to defaults** throws the shelf away and starts again from the starter
things: the household's own things, their renames and their tuning all go, and
so does the memory of which thing was open. It is the only thing in the app that
loses data on purpose, so it asks first and names how many things are about to
go; on an empty shelf there is nothing to lose, and it just seeds the starters.

## Naming things

A name is a short line of text with a picture beside it, and the picker has a
small **🙂 Picture** button for the picture. It opens a keyword search over the
whole published emoji set — 1,391 of them — with the household's own words for
everyday things leading it, so `milk` offers 🥛 before anything rarer, and
`whale` still finds 🐋. Words match anywhere in a keyword and every word has to
match, so `cat food` is narrower than `food`.

The picture is a field of its own, `emoji`, not part of the name: picking one
sets it beside the name, replacing any picture already there, and hands the name
back ready to type. The search folds away on its own — as soon as one is picked,
or when the household taps anywhere else — so nothing has to be confirmed.
Typing a picture in *front* of a name still counts as the picture, the habit
works, and a file from before the split has its picture taken out of the name on
import, which is the one place the two are pulled apart.

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
storing an icon id in a field of its own instead of a character, rendering SVG
beside the text, and honouring the licences: OpenMoji is **CC BY-SA 4.0**, which
asks for attribution *and* share-alike on whatever ships its data, while Fluent
is MIT and Noto is Apache-2.0.

## Layout

```
quality-gate.sh    the local gate: the stages, what each costs, and its bar
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
                   (`main-screen` and `touch` on the two small screens,
                   `things` and `accessibility` on the desktop)
reports/           the gate's artefacts, rebuilt every run (git-ignored)
```

Rules the screen follows, since it is used with wet hands:

- three reading sizes for the whole app, defined in `src/ui/text.ts` — pictures
  in front of labels are sized as pictures, since nobody reads an 📤;
- nothing wider than the screen — no sideways scrolling anywhere;
- a phone gets the whole screen: the page padding, the card's rounded corners
  and the "days of cover" figure all appear from 640 px up, and a small screen
  keeps that line for the warning;
- the two numbers are visible without scrolling, on a 375 px phone;
- switching things keeps the sheet open, so the one you just picked can be
  renamed before you close it;
- two taps on a thing in quick succession pick it and leave — the same as the
  **✓ OK** button, and the usual way out of a picker on a touch screen. The row
  counts the taps itself, because a phone does not report that gesture as a
  `dblclick`: it is also how you zoom;
- every tap target is thumb-sized, with ± buttons beside each slider for hands
  that cannot aim at a track;
- a notice says its piece and goes by itself — three seconds for a short line,
  longer for a longer one at three words a second, never more than ten — and the
  ✕ is there for anyone who reads faster;
- nothing is written in a colour the contrast rule rejects — muted text stays at
  70 % of `base-content`, and the theme's error red is darkened in
  `src/style.css`, where the reason is written down.

## Deploying

Pressing to `main` publishes to GitHub Pages through
`.github/workflows/deploy.yml`, and only once the `CI` workflow has come back
green for that same commit: the deploy waits on `workflow_run`, and builds the
`head_sha` CI verified rather than whatever `main` points at. A red `main`
therefore stays unpublished — the last good copy keeps serving — and
`workflow_dispatch` is there to publish by hand. The build uses relative asset
paths, so it works from a project URL such as
`https://<user>.github.io/<repo>/`. Enable it once under
**Settings → Pages → Source: GitHub Actions**.

### Which commit is this?

The bottom of the screen carries the GitHub mark, linking to the source, next to
the short commit the bundle was built from — so a copy on a phone can name its
own version. That commit is baked in at build time (`define` in
`vite.config.ts`): the Pages workflow hands over the commit CI checked — the
`head_sha` of the run that triggered it — as `BUILD_SHA`, a local build asks
`git rev-parse --short HEAD`, and a build with neither says `dev`.

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
