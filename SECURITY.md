# Security

## This is a demo, and it is not supported

Shopping Peace is a demo: a small static web app that works out when to fetch
more of a household thing and how much to fetch, so a cupboard does not quietly
run out. It is a plan for loo roll and dishwasher tabs, not a system anything
rests on.

**Nobody supports it.** There is no security team, no release process, no
version support and nobody on call. It is published as-is under the Mozilla
Public License 2.0, which disclaims the warranty in the usual way. Use it if it
is useful; do not build anything that matters on top of it.

## What it does with your data

Almost everything interesting about this app's security follows from how little
of it there is:

- **No server, no accounts.** There is no sign-in, no database behind the page,
  and no analytics or telemetry. The app makes no network requests of its own —
  open the browser's network tab and the page's own assets are all you will see.
- **Your shelf lives in this browser's `localStorage`**, under
  `shopping_peace_presets` (the things) and `shopping_peace_selected` (which one
  was open). Clearing site data clears it; it is not backed up anywhere, so an
  export is the only copy that travels.
- **A shared link is not private.** *Share this shelf* packs the whole shelf —
  every thing, and the one that was open — into the address, as the export file's
  own JSON in URL-safe base64. That is **packing, not encryption**: anyone holding
  the link can read the shelf, and it will sit in browser history, chat logs and
  whatever server logs it passes through. Base64 is not a secret and is not meant
  to be one.
- **An imported file is data, not code.** Importing reads a JSON file you choose
  and replaces the shelf, after asking. It is parsed and checked field by field,
  and anything that does not fit the format is refused rather than half-read.
  Files written by a newer copy of the app are refused with an explanation.

There is nothing here to breach: no credentials, no personal data beyond the
names a household gives its own things, and no place to send them even if there
were.

## Reporting something

If you find something that looks like a genuine vulnerability, please report it
privately through this repository's **Security → Report a vulnerability** form
(<https://github.com/d-led/shopping-peace/security/advisories/new>) rather than
in a public issue. If it is not sensitive — a bug, an oddity, a dependency that
wants bumping — an ordinary issue is fine, and quicker.

Being a demo, expect a best-effort reply rather than a service window. Known
dependency advisories are surfaced by Dependabot on the repository, which is the
quickest place to see the current state; some of them sit in the development-only
toolchain (coverage instrumentation, test runners) and never reach the published
page.

## Contributing

**Meaningful contributions are welcome** — this is the kind of project that gets
better because somebody noticed something.

The bar is the repository's own gate:

```bash
./quality-gate.sh --full
```

Types, lint, duplication, unit and property tests, the browser tests on a phone
and a desktop, coverage, and complexity and CRAP per function. CI runs the type
check, the unit tests, the build and the browser tests on every pull request, and
`main` only publishes to GitHub Pages once CI has passed for that exact commit. A
red gate is a change that is not finished yet.

Small, focused, tested changes are far easier to take than large ones. If you are
unsure whether something is in scope, open an issue first and ask.
