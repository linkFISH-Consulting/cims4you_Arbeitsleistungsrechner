'use strict';

// Verifies that the VERSION file, the userscript's "@version" header, and
// (when running in CI on a tag push) the git tag all agree. Run via `npm run verify-version`.

const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');
const version = fs.readFileSync(path.join(rootDir, 'VERSION'), 'utf8').trim();
const scriptContent = fs.readFileSync(
    path.join(rootDir, 'cims4you_Arbeitsleistungsrechner.user.js'),
    'utf8'
);

const match = scriptContent.match(/^\/\/\s*@version\s+(\S+)/m);
if (!match) {
    console.error('Could not find an "@version" line in the userscript header.');
    process.exit(1);
}

const scriptVersion = match[1];
if (scriptVersion !== version) {
    console.error(
        `Version mismatch: VERSION file says "${version}", but the userscript ` +
        `"@version" header says "${scriptVersion}". Keep both in sync.`
    );
    process.exit(1);
}

const tagRef = process.env.GITHUB_REF;
if (tagRef && tagRef.startsWith('refs/tags/')) {
    const tagVersion = tagRef.replace('refs/tags/', '').replace(/^v/, '');
    if (tagVersion !== version) {
        console.error(
            `Version mismatch: git tag "${tagRef}" does not match VERSION file "${version}".`
        );
        process.exit(1);
    }
}

console.log(`Version OK: ${version}`);
