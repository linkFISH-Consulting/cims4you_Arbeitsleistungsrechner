/* global waitForKeyElements */
// ==UserScript==
// @name         cims4you_Arbeitsleistungsrechner
// @description  Arbeitsleistungsrechner
// @namespace    http://tampermonkey.net/
// @version      0.7.0
// @author       Florian Deutsch / linkFISH Consulting
// @match        https://www.cims4you.com/zeiterfassung.php*
// @require      https://www.cims4you.com/js/jquery-3.3.1.min.js
// @require      https://www.cims4you.com/js/free-jqgrid/js/jquery.jqgrid.min.js
// @require      https://gist.github.com/raw/2625891/waitForKeyElements.js
// @grant        GM_addStyle
// @run-at       document-idle
// @updateURL    https://github.com/linkFISH-Consulting/cims4you_Arbeitsleistungsrechner/releases/latest/download/cims4you_Arbeitsleistungsrechner.user.js
// @downloadURL  https://github.com/linkFISH-Consulting/cims4you_Arbeitsleistungsrechner/releases/latest/download/cims4you_Arbeitsleistungsrechner.user.js
// ==/UserScript==

(function () {
    'use strict';

    // ------------------------------------------------------------------
    // Konfiguration
    // ------------------------------------------------------------------

    // Zuordnung der benoetigten Felder.
    // Der Server liefert row.cell als Objekt mit benannten Keys ("name").
    // "index" dient nur noch als Fallback fuer das alte Array-Format.
    const FIELDS = {
        datum:      { index: 2,  name: 'datum' },
        bearbeiter: { index: 3,  name: 'bearbeiter' },
        taetigkeit: { index: 8,  name: 'taetigkeit' },
        stunden:    { index: 11, name: 'zeitaufwand' },
    };

    // Taetigkeiten, die als geleistete Arbeit zaehlen
    const IST_TAETIGKEITEN = [
        'Arbeitsleistung',
        'Supportleistungen',
        'Supportpauschale',
        'Dienstl.-pauschale',
    ];

    // Taetigkeiten, die die Soll-Stunden reduzieren
    const SOLL_ABZUG_TAETIGKEITEN = ['Feiertag', 'Krankheit', 'Urlaub'];

    // ------------------------------------------------------------------
    // Hilfsfunktionen
    // ------------------------------------------------------------------

    /** Liest ein Feld aus einer jqGrid-Zeile, egal welches Format der Server liefert. */
    function getField(row, field) {
        const cell = row.cell;
        if (Array.isArray(cell)) return cell[field.index];       // altes Format: Array
        if (cell && typeof cell === 'object') return cell[field.name]; // neues Format: Objekt
        return row[field.name]; // Fallback: Properties direkt auf der Zeile
    }

    /**
     * Benutzervergleich unabhaengig von der Wortreihenfolge:
     * "Florian Deutsch" und "Deutsch Florian" gelten als dieselbe Person.
     */
    function nameSchluessel(name) {
        return name.toLowerCase().split(/\s+/).filter(Boolean).sort().join(' ');
    }

    function istGleicherBenutzer(bearbeiter, aktuellerBenutzer) {
        if (typeof bearbeiter !== 'string' || bearbeiter.trim() === '') return false;
        return nameSchluessel(bearbeiter) === nameSchluessel(aktuellerBenutzer);
    }

    /** "27.07.2026" (ggf. mit Uhrzeit) -> Date. Gibt null zurueck bei ungueltiger Eingabe. */
    function parseGermanDate(input) {
        if (typeof input !== 'string') return null;
        const parts = input.match(/(\d+)/g);
        if (!parts || parts.length < 3) return null;
        return new Date(+parts[2], +parts[1] - 1, +parts[0]); // Jahr, Monat-1, Tag
    }

    /**
     * Liest den Namen aus der Begruessungszeile (unveraendert, z.B. "Deutsch Florian").
     * Die Wortreihenfolge ist egal, da der Vergleich reihenfolgeunabhaengig erfolgt.
     */
    function getAktuellenBenutzer() {
        return document.querySelector('.welcome b').innerText.trim();
    }

    // ------------------------------------------------------------------
    // Datenabruf
    // ------------------------------------------------------------------

    /** Laedt die Monats-Sollstunden. Ergebnis: { monat, bisHeute } */
    function ladeSollStunden(jahr, monat, heutigerTag) {
        return new Promise((resolve, reject) => {
            $.post(
                './extensions/ext_zeiterfassung/b_ze_monatssicht_tbl.php',
                { jahr, monat },
                (html) => {
                    const doc = new DOMParser().parseFromString(html, 'text/html');
                    const zellen = doc.querySelectorAll('td');

                    let bisHeute = 0;
                    // Ab Zelle 8 folgen 4er-Bloecke: Datum | Soll | ... | ...
                    for (let i = 8; i < zellen.length; i += 4) {
                        const datumText = zellen[i]?.firstChild?.data;
                        if (!datumText) continue;

                        const [tag, m, j] = datumText.split(',', 1)[0].split('.').map(Number);
                        if (tag <= heutigerTag && m === monat && j === jahr) {
                            bisHeute += parseFloat(zellen[i + 1]?.firstChild?.data) || 0;
                        }
                    }

                    const monatText = doc.querySelector('tbody tr td:nth-child(2)')?.innerText;
                    resolve({ monat: parseFloat(monatText) || 0, bisHeute });
                }
            ).fail(reject);
        });
    }

    /** Laedt alle Zeiteintraege fuer den Monat. Ergebnis: Array von Zeilen. */
    function ladeZeitEintraege(benutzer, jahr, monatFormat) {
        // Fuer den serverseitigen "contains"-Filter nur EIN Namenswort verwenden,
        // damit die Reihenfolge (Vorname/Nachname) keine Rolle spielt.
        // Die genaue Zuordnung passiert danach clientseitig via istGleicherBenutzer().
        const filterName = benutzer.split(/\s+/)[0] || benutzer;

        return new Promise((resolve, reject) => {
            $.get('./zeiterfassung_list_resultset.php', {
                _search: 'true',
                sidx: 'datum',
                sord: 'desc',
                rows: '10000',
                totalrows: '10000',
                filters: JSON.stringify({
                    groupOp: 'AND',
                    rules: [
                        { field: 'datum', op: 'cn', data: `${monatFormat}.${jahr}` },
                        { field: 'bearbeiter', op: 'cn', data: filterName },
                    ],
                }),
            }, (data) => {
                try {
                    resolve(JSON.parse(data).rows || []);
                } catch (e) {
                    reject(e);
                }
            }).fail(reject);
        });
    }

    // ------------------------------------------------------------------
    // Berechnung & Anzeige
    // ------------------------------------------------------------------

    function berechneUndZeige() {
        const benutzer = getAktuellenBenutzer();
        const jetzt = new Date();
        const jahr = jetzt.getFullYear();
        const monat = jetzt.getMonth() + 1;
        const tag = jetzt.getDate();
        const monatFormat = String(monat).padStart(2, '0');

        Promise.all([
            ladeSollStunden(jahr, monat, tag),
            ladeZeitEintraege(benutzer, jahr, monatFormat),
        ]).then(([soll, zeilen]) => {
            let sollMonat = soll.monat;
            let sollHeute = soll.bisHeute;
            let istMonat = 0;
            let istHeute = 0;

            // Einmalig die Rohstruktur loggen, um Format-/Spaltenaenderungen zu erkennen
            if (zeilen.length > 0) {
                console.log('Arbeitsleistungsrechner – Erste Zeile (roh):', zeilen[0]);
            }

            for (const zeile of zeilen) {
                const datum = parseGermanDate(getField(zeile, FIELDS.datum));
                if (!datum) {
                    console.warn('Zeile ohne gueltiges Datum uebersprungen:', zeile);
                    continue;
                }
                if (datum.getFullYear() !== jahr || datum.getMonth() + 1 !== monat) continue;
                if (!istGleicherBenutzer(getField(zeile, FIELDS.bearbeiter), benutzer)) continue;

                const taetigkeit = getField(zeile, FIELDS.taetigkeit);
                const stunden = parseFloat(getField(zeile, FIELDS.stunden)) || 0;
                const zeilenTag = datum.getDate();

                if (IST_TAETIGKEITEN.includes(taetigkeit)) {
                    istMonat += stunden;
                    if (zeilenTag <= tag) istHeute += stunden;
                } else if (SOLL_ABZUG_TAETIGKEITEN.includes(taetigkeit)) {
                    sollMonat -= stunden;
                    if (zeilenTag < tag) sollHeute -= stunden;
                }
            }

            const anteilHeute = sollHeute > 0 ? ((istHeute / sollHeute) * 100).toFixed(2) : '–';
            const anteilMonat = sollMonat > 0 ? ((istMonat / sollMonat) * 100).toFixed(2) : '–';

            console.log(`Anteil heute: (${istHeute}/${sollHeute}) * 100 = ${anteilHeute}`);
            console.log(`Anteil Monat: (${istMonat}/${sollMonat}) * 100 = ${anteilMonat}`);

            zeigeErgebnis(anteilHeute, anteilMonat);
        }).catch((err) => {
            console.error('Arbeitsleistungsrechner fehlgeschlagen:', err);
        });
    }

    function zeigeErgebnis(anteilHeute, anteilMonat) {
        $('#zeituebersicht_content .form-row').append(`
            <div style="display:inline-block; text-align:right; margin:0 0 0 80px">
                <b>Arbeitsleistung (Stand heute):</b><br>
                <b>Arbeitsleistung (Monat):</b>
            </div>
            <div style="display:inline-block; text-align:right; margin:0 0 0 10px">
                <b><span id="anteilHeute"></span>%</b><br>
                <b><span id="anteilMonat"></span>%</b>
            </div>
        `);
        $('#anteilHeute').text(anteilHeute);
        $('#anteilMonat').text(anteilMonat);
    }

    // ------------------------------------------------------------------
    // Start
    // ------------------------------------------------------------------

    // Nur im Browser gegen die echte Seite starten; in Node (z.B. fuer Tests) ueberspringen.
    if (typeof window !== 'undefined' && typeof waitForKeyElements !== 'undefined') {
        var $ = window.jQuery;

        waitForKeyElements('#gview_list_tagessicht', () => {
            window.jQuery ? berechneUndZeige() : console.error('jQuery nicht verfuegbar');
        });
    }

    // Reine Hilfsfunktionen fuer Unit-Tests unter Node exponieren, ohne das
    // Userscript im Browser zu beeinflussen.
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { parseGermanDate, nameSchluessel, istGleicherBenutzer, getField };
    }
})();