STEMPELUHR 0.4 – geometrische Display-Erkennung

Neu:
- Lädt OpenCV.js im Browser.
- Erkennt rechteckige Konturen im Gesamtfoto über Graustufen, Blur, Canny-Kanten, Konturensuche und Viereck-Approximation.
- Wählt einen plausiblen rechteckigen Displaykandidaten und korrigiert Perspektive per WarpPerspective.
- Zeigt den entzerrten Ausschnitt an.
- Fallback auf zentralen Ausschnitt, falls kein eindeutiges Display-Rechteck gefunden wird.
- OCR akzeptiert Uhrzeit mit Doppelpunkt und entfernt das erkannte Datum zuerst.

Datenschutz / Netzwerk:
- Foto und Zuschnitt werden lokal im Browser verarbeitet; es wird kein Foto an einen OCR- oder CV-Server übertragen.
- OpenCV.js, Tesseract.js und die Sprachdaten werden beim Laden von externen CDNs bezogen.
- Keine dauerhafte Fotoablage in Galerie/Cloud.

Wichtig:
Automatische Rechteckerkennung ist eine Heuristik. Sie kann auch ein anderes Rechteck im Bild auswählen. Deshalb muss der angezeigte Ausschnitt kontrolliert werden und Datum/Uhrzeit müssen vor Versand überprüft werden.
Gmail-Versand ist weiterhin nicht aktiviert.

Update:
Alle Dateien direkt in das Repository-Hauptverzeichnis hochladen und überschreiben. Service-Worker-Cache-Version ist v04.
