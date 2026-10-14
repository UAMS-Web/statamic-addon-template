# Statamic add-on template

The starting point for new UAMS Statamic add-ons. It is a GitHub template repository: generate a new repository from it, then follow the steps below. It was extracted from [`UAMS-Web/statamic-multisite-forms`](https://github.com/UAMS-Web/statamic-multisite-forms) and holds only the generic parts, with none of that add-on's code or documentation.

## What is in it

- `composer.json` with a placeholder name and namespace, and a `src/ServiceProvider.php` stub.
- A Pest and Orchestra Testbench scaffold: `tests/Unit` boots nothing, `tests/Integration` boots a minimal Statamic through `tests/TestCase.php`.
- Tool configuration: `phpunit.xml`, `pint.json`, `rector.php` and `rector-sweep.php`, `phpstan.neon.dist`, `vite.config.js` and `vitest.config.js`. The committed `resources/dist` is the build of two empty Control Panel entry files.
- The generic guards in `scripts/`, with their tests, and the local patches in `patches/` for `pestphp/pest-plugin-mutate`.
- `.github/`: workflows, the setup action, issue and pull request templates, and Dependabot.
- `.githooks/pre-commit`, wired by `composer install`.
- `docs/DECISIONS.md`, the decision log, with the log's rules.
- A wiki skeleton in `docs/wiki/`, the `publish-wiki.yml` workflow that publishes it on each release, and the `github-wiki` skill that records how the publishing action behaves.

## What is deliberately left out

- **Synced files** (`.agents/`, `.claude/`, `.cursor/`, `AGENTS.md`). A new add-on onboards to the sync in [`UAMS-Web/uams-claude-skills`](https://github.com/UAMS-Web/uams-claude-skills) instead of carrying a snapshot, so it never starts with a stale copy. See [Onboard to the sync](#3-onboard-to-the-sync).
- **`LICENSE`**, and the `license` field in `composer.json`. The choice waits on the general decision from UAMS legal in [`UAMS-Web/uams-statamic#3039`](https://github.com/UAMS-Web/uams-statamic/issues/3039).
- `docs/SPEC.md`, `docs/DEVELOPMENT.md`, the add-on's wiki pages and the add-on's own code.

## Starting an add-on

### 1. Generate and rename

1. Use **Use this template** on GitHub to create the new repository.
2. Replace every placeholder. This lists them all:

   ```bash
   grep -rniE "addon[-_ ]?template" --exclude-dir=vendor --exclude-dir=node_modules --exclude-dir=.git --exclude=package-lock.json --exclude=composer.lock .
   ```

   - `composer.json`: `name`, `description`, `keywords`, `homepage`, `support`, the two `psr-4` namespaces, `extra.statamic` and `extra.laravel.providers`.
   - `package.json`: `name`.
   - The `UAMSWeb\AddonTemplate` namespace in `src/` and `tests/`.
   - `tests/Integration/ServiceProviderTest.php`: the package name.
   - `docs/wiki/`: every page, and the repository name and version in `_Footer.md`, `_Sidebar.md` and `Home.md`.
   - `.github/pull_request_template.md` and the header of `.github/workflows/ci.yml`: the repository name.
3. Replace the seed entry in `docs/DECISIONS.md` with the add-on's own first decision, or keep it and add yours after it. The decision-log guard needs at least one entry.
4. Run `composer install`, which installs the dependencies, applies `patches/` and sets `core.hooksPath` to `.githooks`. Then run `composer update --lock` if `composer.lock` needs to follow the new name.
5. Run `npm ci` after `composer install` (`@statamic/cms` is a `file:` link into `vendor/`), then `composer ci` and `npm run test:scripts`.

### 2. Add the add-on

Write the add-on under `src/`, with tests under `tests/Unit` and `tests/Integration`. Control Panel assets go in `resources/js` and `resources/css`; run `npm run build` and commit `resources/dist`, because a Composer install does not run npm. Delete the Vite files, the `built-assets` job and `tests/Unit/ViteBuildTest.php` together if the add-on has no Control Panel assets.

### 3. Onboard to the sync

Add the repository to `shared/manifest.json` in `UAMS-Web/uams-claude-skills`, with the profiles `core`, `php`, `pest`, `laravel`, `laravel-package`, `statamic`, `statamic-package`, `tests` and `quality`, following that repository's `shared/README.md` ("Adding a repository"). The sync then opens a pull request that adds `.claude/`, `.agents/`, `.cursor/` and `AGENTS.md`.

Once the synced files are in, restore what depends on them:

- the `synced-files` job in `.github/workflows/ci.yml`, running `node .claude/skills/synced-files/scripts/check-synced-files.mjs`;
- the `mutation-instrument` job, running `composer test:mutation-instrument`, plus that script in `composer.json` (`@php .claude/skills/pcov-setup/scripts/check-mutation-instrument.php`) and in the `ci` script.

Add each restored job's name to the ruleset in the same change, in the order `ci.yml` describes.

### 4. Settings that live outside the repository

- The wiki: create its first page in the browser (Wiki tab, *Create the first page*) before the first `Publish wiki` run, and restrict editing to collaborators. The `github-wiki` skill has the detail. Delete `publish-wiki.yml` and `docs/wiki/` if the add-on will have no wiki.
- The organization ruleset "main: required checks" must list every job `name:` in `ci.yml` and the two pull-request-body workflows. `check-required-checks.yml` reports drift.
- A `LICENSE` and `composer.json`'s `license` field, once `UAMS-Web/uams-statamic#3039` is decided.

## Keeping the tooling separable

The generic tooling is meant to move into the sync later, so it sits in plain files (`scripts/`, the configuration files, `.github/`) with nothing in them specific to an add-on. Keep it that way: add-on logic goes in `src/` and `tests/`, not in the tooling.
