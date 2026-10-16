#!/usr/bin/env bash
#
# The quality gate: everything that has to be true before this goes anywhere.
#
# It is the same list every time, each stage says what it measured, and the run
# ends with a table saying which one failed. Bars live here, in one place, so
# there is never a question of which number a check was comparing against.
#
#   ./quality-gate.sh                  the everyday bar: seconds, not minutes
#   ./quality-gate.sh --full           the lot, slow stages included
#   ./quality-gate.sh --only lint,unit run just those stages
#   ./quality-gate.sh --skip e2e       everything but those
#   ./quality-gate.sh --list           what the stages are, and what each costs
#
# Artefacts land in reports/: one log per stage, plus the coverage, CRAP and
# duplication reports, so a failure can be read after the fact.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

REPORTS="$ROOT/reports"
LOGS="$REPORTS/logs"

# ---------------------------------------------------------------- the bars ---
# Lines reached by the unit tests and the browser tests together. The two
# instrument the same source differently, so this counts lines, which neither
# can disagree about.
MIN_LINES="${MIN_LINES:-95}"
# Cyclomatic complexity, per function, as the linter counts it.
MAX_COMPLEXITY="${MAX_COMPLEXITY:-8}"
# Change risk: complexity² × (1 − coverage)³ + complexity, per function.
MAX_CRAP="${MAX_CRAP:-10}"
# Share of duplicated lines in src/ and tests/, from jscpd.
MAX_DUPLICATION="${MAX_DUPLICATION:-1}"
# Property tests get their own, longer run: they are how the edges get found.
FC_RUNS="${FC_RUNS:-1000}"

# ----------------------------------------------------------------- stages ----
# Bash 3.2 has no associative arrays, so this is a bare list plus a lookup.
#
# Mutation testing is not here. @stryker-mutator/vitest-runner 10 reports no
# tests per mutant under vitest 5, so a sweep of 15k mutants spends hours
# arriving at "every one survived" — a number about the tool, not the tests.
# `npm run mutation` still runs it for anybody who wants to see that, and
# `node scripts/mutation-report.mjs --break 85` reads the report it leaves.
STAGES="types lint workflows duplicates unit properties e2e coverage metrics"

# The stages that take minutes:
#   e2e      a production build, then 70 browser tests on three devices;
#   coverage the figure is unit + browser together, so it needs that run.
# Everything else finishes in seconds. Only --full runs these.
SLOW_STAGES="e2e coverage"

stage_title() {
  case "$1" in
    types) echo "tsc --noEmit, no type errors" ;;
    lint) echo "oxlint, no findings" ;;
    workflows) echo "actionlint on .github/workflows, shellcheck included" ;;
    duplicates) echo "jscpd, at most ${MAX_DUPLICATION}% duplicated lines" ;;
    unit) echo "vitest with coverage, all green" ;;
    properties) echo "fast-check at ${FC_RUNS} runs per property" ;;
    e2e) echo "playwright: the phone screens and the desktop, all green" ;;
    coverage) echo "unit + browser coverage, at least ${MIN_LINES}% of lines" ;;
    metrics) echo "complexity ≤ ${MAX_COMPLEXITY}, CRAP ≤ ${MAX_CRAP}, per function" ;;
    *)
      echo "unknown stage $1" >&2
      return 1
      ;;
  esac
}

# What a stage costs, so nobody reaches for the expensive one by accident.
stage_cost() {
  for name in $SLOW_STAGES; do
    if [ "$1" = "$name" ]; then
      echo "slow"
      return
    fi
  done
  echo "quick"
}

stage_types() { npm run typecheck; }

stage_lint() { npx oxlint; }

# actionlint is a Go tool rather than an npm one, so it is looked for on PATH
# and then where `go install` puts things. shellcheck is looked up the same way.
find_tool() {
  if command -v "$1" >/dev/null 2>&1; then
    command -v "$1"
  elif [ -x "$HOME/go/bin/$1" ]; then
    echo "$HOME/go/bin/$1"
  else
    return 1
  fi
}

