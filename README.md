# cims4you Arbeitsleistungsrechner

Tampermonkey userscript for the [cims4you](https://www.cims4you.com) Zeiterfassung page. It
calculates and displays your "Arbeitsleistung" (work performance) as a percentage, for today and
for the current month, based on your logged time entries vs. the required (Soll) hours.

## Install

1. Install the [Tampermonkey](https://www.tampermonkey.net/) browser extension.
2. Install the script from the
   [latest release](https://github.com/linkFISH-Consulting/cims4you_Arbeitsleistungsrechner/releases/latest/download/cims4you_Arbeitsleistungsrechner.user.js).
3. Open the Zeiterfassung page on cims4you.com — the percentages appear next to the daily overview.

The script auto-updates via Tampermonkey once installed (checks the latest GitHub release).

## Development

```sh
npm ci
npm run lint          # ESLint
npm test               # unit tests (Node's built-in test runner)
npm run verify-version # checks VERSION file matches the script's @version header
```

## Releasing

1. Bump the version in `VERSION` and in the `@version` header of
   `cims4you_Arbeitsleistungsrechner.user.js` (keep them identical).
2. Add an entry to `CHANGELOG.md`.
3. Merge to `master` (or run the *Release* workflow manually). If the version is new, CI tags it
   and publishes a GitHub release with the script and a zip archive containing the release notes.

See [CHANGELOG.md](CHANGELOG.md) for release history.
