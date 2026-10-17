# The quality gate

```bash
./quality-gate.sh              # the everyday bar: about 40 seconds
./quality-gate.sh --full       # everything, including the slow stages
./quality-gate.sh --only lint,unit
./quality-gate.sh --skip e2e
./quality-gate.sh --list       # the checks, what each costs, and its bar
```

Checks are split by what they cost. Seven finish in seconds and run by default;
the other two take minutes, and only `--full` runs them:

- `e2e` is a production build plus 74 browser tests — the two small screens and
  the desktop;
- `coverage` is the unit and browser line counts *together*, so it needs that run
  to have happened (asked for on its own, it says exactly that and reports
  "not measurable" rather than a smaller number wearing the same name).

## The stages and their bars

The bars live at the top of `quality-gate.sh`, so there is never a question of
which number a check compared against:

| stage        | cost  | what it holds to                                                    |
| ------------ | ----- | ------------------------------------------------------------------- |
| `types`      | quick | `tsc --noEmit`                                                       |
| `lint`       | quick | `oxlint` with no findings                                            |
| `workflows`  | quick | `actionlint` over `.github/workflows`, shellcheck included            |
| `duplicates` | quick | `jscpd`: no clone at all in `src/` or `tests/`                       |
| `unit`       | quick | Vitest with coverage, all green                                      |
| `properties` | quick | the fast-check properties at 1000 runs each                          |
| `metrics`    | quick | complexity ≤ 5 and CRAP ≤ 6, per function                            |
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

## Two complexity numbers

Which code each weighs is the whole of the difference. `src/` — the code that
ships, and the code CRAP scores — holds to **5**, in the linter rule
(`.oxlintrc.json`) and in the metrics bar alike, so the stage that runs in
seconds catches what the stage that weighs coverage would. `tests/` and
`scripts/` hold to **8**, the ceiling that used to apply everywhere: what they
branch on is a framework's shape — an argument table, a `page.evaluate` callback
— rather than product logic, and CRAP's model of risk is not about them.

## Coverage across both runners

Vitest instruments the TypeScript; the browser tests run against a build
instrumented by `vite-plugin-istanbul`, and each Playwright test hands its
`__coverage__` back. The two disagree about where a statement begins — a
bundler's line 72 can be the line after the one a reader sees — so
`scripts/coverage-report.mjs` lets the unit run decide *which lines exist* and
lets every run decide *which were reached*. A line the browser reached counts
even if no unit test went near it; a line nothing reached counts against the
total.

It currently sits at 99% of 456 lines, and the lines it does not count are guards
the DOM cannot produce. The unit run has to happen first: the report reads
`coverage/coverage-final.json`, and without it says "not measurable" instead of
guessing.

## CRAP

`scripts/crap-report.mjs` is the number that says where the next bug will be:

$$
\text{CRAP} = \text{complexity}^2 \times (1 - \text{coverage})^3 + \text{complexity}
$$

A function is risky when it is complicated *and* thinly covered. Complexity comes
from the same linter rule the gate enforces, asked for every function rather than
only the offenders, so nothing is measured twice or measured differently.

## Accessibility is inside the browser run

Not a stage of its own, so it cannot be skipped on its own. Playwright has no
accessibility rules — `tests/e2e/accessibility.spec.ts` drives
[axe-core](https://github.com/dequelabs/axe-core), the engine every browser-based
audit uses, Lighthouse among them, over the main screen, the spoilage warning,
the picker and the picture search. It fails on any finding, and it earned its keep
immediately: muted text at 40–60 % opacity is under 4.5:1 on this theme,
`<header>` inside the dialog made a second banner landmark, and the picture
button was labelled "Emoji" while reading "Picture".

## Mutation testing is not a stage

`@stryker-mutator/vitest-runner` 10 reports no tests per mutant under vitest 5,
so a sweep of its 15k mutants spends hours arriving at "every mutant survived" —
a fact about the tool, not about these tests. Rather than report a number that
describes the tooling, the gate leaves it to a command:

```bash
npm run mutation                              # stryker, and its report
node scripts/mutation-report.mjs --break 85   # read what it left behind
```

## Reports

Every stage writes a log to `reports/logs/`, and the reports themselves land in
`reports/` (`coverage.txt`, `crap.txt`, `jscpd/`, `mutation/index.html`). The
gate deletes them before it starts, so a stale report can never pass a stage.

A quick run weighs CRAP against unit coverage only, which makes browser-only code
look uncovered; a `--full` run is the honest picture.
