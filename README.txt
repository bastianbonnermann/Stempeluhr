STEMPELUHR 0.2 – Kamera + OCR-Prototyp

Änderungen:
- OCR-Texterkennung für Datum (TT.MM.JJJJ) und Uhrzeit (HH:MM)
- Erkennung läuft im Browser auf dem Smartphone.
- Das aufgenommene Foto wird nicht an einen OCR-Dienst hochgeladen und nicht dauerhaft gespeichert.
- Kamera-Vorschau-Platzhalter verschwindet nach der Aufnahme.
- App-Symbole liegen direkt im Hauptverzeichnis, passend zu den Manifest-Pfaden.

Hinweis zur OCR:
Beim ersten Start werden OCR-Programm und Sprach-/Erkennungsdaten aus einem CDN geladen. Das Foto selbst wird lokal im Browser verarbeitet. Die erste Erkennung kann daher etwas dauern und benötigt eine Internetverbindung.
Die KABA-Anzeige ist fotografisch nicht immer perfekt lesbar. Datum und Uhrzeit müssen vor dem Versand immer kontrolliert werden.

Noch NICHT enthalten:
- Gmail-Autorisierung und echter E-Mail-Versand.

Upload:
Alle Dateien einschließlich icon-192.png und icon-512.png direkt in das Hauptverzeichnis des GitHub-Repositorys hochladen und vorhandene Dateien überschreiben. Danach auf GitHub Pages den neuen Deploy abwarten.


Korrektur v0.2.1:
- Die erkannte Datumszeichenfolge wird vor der Uhrzeitsuche entfernt.
- Dadurch wird z.B. der Datumsanfang 06.11 nicht mehr fälschlich als 06:11 interpretiert.
- Service-Worker-Cache wurde erhöht, damit das Update geladen wird.
