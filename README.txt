STEMPELUHR 0.3.1 – Korrektur der Display-Suche und OCR-Zeitfilter

Neu:
- Farbsegmentierung mit toleranterem Blau-/Cyan-Farbbereich und 8-Nachbar-Komponenten.
- Größerer Display-Ausschnitt mit Vergrößerung.
- Fallback auf einen großzügigen zentralen Ausschnitt und bei Bedarf Gesamtfoto.
- Zeitparser ignoriert OCR-Zeilen, die ein Datum/Jahr enthalten, damit Datumsbestandteile nicht als Uhrzeit missverstanden werden.
- Korrigierte sichtbare Versionsnummer und HTML-Zeilenumbrüche.

Datenschutz:
Foto und Ausschnitte werden im Browser verarbeitet, nicht an einen OCR-Dienst hochgeladen und nicht dauerhaft in Galerie/Cloud gespeichert. Tesseract.js und Sprachdaten werden vom CDN geladen.

Update:
Alle Dateien aus diesem Ordner direkt ins Repository-Hauptverzeichnis hochladen und überschreiben. Danach GitHub Pages Deployment abwarten und Seite neu laden.
