# OGame Userscripts

Tampermonkey-Userscripts für OGame.

## Enthaltene Scripts

### OGame Stats Companion

Erweitert OGame um zusätzliche Statistik-, Analyse- und Komfortfunktionen.

**Installation:**

https://raw.githubusercontent.com/XellDincht/ogame-stats/main/userscripts/OGame-Stats-Companion.user.js

---

### OGame Spy One-Button

Vereinfacht das Bearbeiten von Spionageberichten.

Der große Aktionsbutton wechselt automatisch zwischen:

- 🛰 **Spionieren**
- ⏳ **Warten auf erfolgreichen Versand**
- 🗑 **Bericht löschen**
- anschließend wieder 🛰 **Spionieren** für den nächsten Bericht

**Installation:**

https://raw.githubusercontent.com/XellDincht/ogame-stats/main/userscripts/OGame-Spy-One-Button.user.js

---

## Installation auf einem neuen Gerät

1. Tampermonkey im Browser installieren.
2. Einen der oben angegebenen Installationslinks öffnen.
3. Tampermonkey erkennt die `.user.js`-Datei automatisch.
4. Auf **Installieren** klicken.
5. Für weitere Scripts wiederholen.

Nach der ersten Installation können zukünftige Updates automatisch über GitHub bezogen werden.

---

## Automatische Updates

Die Userscripts enthalten folgende Metadaten:

```js
// @updateURL    https://raw.githubusercontent.com/XellDincht/ogame-stats/main/userscripts/DATEINAME.user.js
// @downloadURL  https://raw.githubusercontent.com/XellDincht/ogame-stats/main/userscripts/DATEINAME.user.js
```

Damit kann Tampermonkey regelmäßig prüfen, ob auf GitHub eine neuere Version vorhanden ist.

### Wichtig

Bei jeder veröffentlichten Änderung muss die Versionsnummer im Userscript erhöht werden.

Beispiel:

```js
// @version      0.1.0
```

wird zu:

```js
// @version      0.1.1
```

Ohne eine höhere Versionsnummer erkennt Tampermonkey das Update möglicherweise nicht.

---

## Repository-Struktur

```text
ogame-stats/
│
├── docs/
├── ...
│
└── userscripts/
    ├── README.md
    ├── OGame-Stats-Companion.user.js
    └── OGame-Spy-One-Button.user.js
```

---

## Updates veröffentlichen

Nach einer Änderung:

```powershell
git add .
git commit -m "Update OGame userscripts"
git push
```

Danach steht die neue Version über GitHub Raw zur Verfügung.

Tampermonkey kann sie beim nächsten Update-Check übernehmen.
