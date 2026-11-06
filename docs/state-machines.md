# The states this app can be in

Every state machine the app actually has — the explicit ones in `ItemStore`, and
the implicit ones that live in a `useState`, in a `localStorage` key, in
`window.location.hash`, and in the browser's own idea of what is focused. Each
one is written down with its states, the invariants that are meant to hold in all
of them, and the transitions that move between them. The register at the end
lists the states and transitions the code can really reach but should not, with
the evidence for each.

There is no framework here and no state library: the machines are what the code
does, and this file is the one place they are written out so a change can be
weighed against all of them at once.

---

## M1 — The shelf and what is open (`src/app/item-store.ts`)

The one machine that holds the data. Everything else is a view of it or a note
about it.

**State**

```ts
interface ItemStoreState {
  items: readonly StockItem[];   // every thing, in the order they are listed
  selected: StockItem | null;    // the thing on screen, or null when the shelf is empty
}
```

`selected` is derived from a private `#selectedId` each time the state is
rebuilt (`#refresh`), so it is never a copy that has gone stale.

**Events**: `load`, `select(id)`, `add()`, `remove(id)`, `rename(id, name)`,
`setEmoji(id, emoji)`, `adjust(id, numbers)`, `resetToDefaults()`,
`replaceAll(items)`.

### Invariants

| # | Invariant | Where it is held |
| --- | --- | --- |
| S1 | `selected` is the thing whose id is the remembered one, or `null` when the shelf no longer holds it | `#refresh` |
| S2 | No two things on the shelf share an id | `parsePresetFile`, at the boundary where foreign shelves come in |
| S3 | A shelf that is not empty has something open | `#openSomethingIfNothingIsOpen`, `add`, `remove`, `replaceAll`, `resetToDefaults` |
| S4 | What the store holds is what the browser holds: a change is saved before it is announced | `#commit` → `#persist` → `#announce` |
| S5 | Every accepted change produces a new state object, so a view comparing by identity re-renders | `#refresh` |
| S6 | An event that changes nothing announces nothing | the guards in `select`, `remove`, `#update` |
| S7 | The picture and the name are separate fields: a picture typed in front of a name moves into `emoji` | `rename` → `splitEmoji` |

### Transitions

| Event | Guard | New state | Written to the browser |
| --- | --- | --- | --- |
| `load` | nothing stored | starter things, first one open | presets + selection |
| `load` | stored presets | those things; the remembered one open if it is still there, else the first | nothing (already there) |
| `select(id)` | id is on the shelf and is not the open one | that one open | selection only |
| `select(id)` | id is the open one, or unknown | unchanged | nothing |
| `add()` | — | one more thing at the end, it opens | presets + selection |
| `remove(id)` | id on the shelf | gone; if it was open, the first of what is left opens, else nothing is open | presets + selection |
| `remove(id)` | id unknown | unchanged | nothing |
| `rename(id, name)` | id on the shelf | name (and picture, if one was typed in front) replaced | presets + selection |
| `setEmoji` / `adjust` | id on the shelf | that field replaced | presets + selection |
| `resetToDefaults()` | — | the starter things, the first one open, everything else thrown away | presets + selection |
| `replaceAll(items)` | — | exactly those things, the first one open | presets + selection |

Two things are worth noting about the table. `replaceAll` throws the selection
away and opens the first thing, so a shelf that arrives from a file and names a
different thing to be open needs a second call (`select`) — which is what
`App.openSharedShelf` does. And `resetToDefaults` returns how many of the
household's *own* things went, worked out by comparing names against the
starters (D8).

---

## M2 — The screen (`src/ui/App.tsx`)

Two bits of view state, both of which outlive the thing they are about.

**State**: `pickerOpen: boolean`, `notice: Notice | null`.

| # | Invariant | Where it is held |
| --- | --- | --- |
| A1 | The sheet is on screen only when it is open *and* there is something open in it | `pickerOpen && selected !== null` |
| A2 | One notice at a time; a new one replaces the old one and restarts its reading time | `setNotice` + the timer effect in `NoticeBar`, keyed on the notice |
| A3 | A notice goes away on its own after its reading time, or when dismissed | `NoticeBar` |

