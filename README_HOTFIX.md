# v8.5.1 HOTFIX – Homepage zeigt Binärdaten

Die angezeigten Zeichen waren der Binärinhalt von `favicon.ico`.
Dieses Paket entfernt vorübergehend alle Favicon-Dateien und Favicon-Verweise.

## Reparatur

1. Den Inhalt dieses Ordners vollständig über den veröffentlichten Website-Ordner kopieren.
2. Besonders prüfen, dass diese Datei echte HTML enthält:

   C:\Ogame\site\index.html

3. Publish erneut ausführen.
4. Browser-Tab schließen, neu öffnen und Strg+F5 drücken.

Die drei zentralen Dateien wurden geprüft und beginnen mit `<!doctype html>`:

- index.html
- account.html
- account-dashboard/index.html

Das Favicon bauen wir erst wieder ein, wenn die Homepage sicher funktioniert.
