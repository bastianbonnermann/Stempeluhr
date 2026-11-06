STEMPELUHR 1.4 – INSTALLATION

WICHTIG
Version 1.4 ersetzt die Browser-Verknuepfung durch eine installierbare PWA.
Die App-Dateien werden nach Installation durch Chrome lokal zwischengespeichert.
Der E-Mail-Versand benoetigt weiterhin Internet und den Google-Apps-Script-Maildienst.

DATEIEN FUER GITHUB PAGES (Repository-Stammverzeichnis)
index.html
app.js
style.css
manifest.webmanifest
sw.js
icon-192.png
icon-512.png

DATEI FUER GOOGLE APPS SCRIPT
Code.gs

INSTALLATIONSREIHENFOLGE
1. In Google Apps Script die bestehende Code.gs durch die mitgelieferte Code.gs ersetzen und speichern.
2. Bereitstellen > Bereitstellungen verwalten > Bearbeiten (Stiftsymbol) > Version: Neue Version > Bereitstellen.
   Die Zugriffsberechtigung bleibt auf „Nur ich selbst“, Ausfuehren als bleibt dein Konto.
   Die Web-App-URL bleibt normalerweise dieselbe. Falls Google eine neue URL anzeigt, muss sie in app.js in API_URL eingetragen werden.
3. Die sieben PWA-Dateien (ohne Code.gs und README.txt) in das Stammverzeichnis des GitHub-Pages-Repositories hochladen und gleichnamige Dateien ersetzen.
4. Die GitHub-Pages-Adresse auf dem S25 FE in Chrome oeffnen. Chrome-Menue > Installieren.
5. Die alte Stempeluhr-Verknuepfung erst entfernen, wenn Version 1.4 erfolgreich installiert und getestet ist.

HINWEISE
- Es gibt kein lokales Tagesprotokoll mehr.
- Die App speichert keine Gmail-Anmeldedaten und fordert keine Gmail-OAuth-Verbindung an.
- Die serverseitige Apps-Script-Funktion begrenzt den Versand auf drei E-Mails pro Tag, mindestens 60 Sekunden Abstand und blockiert unmittelbar doppelte Datum/Uhrzeit-Kombinationen.
- Bei einer Versand-Zeitueberschreitung zuerst das Firmenpostfach kontrollieren, bevor erneut gesendet wird.
- Die App-Oberflaeche und Symbole werden lokal gecacht; der Mailversand ist online-only.