# The workflows are code too: a bad expression or a job that cannot start is
# otherwise found by GitHub, at push time, which is the worst moment to hear it.
# The linter is handed the exact shell checker to run rather than left to find
# one, since it would quietly check less on a machine that has none.
stage_workflows() {
  local linter shell
  linter="$(find_tool actionlint)" || {
    echo "actionlint is not installed, so the workflows went unchecked."
    echo "go install github.com/rhysd/actionlint/cmd/actionlint@latest"
    return 3
  }
  shell="$(find_tool shellcheck)" || {
    echo "shellcheck is not installed, and actionlint checks less without it."
    echo "brew install shellcheck"
    return 3
  }
  "$linter" -shellcheck "$shell"
}

stage_duplicates() { npx jscpd src tests --threshold "$MAX_DUPLICATION"; }

# Coverage in the same run as the tests, so a passing stage is a tested one.
stage_unit() { npx vitest run --coverage; }

# The property tests already run with the unit tests; this is the same
# properties, given long enough to be unlucky.
stage_properties() {
  FC_RUNS="$FC_RUNS" npx vitest run --testTimeout=60000 \
    tests/stock-plan.properties.test.ts \
    tests/presets-file.properties.test.ts
}

stage_e2e() { COVERAGE_E2E=1 npx playwright test; }

