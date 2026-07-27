'use strict';

// Extracts the release notes for a given version from CHANGELOG.md, e.g.:
//   node scripts/extract-changelog.js 0.7.0
// Defaults to the version in the VERSION file when no argument is given.

const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');
const version = process.argv[2] || fs.readFileSync(path.join(rootDir, 'VERSION'), 'utf8').trim();
const changelog = fs.readFileSync(path.join(rootDir, 'CHANGELOG.md'), 'utf8');

// Matches a heading like "## [0.7.0] - 2026-07-27" or just "## [0.7.0]".
const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const headingPattern = new RegExp(`^## \\[${escapedVersion}\\].*$`, 'm');
const startMatch = headingPattern.exec(changelog);

if (!startMatch) {
    console.error(`No CHANGELOG.md entry found for version ${version}.`);
    process.exit(1);
}

const rest = changelog.slice(startMatch.index + startMatch[0].length);
const nextHeadingMatch = /^## \[/m.exec(rest);
const section = (nextHeadingMatch ? rest.slice(0, nextHeadingMatch.index) : rest).trim();

process.stdout.write(section + '\n');
