# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.7.0] - 2026-07-27

### Added

- Unit tests (Node's built-in test runner) covering the pure calculation logic
  (`parseGermanDate`, `nameSchluessel`, `istGleicherBenutzer`, `getField`).
- ESLint configuration and a GitHub Actions workflow that runs lint + tests on every pull request.
- `VERSION` file and this changelog. Releases are tagged (`vX.Y.Z`) and published via GitHub
  Actions; the release zip archive includes the notes for that version.
- `@updateURL` / `@downloadURL` metadata so Tampermonkey can check for and install updates
  automatically from the latest GitHub release.

### Changed

- Reworked the script to support both the old array-based and the new object-based `row.cell`
  format returned by the server.
- User (`bearbeiter`) comparison is now word-order- and case-independent, so e.g. "Florian Deutsch"
  matches "Deutsch Florian".
- Data loading (`ladeSollStunden`, `ladeZeitEintraege`) now uses Promises instead of nested
  callbacks, and invalid rows/dates are skipped with a console warning instead of throwing.

## [0.1.0] - [0.6.0]

Predate this changelog. See the git history for details.
