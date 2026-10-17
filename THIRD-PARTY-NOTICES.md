# Third-party notices

Shopping Peace is licensed under the Mozilla Public License 2.0 (see
[LICENSE](LICENSE)). Two things need saying about what it does and does not
ship.

## The GitHub mark

`src/ui/SourceStamp.tsx` contains the **mark-github** icon from
[Octicons](https://github.com/primer/octicons), used for the link back to this
project's source. It is the repository's own copy of the icon, so the licence
comes with it:

```text
MIT License

Copyright (c) 2026 GitHub Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

The Octocat mark itself is a trademark of GitHub, Inc. It is used here only to
link to GitHub, which is the use GitHub's own guidelines cover.

## The emoji

No emoji artwork is shipped. The app uses plain Unicode emoji characters —
code points such as U+1F9F4 — and draws them with whatever emoji font the device
already has (Apple Color Emoji on iOS and macOS, Segoe UI Emoji on Windows, Noto
Color Emoji on Android and most Linux desktops). Nothing is embedded, subset or
redistributed, so no font licence and no icon-set licence applies.

The words the search matches on come from two places. The household words are
hand-written here. Everything else is generated from
[emojilib](https://github.com/muan/emojilib) (MIT, © Mu-An Chiou), whose keyword
data is itself derived from Unicode's own annotations; the generator lives in
`scripts/build-emoji-catalogue.mjs` and the generated file says so at the top.
The Emoji characters remain the property of nobody and the drawings of the
platform that makes them.

A name stores the symbol as text, not as an image, so a device without a glyph
for it shows a hollow box and everything else keeps working.

## Everything else

Hono, daisyUI, Tailwind, Vite and the rest arrive as npm dependencies and keep
their own licences inside `node_modules`, which is where npm expects readers to
find them. Nothing of theirs is copied into this repository.
