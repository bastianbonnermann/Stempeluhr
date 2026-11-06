STEMPELUHR 1.0

Vereinfachte Version ohne Kamera und Bilderkennung.

Funktionen:
- Zeigt Datum und lokale Uhrzeit des Smartphones.
- Aktualisiert die aktuelle Uhrzeit automatisch.
- Korrektur der zu versendenden Uhrzeit in 1- und 5-Minuten-Schritten.
- Zurücksetzen auf die aktuelle Smartphone-Zeit.
- Arbeits-E-Mail-Adresse wird lokal auf dem Gerät gespeichert.
- Öffnet einen vorbereiteten E-Mail-Entwurf über mailto.

Wichtiger Hinweis zum Versand:
Diese Version versendet die E-Mail nicht vollautomatisch über die Gmail-API.
Sie öffnet die auf dem Smartphone konfigurierte E-Mail-App (idealerweise Gmail)
mit Empfänger, Betreff und Nachrichtentext. Der Nutzer prüft und sendet die Mail
selbst. Das ist absichtlich ohne OAuth-Client-ID, Server oder gespeicherte
Zugangsdaten umgesetzt. Ein echter API-Versand mit Gmail-Autorisierung kann
später ergänzt werden.

Datenschutz:
- Keine Kamera und keine Fotos.
- Keine externe OCR- oder CV-Bibliothek.
- Die Empfängeradresse wird in localStorage auf dem Gerät gespeichert.
- Datum und Uhrzeit kommen aus der lokalen Geräteuhr.

Installation:
Alle Dateien in das Hauptverzeichnis des GitHub-Pages-Repositories hochladen
und vorhandene Dateien überschreiben. Danach Pages-Deployment abwarten und
die Website neu laden. Der Service-Worker-Cache wurde auf stempeluhr-1.0 gesetzt.
