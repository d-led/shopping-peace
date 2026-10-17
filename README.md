# 🛒 Shopping Peace

Never run out of dish tabs again. **Live: <https://d-led.github.io/shopping-peace/>**

Households are just-in-time supply chains with worse planning. A thing is used up
at some average rate, and getting a replacement takes days — a shop run, a
delivery, a weekend where nothing is open. Shopping Peace turns those two facts
into the three numbers that actually matter, big enough to read from across the
kitchen:

| what                                 | example                                            |
| ------------------------------------ | -------------------------------------------------- |
| **The thing**                        | 🧴 Laundry detergent                               |
| **Fetch more at**                    | `2` units — _"1 spare + 1 for the wait"_           |
| **Keep at least**                    | `1` unit spare                                     |
| Down to 2 units? Bring home 1 more … | … and you're at a level of 3, safe for emergencies |

The **Keep at least** card counts the reserve: the units kept on top of what a
wait eats up. The **Fetch more at** card counts the shelf level to shop at, and
its caption adds up where that number comes from — the reserve, plus the wait.
With the reserve set to zero there is no counter to watch, so both cards fall back
to the tight level and say there is no reserve.

Below the two, a plain card says the reserve in the terms a cupboard holds it —
*2 packs of 10 + 3 units*.

Everything is measured in **days**, except where a unit is counted. The whole of
the arithmetic, with worked examples, is in [the arithmetic](docs/arithmetic.md).

Presets live in this browser and go nowhere: no account, no server, no save
button. Export them as a file or a link whenever the shelf needs to travel —
[see how](docs/presets.md).

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173, hot reload while you edit
```

Node 22 or newer. `npm run build` typechecks and writes `dist/`; the browser tests
build and serve it themselves, so there is nothing to start by hand. Every
command is listed in [development](docs/development.md).

## Documentation

| file                                        | what is in it                                         |
| ------------------------------------------- | ----------------------------------------------------- |
| [The arithmetic](docs/arithmetic.md)        | the formulas, spoilage, pack sizes, worked examples   |
| [The screen](docs/screen.md)                | layout, touch rules, text sizes, accessibility        |
| [Naming things](docs/naming.md)             | names, the picture button, the emoji set              |
| [Presets, files and links](docs/presets.md) | what is stored where, export and import, share links  |
| [Development](docs/development.md)          | commands, the test suite, the shape of the source     |
| [The quality gate](docs/quality-gate.md)    | the nine checks, their bars, and what each one is for |
| [Deploying](docs/deploying.md)              | Pages, the CI gate, and which commit is on screen     |

## Attributions

The GitHub mark in `src/ui/SourceStamp.tsx` is from
[Octicons](https://github.com/primer/octicons) (MIT, © GitHub Inc.); its notice
is in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

No emoji artwork is bundled. The emoji are plain Unicode characters drawn by
whatever emoji font the device already has, so no font licence applies; the words
they are found by come from [emojilib](https://github.com/muan/emojilib) (MIT) and
are generated into `src/data/emoji-catalogue.ts`. Shipping an icon set instead is
a road this app did not take — the licences are discussed in
[naming](docs/naming.md).

## License

MPL-2.0 — see [LICENSE](LICENSE). Mozilla's file-level copyleft: files from this
project stay under the MPL when they are reused or changed, and files added beside
them can be licensed however you like.
