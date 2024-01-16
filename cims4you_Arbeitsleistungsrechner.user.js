// ==UserScript==
// @name         cims4you_Arbeitsleistungsrechner
// @namespace    http://tampermonkey.net/
// @version      0.4
// @author       Florian Deutsch / linkFISH Consulting
// @match        https://www.cims4you.com/zeiterfassung.php*
// @require      https://www.cims4you.com/js/jquery-3.3.1.min.js
// @require      https://www.cims4you.com/js/free-jqgrid/js/jquery.jqgrid.min.js
// @require      https://gist.github.com/raw/2625891/waitForKeyElements.js
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function() {
    waitForKeyElements("#gview_list_tagessicht", function () {

    'use strict';
    var $ = window.jQuery;

    // aktuellen Benutzer und Datum ermitteln
    var benutzerArr = document.querySelector(".welcome b").innerText.split(" ", 2);
    var aktuellerBenutzer = benutzerArr[1] + " " + benutzerArr[0];
    var currentdate = new Date();
    var cur_day = currentdate.getDate();
    var cur_month = currentdate.getMonth() + 1;
    var cur_year =currentdate.getFullYear();
    var cur_month_format = ('0' + (currentdate.getMonth()+1)).slice(-2);
      
    // Variablen Monatsberechnung
    var sollStundenMonat = 0.0;
    var sollStundenHeute = 0.0;
    var istStundenMonat = 0.0;
    var istStundenHeute = 0.0;

    // Monat SOLL
    $.post('./extensions/ext_zeiterfassung/b_ze_monatssicht_tbl.php', { jahr: cur_year, monat : cur_month},
    function(returnedData){
        var monatSollHtml = new DOMParser().parseFromString(returnedData, 'text/html');
        var tableCells = monatSollHtml.querySelectorAll("td");

        for (var i = 8; i < tableCells.length; i+=4){
            var tagMonatJahr = tableCells[i].firstChild.data.split(",", 1)[0].split('.');
            var sollTag = tagMonatJahr[0];
            var sollMonat = tagMonatJahr[1];
            var sollJahr = tagMonatJahr[2];

            // ermittle SollStunden heute
            if(sollTag <= cur_day && cur_month == sollMonat && cur_year == sollJahr)
            {
                var sollStundenTag = parseFloat(tableCells[i+1].firstChild.data);
                sollStundenHeute = sollStundenHeute + sollStundenTag;
            }
        }

        var monatSoll = monatSollHtml.querySelector('tbody tr td:nth-child(2)').innerText;        
        sollStundenMonat = parseFloat(monatSoll);
    });

    // Monat IST
    $.get('./zeiterfassung_list_resultset.php', {
        _search: "true",
        sidx: "datum",
        sord: "desc",
        rows: "10000",
        totalrows: "10000",
        filters: '{"groupOp":"AND","rules":[{"field":"datum","op":"cn","data":"' + cur_month_format + '.' + cur_year.toString() + '"},{"field":"bearbeiter","op":"cn","data":"' + aktuellerBenutzer + '"}]}'
        }, function(data) {
        var record = JSON.parse(data);

        for (var i = 0; i < record.rows.length; i++){

            var eintrag = record.rows[i].cell;
            var zeit = parseDate(eintrag[2]);
            var year = zeit.getFullYear();
            var month = zeit.getMonth() + 1;
            var day = zeit.getDate();						            
            
            // ermittle Ist-Stunden Monat
            if(cur_month == month && year == cur_year)              
            {
                var benutzer = eintrag[3];
                var kunde = eintrag[4];
                var auftrag = eintrag[5];
                var typ = eintrag[8];
                var stundenVorschlag = eintrag[11];
                // check for current user
                if(benutzer == aktuellerBenutzer){
                    var stunden = eintrag[11];
                    var taetigkeit = eintrag[8];

                    // Arbeitsleistung / Support Services addieren
                    var zaehlenWenn = ["Arbeitsleistung", "Supportleistungen", "Supportpauschale"];
                    if( zaehlenWenn.indexOf(taetigkeit) > -1 ){
                        istStundenMonat = istStundenMonat + stunden;

                        // ermittle Ist-Stunden Heute
                        if(day <= cur_day){
                            istStundenHeute = istStundenHeute + stunden;
                        }
                    }

                    var sollAbzug = ["Feiertag", "Krankheit", "Urlaub"];
                    if(sollAbzug.indexOf(taetigkeit) > -1){
                        console.log("Abzug: " + stunden);
                        sollStundenMonat = sollStundenMonat - stunden;

                        // ermittle Soll-Stunden Heute
                        if(day <= cur_day){
                            sollStundenHeute = sollStundenHeute - stunden;
                        }
                    }

                }
            }
        }

        var anteilArbeitsLeistungHeute = ((istStundenHeute/sollStundenHeute) * 100).toFixed(2);
        var anteilArbeitsLeistungMonat = ((istStundenMonat/sollStundenMonat) * 100).toFixed(2);

        console.log("Berechnung Anteil heute: (" + istStundenHeute + "/" + sollStundenHeute + ") * 100 = " + anteilArbeitsLeistungHeute);
        console.log("Berechnung Anteil Monat: (" + istStundenMonat + "/" + sollStundenMonat + ") * 100 = " + anteilArbeitsLeistungMonat);
        // schoenen Platz suchen
        var placementRow = document.querySelector("#zeituebersicht_content .form-row");
        $("#zeituebersicht_content .form-row").append( `
    <div style="display: inline-block; text-align:right; margin: 0px 0px 0px 80px">
      <b>Arbeitsleistung (Stand heute):</b><br>
      <b>Arbeitsleistung (Monat):</b>
    </div>
    <div style="display: inline-block; text-align:right; margin: 0px 0px 0px 10px">
      <b><span id="anteilHeute">100</span>%</b><br>
      <b><span id="anteilMonat">100</span>%</b>
    </div>
` );
        $("#anteilHeute").text(anteilArbeitsLeistungHeute);
        $("#anteilMonat").text(anteilArbeitsLeistungMonat);

    });
   });
})();

function parseDate(input) {
  var parts = input.match(/(\d+)/g);
  // note parts[1]-1
  return new Date(parts[2], parts[1]-1, parts[0]);
}

