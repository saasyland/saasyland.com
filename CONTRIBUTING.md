# Contributing to SaaSy Land

Thank you for helping improve SaaSy Land. This page is the short version. The [contributing guide](https://saasyland.com/docs/project/contributing) and the [Conventions](https://saasyland.com/docs/conventions) are the full reference, and the rules there apply to every change.

## What to contribute

- Bug fixes, with a test that fails without the fix.
- Corrections and translations for the docs.
- Accessibility, performance and test improvements.
- New features, after a [feature request](https://github.com/saasyland/saasyland.com/issues/new?template=feature-request.yml) has agreed the scope.

This repository is the saasyland.com website: the marketing pages, docs, blog, customer workspace and admin console. The paid CLI and its templates are proprietary and live in a separate private repository, so they cannot be changed here; [SUPPORT.md](SUPPORT.md) says where to report problems with them. Report security vulnerabilities privately, as [SECURITY.md](SECURITY.md) describes.

## Making a change

1. For anything larger than a small fix, open an issue first.
2. Fork the repository and branch from `main`.
3. Set up the project with [Getting started](https://saasyland.com/docs/getting-started).
4. Run the checks in this order before you open a pull request:

   ```sh
   bun run check
   bun run test:coverage
   bun run build:test
   bun run test:e2e:install
   bun run test:e2e:pr
   ```

   `check` runs formatting, lint, types, the translation checks and the flow inventory check; code coverage must stay at 100%; `build:test` runs the Cloudflare build that the unit tests do not; `test:e2e:pr` runs the browser suite in Chromium, as CI does.

   The browser suite serves the test build on port 3000. When another server holds that port, or you run several worktrees at once, give each run its own free port from 3020 to 3029, the ports the test build trusts: check it with `lsof -nP -iTCP:3027 -sTCP:LISTEN`, which prints nothing for a free port, then run `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3027 bun run test:e2e:pr`. Never stop a server you did not start. The run stops before the first test if the server on its port belongs to another worktree; [Playwright](https://saasyland.com/docs/tooling/playwright#running-beside-other-worktrees) explains why.

5. Write commit messages in the [conventional commit](https://saasyland.com/docs/tooling/conventional-commits) format, such as `fix(auth): keep the locale in verification links`. The commit hook adds the emoji.

## Pull requests

- One fix, feature or refactor per pull request. The title uses the commit format and becomes the squash commit on `main`.
- Keep the history linear: bring your branch up to date by rebasing it onto `main`, never by merging `main` into it, and push the rebased branch with `git push --force-with-lease`.
- Fill in the template: what changed and why, the checks you ran, and the docs you updated.
- Update everything the change makes inaccurate: the README and the docs in all nine locales.
- Once the pull request has its number, add its [changelog entry](https://saasyland.com/docs/conventions/git-workflow#changelog-entries): `content/changelog/<number>.<locale>.mdx` in all nine locales, without a date. The changelog dates it by the day the pull request reaches `main`, and CI fails a pull request without one.
- Commits and descriptions carry no AI attribution. [Git and pull requests](https://saasyland.com/docs/conventions/git-workflow) has the details.

## Docs and translations

The docs are MDX files in `content/docs`, one per page and locale (`<page>.<locale>.mdx`), and interface strings are JSON files in `messages/<locale>/`. The site ships in nine locales with English (`en-US`) as the source: change the English text first, then the same text in the other eight, with identical code blocks. `bun run check` fails when a locale is missing a page or message, changes a code block or leaves an English paragraph untranslated. See [Translations and content](https://saasyland.com/docs/conventions/translations).

## Licence and conduct

Contributions are accepted under the MIT licence in [LICENSE](LICENSE), as scoped in [LICENSING.md](LICENSING.md). Everyone who takes part follows the [Code of Conduct](CODE_OF_CONDUCT.md).
