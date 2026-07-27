const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
    parseGermanDate,
    nameSchluessel,
    istGleicherBenutzer,
    getField,
} = require('../cims4you_Arbeitsleistungsrechner.user.js');

test('parseGermanDate parses a dd.mm.yyyy date string into the correct Date', () => {
    const result = parseGermanDate('27.07.2026');

    assert.equal(result.getFullYear(), 2026);
    assert.equal(result.getMonth(), 6); // zero-based month
    assert.equal(result.getDate(), 27);
});

test('parseGermanDate parses single-digit day and month correctly', () => {
    const result = parseGermanDate('05.03.2026, 10:00 Uhr');

    assert.equal(result.getFullYear(), 2026);
    assert.equal(result.getMonth(), 2);
    assert.equal(result.getDate(), 5);
});

test('parseGermanDate returns null for invalid input', () => {
    assert.equal(parseGermanDate(''), null);
    assert.equal(parseGermanDate('kein datum'), null);
    assert.equal(parseGermanDate(undefined), null);
});

test('nameSchluessel is order-independent and case-insensitive', () => {
    assert.equal(nameSchluessel('Florian Deutsch'), nameSchluessel('Deutsch Florian'));
    assert.equal(nameSchluessel('FLORIAN deutsch'), nameSchluessel('florian DEUTSCH'));
    assert.notEqual(nameSchluessel('Florian Deutsch'), nameSchluessel('Max Mustermann'));
});

test('istGleicherBenutzer matches regardless of name word order', () => {
    assert.equal(istGleicherBenutzer('Deutsch Florian', 'Florian Deutsch'), true);
    assert.equal(istGleicherBenutzer('Max Mustermann', 'Florian Deutsch'), false);
    assert.equal(istGleicherBenutzer('', 'Florian Deutsch'), false);
    assert.equal(istGleicherBenutzer(undefined, 'Florian Deutsch'), false);
});

test('getField reads from the old array-based row.cell format', () => {
    const row = { cell: ['a', 'b', '27.07.2026'] };
    assert.equal(getField(row, { index: 2, name: 'datum' }), '27.07.2026');
});

test('getField reads from the new object-based row.cell format', () => {
    const row = { cell: { datum: '27.07.2026' } };
    assert.equal(getField(row, { index: 2, name: 'datum' }), '27.07.2026');
});

test('getField falls back to a property directly on the row', () => {
    const row = { datum: '27.07.2026' };
    assert.equal(getField(row, { index: 2, name: 'datum' }), '27.07.2026');
});
