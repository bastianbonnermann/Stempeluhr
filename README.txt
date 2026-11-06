STEMPELUHR 0.1 – Prototyp

Enthalten:
- Mobile Oberfläche
- Kamera öffnen und Foto aufnehmen
- Foto wird nur in der laufenden Seite im Arbeitsspeicher angezeigt
- Datum/Uhrzeit-Eingabefelder und E-Mail-Vorschau
- PWA-Grundgerüst für Installation

Noch NICHT enthalten:
- Automatische OCR-Erkennung der KABA-Anzeige
- Gmail-Autorisierung und echter E-Mail-Versand

Test:
1. Dateien auf einen Webserver mit HTTPS hochladen (oder lokal über localhost starten).
2. Auf dem Samsung Galaxy S25 FE in Chrome öffnen.
3. Kamerazugriff erlauben.
4. Foto aufnehmen und Vorschau prüfen.

Wichtig:
Kamerazugriff funktioniert in der Regel nur über HTTPS oder localhost.
Der Prototyp versendet noch keine E-Mail. Die Empfängeradresse ist nur ein lokales Eingabefeld.
Das Foto wird nicht in Galerie/Dateisystem geschrieben. Es bleibt während der geöffneten Seite im Speicher und wird beim Neuladen/Schließen der Seite freigegeben.
