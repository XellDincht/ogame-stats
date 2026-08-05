# OGame Imperiumsübersicht v8.4.0

## Änderungen

- `account.html` ist jetzt eine eigene, aufgeräumte Seite für die Imperiumsübersicht.
- Der alte Bereich „Accountdaten“ wurde entfernt.
- Die Umschaltung „Dashboard“ wurde entfernt; die neue Ansicht ist direkt geöffnet.
- Die Datenquellen-Auswahl wurde vollständig entfernt.
- Die private Accountansicht verwendet fest Supabase.
- In der Hauptnavigation heißt der Link nun „Imperiumsübersicht“.
- In den Planetenkarten werden große SVG-Icons für Metall, Kristall und Deuterium verwendet.
- Die Produktionswerte in den Karten sind größer und schneller lesbar.
- Die Lebensform wird primär anhand der tatsächlich gebauten Lebensformgebäude erkannt. Dadurch wird Rock’tal nicht mehr fälschlich als Menschen angezeigt.
- Die Bonusspalte ist nur noch im Reiter „Forschung“ sichtbar.
- Normale Forschungen zeigen bekannte aktuelle Boni, z. B. Laderaum, Panzerung, Waffen, Schilde, Triebwerke und Plasmaförderung.
- Lebensformforschungen bleiben je Volk einklappbar; die aktuelle Lebensform wird geöffnet.
- „Schiffswerft“ heißt „Flotte“.

## Installation

Den Inhalt dieses Projektordners über den aktuellen Repository-Inhalt kopieren und veröffentlichen.

Wichtig: `account-data.json` und `account-data-source.js` wurden absichtlich entfernt, da sie nur zur alten Accountdaten-Ansicht gehörten.
