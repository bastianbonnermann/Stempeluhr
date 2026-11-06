STEMPELUHR VERSION 1.2
======================

Dateien im Paket:
- index.html             Hauptseite der App (Anzeige Version 1.2)
- app.js                 Gmail-Anmeldung und E-Mail-Versand
- style.css              Gestaltung
- sw.js                  Service Worker; Cache-Version stempeluhr-1.2
- manifest.webmanifest   PWA-Einstellungen für Startbildschirm
- icon-192.png           App-Symbol
- icon-512.png           App-Symbol in hoher Auflösung

INSTALLATION / GITHUB
1. Alle Dateien dieses Ordners in das Hauptverzeichnis des bestehenden
   GitHub-Repositories Stempeluhr hochladen.
2. Vorhandene gleichnamige Dateien überschreiben.
3. Änderungen committen.
4. Einige Minuten warten, dann die GitHub-Pages-App neu laden.
5. Falls das Smartphone noch die alte Fassung zeigt: App vollständig
   schließen und erneut öffnen. Falls nötig Browser-Website-Daten bzw.
   den App-Cache für GitHub Pages löschen und erneut laden.

WICHTIG
- Die OAuth-Client-ID und Empfängeradresse werden lokal im Browser gespeichert.
- Das Google-Zugriffstoken wird nur im Arbeitsspeicher gehalten. Nach einem
  vollständigen Neuladen muss Gmail daher erneut per Klick verbunden werden.
- Der Versand benötigt Internetzugang und die Gmail-Sendeberechtigung.
- Der Schutz vor versehentlichem Doppelversand merkt sich lokal die bereits
  erfolgreich versendete Kombination aus Empfänger, Datum und Uhrzeit.
- Wenn dieselbe Zeit absichtlich erneut gesendet werden soll, muss die
  Zeitangabe geändert werden. Die lokale Versandhistorie kann im Browser-
  Speicher gelöscht werden; dadurch wird nur der lokale Duplikatschutz entfernt.
