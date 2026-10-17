# Presets, files and links

Presets are kept in the browser's `localStorage` and written on every change —
there is no save button, and nothing is ever sent anywhere. There is no server,
no account and no sync: what a household sees is what this browser holds.

| key | what it is |
| --- | ---------- |
| `shopping_peace_presets` | every thing, in the export format below |
| `shopping_peace_selected` | the id of the thing that was open, or `''` for none |

They are kept apart on purpose: which thing was open is a fact about the screen,
not about the shelf, so a lost selection never costs anybody a preset. The picker
opens on the remembered thing after a reload; a thing that has been deleted is
simply forgotten. Damaged or hand-edited storage is treated as a fresh start
rather than an error that locks the household out of the app.

## Exports

Three buttons, under plainly named labels in the picker sheet: **📤 Export all**,
**📤 Export this one**, **📥 Import**. **Export all** writes every thing to
`shopping-peace-presets-<YYYY-MM-DD>.json`. **Export this one** writes just the
thing on screen to `shopping-peace-<name>-<YYYY-MM-DD>.json`, so two exports are
told apart in a downloads folder. Both hold a *list* — of one, or of all — so
import never has to know which it was given. Both write the same document:

```json
{
  "format": "shopping-peace",
  "version": 1,
  "exported": "2026-10-17T08:00:00.000Z",
  "selected": "a1b2c3",
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
shape it is (`version`). `selected` is the thing that was open, by id, and is
left out when nothing was.

- **A newer file is refused, not half-read**: a file from a newer version of the
  app gets a sentence naming both versions, and one with no version is refused
  too, rather than guessed at.
- **An older file is still read**: import takes the bare list this app wrote
  before the format was versioned.
- **The numbers that drive the maths are required** and validated — `usageDays`
  at least 1, the other days at least 0, `packSize` at least 1 — with an error
  naming the preset (`Preset #2 needs usageDays to be at least 1.`).
- **A missing field reads as the safe thing**: no `freshDays` means it keeps, no
  `packSize` means sold one at a time, no `id` means a new one is made, and an
  empty name shows as *Unnamed thing*.
- **A picture left inside a name is moved out of it** into the `emoji` field on
  the way in — the one place the two are pulled apart. See [naming](naming.md).

**📥 Import** replaces the whole shelf, so it asks first, naming how many things
are about to be replaced. Saying no leaves everything exactly as it was, and a
file that cannot be read says why in the app's own words.

## Links

**🔗 Share this calculator**, at the foot of the main screen, puts the whole
shelf — every thing, and the one that is open — into the address as
`#p=<payload>`: the same export JSON, without the indentation that is only there
for a household reading a file, in URL-safe base64. One shape, one version, one
set of checks: a link and a file are read and refused by the same code.

- On a phone the link goes to the device's own share sheet, which is where
  messengers, mail and notes live. Anywhere else it goes to the clipboard, and
  that is said out loud, because copying leaves nothing on the screen to see. A
  share sheet that fails is a reason to copy instead of giving up; a sheet closed
  again is a change of mind and says nothing.
- Opening a link reads the address on the way in, and again whenever one arrives
  later — pasting a link into a tab that already has the app open changes the
  fragment alone, and the page is never rebuilt.
- A shelf from a link **replaces** the one that is here, so it asks first —
  unless there is nothing to lose, which is not worth a question. The hash is
  then dropped from the address, and the app says how many things arrived.
- A payload that will not decode is reported as *"This link does not hold a
  shelf."* rather than as a decoder's complaint: a messenger that cut the link in
  half is the ordinary case.

## Reset to defaults

**↩️ Reset to defaults** throws the shelf away and starts again from the starter
things: the household's own things, their renames and their tuning all go, and so
does the memory of which thing was open. It is the only thing in the app that
loses data on purpose, so it asks first and names how many things are about to
go; on an empty shelf there is nothing to lose, and it just seeds the starters
(the empty screen offers the same button, as **↩️ Bring back the starter
things**).

Delete, by contrast, is a small button under a separator in the sheet, the only
red one, and it asks about the thing by name.
