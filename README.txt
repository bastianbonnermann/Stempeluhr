STEMPELUHR 3.0

DATEIEN
- index.html, style.css, app.js: Anwendung
- manifest.webmanifest: Installation als App
- sw.js: Offline-Cache
- icons/: App-Symbole

INSTALLATION AUF GITHUB PAGES
1. ZIP entpacken.
2. Alle enthaltenen Dateien und den Ordner icons in das Stammverzeichnis des bestehenden GitHub-Repositories hochladen.
3. Vorhandene gleichnamige Dateien ersetzen.
4. GitHub Pages wie bisher verwenden.
5. Auf dem Smartphone die Seite neu laden. Erst nach erfolgreichem Test die alte Verknuepfung ersetzen.

WICHTIG
- Code.gs wird nicht benoetigt.
- Daten werden nur lokal im Browser gespeichert (localStorage).
- Neue Daten verwenden den Speicherbereich stempeluhr_events_v3.
- Alte Versionen werden nicht automatisch importiert.
- CSV-Export: Semikolon-getrennt, UTF-8 mit BOM, Spalten:
  Datum; Kommen; Gehen; Kennzeichen; Bemerkung; Weitere Buchungen
- Nach dem Export koennen genau die exportierten Buchungen nach Bestaetigung geloescht werden.
- Abwesenheits-Zeitraeume lassen Samstage und Sonntage aus; Feiertage werden fuer jeden Kalendertag angelegt.
- Die App ist keine automatische Synchronisation zwischen Geraeten. Regelmaessig CSV exportieren und sichern.

HINWEIS ZUR EXCEL-ANPASSUNG
Der Export ist eine erste Arbeitsfassung auf Basis des gezeigten Tabellenaufbaus.
Der spaetere VBA-Import wird anhand der Original-Arbeitsmappe noch exakt angepasst.