# The combined figure needs both runs: without the browser's half it would be a
# smaller number wearing the same name.
stage_coverage() {
  if ! ls coverage-e2e/*.json >/dev/null 2>&1; then
    echo "There is no browser coverage to add to the unit run."
    echo "Run the e2e stage first, or the whole gate with --full."
    return 3
  fi
  node scripts/coverage-report.mjs --min-lines "$MIN_LINES"
}

# Two halves: ask the linter for every function's complexity, then weigh each
# one against its own coverage. The complexity rule at its usual threshold only
# reports the offenders, so this asks for all of them. Complexity on its own
# says nothing about risk, so without the unit run there is no number to report.
stage_metrics() {
  if ! ls coverage/coverage-final.json >/dev/null 2>&1; then
    echo "There is no unit coverage to weigh the complexity against."
    echo "Run the unit stage first, or the whole gate with --full."
    return 3
  fi
  cat > "$REPORTS/oxlint-complexity.config.json" <<'CONFIG'
{
  "rules": { "complexity": ["error", 1] },
  "ignorePatterns": ["dist", "coverage", "coverage-e2e", "reports", ".stryker-tmp"]
}
CONFIG
  npx oxlint --config "$REPORTS/oxlint-complexity.config.json" \
    --format=json src > "$REPORTS/oxlint-complexity.json" 2>/dev/null
  node scripts/crap-report.mjs --max-crap "$MAX_CRAP" --max-complexity "$MAX_COMPLEXITY"
}

# ---------------------------------------------------------------- driver -----
COLOUR=""
if [ -t 1 ]; then
  COLOUR=1
fi

bold() {
  if [ -n "$COLOUR" ]; then printf '\033[1m%s\033[0m' "$1"; else printf '%s' "$1"; fi
}
green() {
  if [ -n "$COLOUR" ]; then printf '\033[32m%s\033[0m' "$1"; else printf '%s' "$1"; fi
}
red() {
  if [ -n "$COLOUR" ]; then printf '\033[31m%s\033[0m' "$1"; else printf '%s' "$1"; fi
}
dim() {
  if [ -n "$COLOUR" ]; then printf '\033[2m%s\033[0m' "$1"; else printf '%s' "$1"; fi
}

# The stage list travels as plain words, not an array: macOS ships bash 3.2,
# which treats "${empty[@]}" as an unbound variable under `set -u`.
chosen="${STAGES[*]}"
full=0

while [ $# -gt 0 ]; do
  case "$1" in
    --full) full=1 ;;
    --only)
      chosen="${2:-}"
      chosen="${chosen//,/ }"
      shift
      ;;
    --skip)
      unwanted="${2:-}"
      kept=""
      for stage in $chosen; do
        drop=0
        for name in ${unwanted//,/ }; do
          [ "$stage" = "$name" ] && drop=1
        done
        [ "$drop" = 0 ] && kept="$kept $stage"
      done
      chosen="$kept"
      shift
      ;;
    --list)
      for stage in ${STAGES[*]}; do
        printf '  %-11s %-6s %s\n' "$stage" "$(stage_cost "$stage")" "$(stage_title "$stage")"
      done
      exit 0
      ;;
    -h | --help)
      sed -n '2,21p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown option $1. Try --help." >&2
      exit 2
      ;;
  esac
  shift
done

# Without --full the slow stages are left out, however they were asked for.
left_out_slow=0
if [ "$full" = 0 ]; then
  kept=""
  for stage in $chosen; do
    if [ "$(stage_cost "$stage")" = slow ]; then
      left_out_slow=1
    else
      kept="$kept $stage"
    fi
  done
  chosen="$kept"
fi

if [ -z "${chosen// /}" ]; then
  echo 'Nothing to run: every stage was skipped.' >&2
  exit 2
fi

# Whatever the last run left behind must not be able to satisfy this one.
rm -rf "$REPORTS" coverage coverage-e2e
mkdir -p "$LOGS"

results=()
failed=0
overall_start=$SECONDS

for stage in $chosen; do
  title="$(stage_title "$stage")" || exit 2
  log="$LOGS/$stage.log"
  start=$SECONDS

  printf '\n%s %s\n' "$(bold "▶ $stage")" "$title"

  if "stage_$stage" >"$log" 2>&1; then
    results+=("pass $(($SECONDS - start)) $stage $title")
    tail -n 12 "$log" | sed 's/^/  /'
  else
    code=$?
    if [ "$code" = 3 ]; then
      # "Cannot measure this here, and here is why": not a pass, not a failure.
      results+=("skip $(($SECONDS - start)) $stage $title")
      printf '%s\n' "$(dim "  – not measurable here:")"
      tail -n 8 "$log" | sed 's/^/  /'
    else
      results+=("fail $(($SECONDS - start)) $stage $title")
      failed=1
      printf '%s\n' "$(red "  ✗ $stage failed — the last of $log:")"
      tail -n 30 "$log" | sed 's/^/  /'
    fi
  fi
done

stages_run=${#results[@]}
skipped=0
for result in "${results[@]}"; do
  case "$result" in skip*) skipped=$((skipped + 1)) ;; esac
done
if [ "$stages_run" = 1 ]; then
  printf '\n%s\n' "$(bold "quality gate — 1 stage, $((SECONDS - overall_start))s")"
else
  printf '\n%s\n' "$(bold "quality gate — $stages_run stages, $((SECONDS - overall_start))s")"
fi
for result in "${results[@]}"; do
  read -r state seconds stage title <<<"$result"
  case "$state" in
    pass) printf '  %s %-11s %4ss  %s\n' "$(green ✓)" "$stage" "$seconds" "$title" ;;
    skip) printf '  %s %-11s %4ss  %s\n' "$(dim –)" "$stage" "$seconds" "$title" ;;
    *) printf '  %s %-11s %4ss  %s\n' "$(red ✗)" "$stage" "$seconds" "$title" ;;
  esac
done

if [ "$failed" = 1 ]; then
  printf '\n%s\n' "$(red "Not ready to push: at least one stage failed.")"
  exit 1
fi

if [ "$skipped" != 0 ]; then
  printf '\n%s\n' "$(dim "$skipped stage(s) could not be measured here — the logs above say why.")"
fi

if [ "$left_out_slow" = 1 ]; then
  printf '\n%s\n' "$(dim "Left out: ${SLOW_STAGES// /, } — minutes rather than seconds.")"
  printf '\n%s\n' "$(green "Ready for the next save.")"
  printf '%s\n' "$(dim "./quality-gate.sh --full runs the lot, and that is the push bar.")"
  exit 0
fi

printf '\n%s\n' "$(green "Ready to push.")"
