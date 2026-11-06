STEMPELUHR 1.4.1 – LOKALE APP MIT GEKOPPELTEM MAILDIENST

ZIEL
- Die App-Oberfläche, Uhr und Symbole werden auf dem S25 FE durch die installierte PWA lokal bereitgehalten.
- Nur der E-Mail-Versand benötigt Internet und den Google-Apps-Script-Dienst.
- Kein Tagesprotokoll.
- Kein Gmail-OAuth-Dialog beim täglichen Öffnen.

SICHERHEIT / GERÄTEKOPPLUNG
Der Apps-Script-Webdienst muss als Web-App „Ausführen als: Ich“ und „Zugriff: Jeder“ bereitgestellt werden, damit die lokale GitHub-Pages-App den JSONP-Endpunkt ohne interaktive Google-Anmeldung erreichen kann.
Der Versand ist zusätzlich durch einen einmaligen Kopplungscode und einen zufälligen Geräteschlüssel geschützt. Der Kopplungscode wird NICHT in GitHub abgelegt. Er wird im Apps-Script-Editor erzeugt, einmalig auf dem Smartphone eingegeben und danach serverseitig entwertet. Der Geräteschlüssel bleibt im lokalen Browser-Speicher.
Wichtig: „Jeder“ bedeutet, dass der technische Endpunkt öffentlich erreichbar ist. Ohne den geheimen Geräteschlüssel ist kein Versand möglich. Der Schlüssel ist ein Gerätezugang, keine Hardware-ID; bei Verlust des Geräts bitte im Apps-Script-Editor geraetEntkoppeln() ausführen und neu koppeln.

DATEIEN FÜR GITHUB PAGES (Repository-Stammverzeichnis)
index.html
app.js
style.css
manifest.webmanifest
sw.js
icon-192.png
icon-512.png

DATEI FÜR GOOGLE APPS SCRIPT
Code.gs

REIHENFOLGE
1. Code.gs im Apps-Script-Projekt ersetzen und speichern.
2. Im Editor erstelleKopplungscode() ausführen. Den Code aus dem Ausführungsprotokoll sicher notieren.
3. Bestehende Web-App-Bereitstellung bearbeiten, neue Version auswählen. „Ausführen als: Ich“ und „Zugriff: Jeder“ einstellen. Erst nach bewusster Prüfung bereitstellen.
4. Die Web-App-URL in app.js bei API_URL eintragen, falls Google eine andere URL zeigt.
5. Die sieben App-Dateien ins GitHub-Pages-Stammverzeichnis hochladen und gleichnamige Dateien ersetzen.
6. Auf dem Smartphone GitHub-Pages-Seite öffnen, PWA installieren und einmalig mit dem Kopplungscode verbinden.

VERSANDREGELN
- Empfänger ist fest im Code: bastian.bonnermann@unilux.de
- Maximal drei E-Mails pro Tag
- Mindestens 60 Sekunden Abstand
- Unmittelbar gleiche Datum/Uhrzeit-Kombination wird abgewiesen
- Bei Zeitüberschreitung zuerst das Firmenpostfach prüfen, bevor erneut gesendet wird