**Transitions**: the name of the thing opens the sheet (`pickerOpen = true`),
`✓ OK` and Escape close it, `+` and the empty screen's add both add a thing and
open the sheet, and the sheet closes itself when the shelf empties. Any action
that has something to say sets a notice; the bar clears it.

Invariant A1 is a *guard*, not a fact: `pickerOpen` stays true when the last thing
is deleted from the sheet, and the sheet is simply not rendered. The state
"(sheet open, nothing to open it for)" is therefore reachable and legal today — D6.

---

## M3 — The picture search inside the sheet (`src/ui/ThingPicker.tsx`)

An implicit machine in one boolean, `pickingEmoji`, with three different things
able to move it.

**States**: `folded` (the button says "🙂 Picture"), `open` (button, search field
and an icon grid).

| Event | Guard | Next state | Also |
| --- | --- | --- | --- |
| press the picture button | `folded` | `open` | focus stays where it was |
| press the picture button | `open` | `folded` | — |
| an icon is pressed (`chooseEmoji`) | `open` | `folded` | the picture is set, the caret goes back to the name |
| a click lands outside the picture block (the dialog's own `onClick`) | `open` | `folded` | — |
| focus leaves the picture block for somewhere else (`onFocusOut`) | `open` | `folded` | — |
| Escape, `✓ OK`, a second tap on a thing | any | the sheet closes | — |

| # | Invariant | Where it is held |
| --- | --- | --- |
| E1 | When the search is open, the grid it shows belongs to the thing on screen | the picker is rendered inside `current !== undefined` |
| E2 | A press that lands on an icon sets that icon | nowhere — see D1 |
| E3 | Folding the search away never loses something the household just did | nowhere — see D1 |
| E4 | The foot of the sheet can always be scrolled to, keyboard or not | nowhere — see D2 |

The `onFocusOut` rule is the one that matters: it exists so that a keyboard user
who tabs out of the block, or a thumb that taps the name field, folds the search
away without having to press anything. It reads "focus went somewhere that is not
in here" as `relatedTarget` being null *or* outside, and a tap on a button is
exactly the case where `relatedTarget` is null: the browser blurs the search
field first and delivers the `click` afterwards.

---

## M4 — "This one, and I am done" (`src/ui/taps.ts`)

**States**: `no first tap`, `a first tap waiting on <row>`.

| Event | Guard | Next state | Result |
| --- | --- | --- | --- |
| tap on a row | nothing waiting | that row waiting | select only |
| tap on the same row | later, and within 450 ms | nothing waiting | select and close the sheet |
| tap on a different row | — | that row waiting | select only |
| tap | the clock went backwards | that row waiting | select only |
| any third tap | the pair was closed by the second | starts a new pair | select only |

The machine is per sheet (one watcher for the whole list), so a tap on the thing
below is what a first tap on it should be. No invalid state was found here; the
unit tests in `tests/taps.test.ts` cover the clock going backwards and the third
tap.

---

## M5 — A shelf coming in from a file (`App.importPresets` → `parsePresets`)

**States**: `idle` → `reading` (the `await file.text()` gap) → `parsed` or
`unreadable` → `asking` → `applied` or `refused`.

| # | Invariant | Where it is held |
| --- | --- | --- |
| F1 | A file that cannot be read changes nothing and says so | the `try` around reading and parsing |
| F2 | A refused import changes nothing | the `confirm` in front of `replaceAll` |
| F3 | The same file can be picked again afterwards | `fileFrom` empties the input |
| F4 | The question names the shelf that is really here | **not quite** — D7 |

Everything the file can say is checked at this one boundary: `format`, `version`
(a newer one is refused, an older bare list is read), `usageUnits ≥ 1`,
`usageDays ≥ 1`, the other days `≥ 0`, `packSize ≥ 1`, **every number a whole
number**, a blank name becoming `Unnamed thing`, and an id no earlier thing on
the same shelf claimed — a repeat gets a suffix rather than sharing, so nothing on
the shelf can end up impossible to tell from another (D3).

`usageUnits` and `usageDays` are the rate — units over days — and a file written
before the field existed means one unit at a time, so a version 1 shelf reads as
the same shelf it always was (D9).

## M6 — A shelf coming in from a link (`App`'s hash effect → `decodeShelf`)

**States**: `no payload` / `payload in the address` → `read` (hash already
cleared) → `asking` → `applied` or `declined`.

The address is read on the way in and again on every `hashchange`, because
pasting a link into a tab that already has the app open changes the fragment
alone and never reloads the page. The payload goes through the same
`parsePresetFile` as a file — one shape, one set of refusals — so **how fast a
thing goes travels with it**: a shelf of two-a-day things arrives as two a day,
and a link written before the rate existed arrives as one unit at a time. What a
link does **not** carry is which framing the sender was reading it in: that is a
way of saying the rate, not part of it, so the receiver sees the framing their own
copy would choose (M9).

| # | Invariant | Where it is held |
| --- | --- | --- |
| L1 | A link is read once, and a reload does not ask the same question again | `history.replaceState` before the question |
| L2 | A link that is refused leaves the shelf as it was | the `confirm` in `mayGoAhead` |
| L3 | A declined link can be reconsidered | **nowhere** — D4 |

## M7 — What the browser remembers (`localStorage`)

| Key | Written by | Read by |
| --- | --- | --- |
| `shopping_peace_presets` | every `#commit` | `load` |
| `shopping_peace_selected` | every `#commit` and `#commitSelection` | `load` |

| # | Invariant | Where it is held |
| --- | --- | --- |
| R1 | Damaged presets are a fresh start, not a lock-out | `LocalStoragePresetRepository.load`'s `try` |
| R2 | A selection naming a thing that is gone opens the first thing instead | `#rememberedSelection` |
| R3 | Two tabs never silently overwrite each other | **nowhere** — D5 |
| R4 | When the browser refuses to store, memory and screen stay in step | **nowhere** — D2 |

R2 leaves the stale key in place until the next commit: harmless (it heals on
every load) but it means the stored selection can name a thing that is not there
for as long as the tab lives — D10.

## M8 — A shelf going out (share, `offerLink`)

**States by outcome**: `shared`, `copied`, `declined`, `failed`. Two of the four
say nothing (`NOTICE_FOR_SHARE`): the phone's own sheet is confirmation, and a
sheet closed again is a change of mind. Nothing here holds state; two presses in
a row start two offers and the last outcome wins the notice, which is harmless.

## M9 — The numbers (inputs → the plan)

Not a state machine, but the place where one enters the domain: `UsageControl`
and `StepSlider` clamp what a hand can do (`min`, `max`, and a track widened for a
value from a file), and `parsePresetFile` validates what a file can do, whole
numbers only — D9.

`UsageControl` has a small machine of its own: which of the two framings the
household is saying the rate in — "days each" or "a day" — kept as a choice
*tagged with the thing it was made for*, so another thing falls back to the
framing its own rate fits. The framing is never stored anywhere else: the rate is
the state, and the framing is only how it is being read out. A framing that
cannot hold the current rate ("one unit lasts" for a thing used twice a day)
shows the nearest number it can, which is what a touch there would store.

The tag is the id, so a shelf that comes back under the **same ids** — the export
you made, posted back to you — keeps the framing you had chosen for those things
even if the rates in it changed. The numbers on screen are the numbers in the
file; the framing catches up on the first touch.

---

# The register

Confirmed, reachable, and ordered by what they cost a household. "Evidence" is
how the state was reached and seen, not a guess at it.

| # | State or transition | Impact | Evidence | Status |
| --- | --- | --- | --- | --- |
| D1 | A tap on an icon on a touch screen folds the search away before the `click` arrives, so the icon is never picked | **A phone cannot choose a picture at all** — the feature does not work on the device the app is for | Instrumented phone run (WebKit, iPhone 13 Mini): `pointerdown → BUTTON[emoji-choice]`, then `focusout → INPUT#emoji-search related=null`, then **no `click` and no change**; the same taps without typing in the search first work, because nothing is focused to lose | **fixed** — `fix(picker): let a thumb pick a picture` |
| D2 | The foot of the sheet cannot scroll: with the search open its content is taller than the sheet (`footer` bottom 657 px in a 629 px sheet), and under a raised keyboard the grid sits below the visible area with nothing to scroll it | A phone cannot reach the lower icons or the buttons under them | Measured on the phone profile: `dialog.height 629`, `footer.bottom 657`, `footer.scrollHeight === footer.clientHeight`, list scroller down to 16 px | **fixed** — `fix(picker): let the sheet's foot scroll` |
| D3 | A file or link that names two things with the same id is accepted, so the shelf holds two things that cannot be told apart | Deleting one deletes both; renaming one renames both; the selection opens the wrong one | `parsePresetFile` keeps any non-empty `id` (`readId`) and nothing anywhere checks uniqueness; `remove` filters *every* match and `#update` maps over *every* match | **fixed** — `fix(presets): keep ids unique when a shelf comes from a file` |
| D4 | A shared link is taken out of the address *before* the question is answered, so a link that is declined is gone from the page | The household cannot reconsider, and a reload no longer shows what was shared | `App`'s hash effect: `history.replaceState` runs before `openSharedShelf` | confirmed, not fixed — needs a decision about what the address should show after "no" |
| D5 | Two tabs (or a phone and a tablet on the same origin) both hold the shelf; the last commit wins and the other tab's edits disappear, including on reload | Silent loss of edits | No `storage` listener anywhere in `src/`; `#persist` writes the whole shelf, so each write is a full overwrite | confirmed, not fixed — cross-tab reconciliation is a design decision, not a repair |
| D6 | `pickerOpen` is true while the shelf is empty (delete the last thing from the sheet) | None today: the sheet is guarded out, and `+` from the empty screen is the same state used correctly | `App`: `pickerOpen && selected !== null`; `addThing` sets `pickerOpen` true | confirmed, left alone — the guard is the right shape |
| D7 | The import question counts the shelf as it was at render time, not as it is when the file has been read | A wrong number in a question about losing data | `importPresets` closes over `items` across `await file.text()`; `resetDefaults` deliberately reads `store.getState()` instead | confirmed, not fixed — cosmetic |
| D8 | `resetToDefaults` works out what it threw away by comparing names to the starters, so a thing the household added and named like a starter is not counted, and a renamed starter is | A wrong number in a confirmation message | `new Set(starters.map(item => item.name))` | confirmed, not fixed — cosmetic |
| D9 | A file may say `leadDays: 0.5` or `packSize: 2.5`; nothing refuses a part of a day or part of a pack | Nonsense in the plan ("packs of 2.5") from a hand-edited file | `readNumber` checks finite and `≥ minimum`, not integrality | **fixed** — `feat(domain): count the rate in units over days` (every number in a file is a whole number now) |
| D10 | The stored selection keeps naming a deleted thing until the next commit | None: it heals on every load | `#openSomethingIfNothingIsOpen` changes the id in memory only, and `load` does not persist when the browser already held presets | confirmed, left alone |

## What was fixed, and how it is now held

- **D1** — `onFocusOut` folds the search away only when focus went *somewhere
  else that can be named*; a blur with no new target is a tap in progress, not a
  departure. Held by an end-to-end test that types in the search and then taps an
  icon with a real touch, on both small screens.
- **D2** — the foot of the sheet is capped to the height it can have and scrolls
  inside itself. Held by a test that shrinks the screen to the height a raised
  keyboard leaves, then reaches and taps the last icon.
- **D3** — a file that repeats an id gets a second one for the repeat, at the
  boundary where foreign shelves come in (`parsePresetFile`), so the rest of the
  app can keep believing S2. Held by unit tests on the file reader, by a property
  that no shelf read back has two things under one id, and by a screen test that
  imports two things a file named the same way and deletes only the one asked
  for.

## Reproducing the register

The unit-level ones are pinned by the tests named above. The two phone ones need
a browser that has a touch screen, which is what the Playwright projects in
`playwright.config.ts` are for:

```bash
npm run build
npx playwright test --project=iphone-mini tests/e2e/touch.spec.ts
```

Both defects were first seen on the production build served by
`tests/e2e/server.mjs`, on the `iPhone 13 Mini` profile, with the browser's own
focus and click events logged (`focusin`, `focusout`, `pointerdown`, `click`) to
see which of them the app acted on and in what order.
