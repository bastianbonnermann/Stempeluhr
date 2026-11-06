STEMPELUHR 1.1 – direkter Gmail-Versand

1. Google Cloud-Projekt erstellen/auswählen.
2. Gmail API aktivieren.
3. Google Auth Platform / OAuth-Zustimmungsbildschirm konfigurieren; bei externer Test-App das eigene Google-Konto als Testnutzer hinzufügen.
4. OAuth-Client erstellen: Webanwendung.
5. Autorisierten JavaScript-Ursprung eintragen: https://bastianbonnermann.github.io
6. Client-ID kopieren. Kein Client Secret in die App eintragen.
7. In der Stempeluhr Einrichtung öffnen, Client-ID eintragen, speichern.
8. Gmail verbinden und gmail.send erlauben.

Die App verwendet ausschließlich https://www.googleapis.com/auth/gmail.send und kann damit keine E-Mails lesen. Die Client-ID ist öffentlich; Access Tokens werden nur im Arbeitsspeicher gehalten. Nach Ablauf kann Google erneut eine Autorisierung verlangen. Gmail API Versand erfolgt über users.messages.send.
