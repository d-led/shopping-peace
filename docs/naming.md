# Naming things

A name is a short line of text with a picture beside it, and the sheet has a
**Picture** button for the picture — it shows the picture the thing has now, or
🙂 when it has none yet.

## Finding a picture

The button opens a keyword search over the whole published emoji set — 1,391 of
them — with the household's own words for everyday things leading it, so `milk`
offers 🥛 before anything rarer, and `whale` still finds 🐋.

- Words match **anywhere** in a keyword, so `paper` finds both the roll and the
  tray, and every word has to match, so `cat food` is narrower than `food`.
- A keyword that *begins* with what was typed scores double, because somebody
  typing `mil` wants milk before they want toothpaste.

The picture is a field of its own, `emoji`, not part of the name. Picking one sets
it beside the name, replaces any picture already there, folds the search away and
puts the caret back in the name, ready for what the picture is of. The search also
folds away when the household taps anywhere else or moves focus out of it — so
nothing has to be confirmed, and a change of mind costs no tap.

Typing a picture in *front* of a name still counts as the picture: a file from
before the split has its picture taken out of the name on import, which is the one
place the two are pulled apart. What somebody types stays as they typed it.

## Three deliberate choices

- **Only what one character can draw.** The set is filtered to symbols that are a
  single code point, or one plus the variation selector that asks for the coloured
  drawing of it. Joined-up sequences (🧑‍🍳, 🏳️‍🌈) are drawn differently on every
  platform and look broken wherever the fonts disagree.
- **Characters, not images.** A name holds a character, not an icon id, so
  nothing has to be fetched and nothing has to be licensed as artwork. The cost is
  that the drawing is whatever the device has — and the whole keyword set costs
  about 38 kB gzipped.
- **The words are generated, the household words are not.**
  `src/data/emoji-catalogue.ts` comes from [emojilib](https://github.com/muan/emojilib)
  (MIT) by way of `npm run build:catalogue`; `src/data/household-emoji.ts` is
  hand-written. A test fails if the generated file is out of step with the data it
  came from.

## The other road, not taken

[OpenMoji](https://github.com/hfg-gmuend/openmoji) (4,500+ emoji) and its
siblings — Microsoft Fluent, Google Noto, Streamline, all aggregated by
[Iconify](https://icon-sets.iconify.design/) — are the way to get a picture that
looks *identical* on every device. They are artwork rather than data, so that road
means bundling SVG files into `dist/`, storing an icon id in a field of its own
instead of a character, rendering SVG beside the text, and honouring the licences:
OpenMoji is **CC BY-SA 4.0**, which asks for attribution *and* share-alike on
whatever ships its data, while Fluent is MIT and Noto is Apache-2.0.

A future icon set would arrive as a second field beside `emoji` — an id — rather
than replacing the character.
