# The screen

One thing at a time: its name, the two numbers that matter, and a sheet with
everything else in it. The screen is used with wet hands, which is where most of
the rules below come from.

## What is where

Read from the top:

1. the thing's name, a button that opens the sheet;
2. **Fetch more at**, then **Keep at least** — the trigger first, because it is
   the number a household acts on, with the floor it protects beside it;
3. the headline, in the words of the arithmetic: *"Down to 5 units? Bring home a
   pack of ten and you're at a level of 15, safe for emergencies."*;
4. **In reserve**, a plain card under the headline: the reserve as a cupboard holds
   it — whole packs plus the units outside them. It is stock to check, not one of
   the numbers to act on, so it carries no tone and no display-sized figure of its
   own;
5. one line that is the spoilage warning when a unit turns before it is used up,
   and the days-of-cover figure otherwise;
6. the five sliders — how long a unit lasts, how long a fetch takes, the reserve
   in days, the pack size, the shelf life;
7. **🔗 Share this calculator**, and the commit this copy was built from.

Everything that happens once in a while lives in the sheet: the list of things,
the name, the picture, export and import, reset and delete. Renaming and deleting
are not on the main screen at all.

The sheet is left with **✓ OK**, with a double tap on a thing, or with Escape —
never with an ✕. Switching things **keeps the sheet open**, because the name of
what you just picked is usually the next thing to edit.

## The rules, and why

- three reading sizes for the whole app, defined in `src/ui/text.ts` — pictures in
  front of labels are sized as pictures, since nobody reads an 📤;
- nothing wider than the screen — no sideways scrolling anywhere, at any width;
- a phone gets the whole screen: the page padding, the card's rounded corners and
  the "days of cover" figure all appear from 640 px up, and a small screen keeps
  that line for the warning alone;
- the two numbers are visible without scrolling, on a 375 px phone;
- two taps on a thing in quick succession pick it and leave — the same as **✓ OK**,
  and the usual way out of a picker on a touch screen. The row counts the taps
  itself, because a phone does not report that gesture as a `dblclick`: it is also
  how you zoom;
- every tap target is thumb-sized, with ± buttons beside each slider for hands
  that cannot aim at a track;
- a notice says its piece and goes by itself — two seconds to notice that
  something appeared, then a second per three words, never less than three
  seconds and never more than ten — and the ✕ is there for anyone who reads
  faster;
- never truncate a thing's name with an ellipsis — wrap instead;
- a thing's name is its own line, and an unnamed thing says so rather than
  showing a blank.

## Colour and contrast

- nothing is written in a colour the contrast rule rejects — muted text stays at
  70 % of `base-content`, and the theme's error red is darkened in
  `src/style.css`, where the reason is written down;
- the two cards carry the glance signal: green for the level to shop at, amber for
  the line the shelf is not meant to cross.

## Accessibility

The audit is part of the browser run, not a stage of its own — see
[the quality gate](quality-gate.md). It covers the main screen, the spoilage
warning, the picker and the picture search, and it fails on any finding. What it
has already forced:

- muted text at 40–60 % opacity is under 4.5:1 on this theme; muted is 70 % now;
- `<header>` inside the dialog made a second banner landmark; the sheet's top bar
  is a plain box;
- the picture button was labelled "Emoji" while reading "Picture"; its accessible
  name is now the words on the button, plus what pressing it does.
