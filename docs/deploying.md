# Deploying

Pressing to `main` publishes to GitHub Pages through
`.github/workflows/deploy.yml`, and only once the `CI` workflow has come back
green for that same commit: the deploy waits on `workflow_run`, and builds the
`head_sha` CI verified rather than whatever `main` points at. A red `main`
therefore stays unpublished — the last good copy keeps serving — and
`workflow_dispatch` is there to publish by hand.

The build uses relative asset paths (`base: './'`), so it works from a project
URL such as `https://<user>.github.io/<repo>/`. Enable it once under
**Settings → Pages → Source: GitHub Actions**.

CI itself — `.github/workflows/ci.yml` — runs typecheck, the unit tests, the
build, and then the browser tests on chromium and webkit, on every push to `main`
and on every pull request. The Playwright report is kept as an artefact when
something failed.

## Which commit is this?

The bottom of the screen carries the GitHub mark, linking to the source, next to
the short commit the bundle was built from — so a copy on a phone can name its
own version. That commit is baked in at build time (`define` in
`vite.config.ts`): the Pages workflow hands over the commit CI checked — the
`head_sha` of the run that triggered it — as `BUILD_SHA`, a local build asks
`git rev-parse --short HEAD`, and a build with neither says `dev`. A `BUILD_SHA`
that is handed in is cut to seven characters, which is what the footer shows.
