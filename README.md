# Monk Mode – PWA (Deutsch)
Statische PWA: index.html, styles.css, app.js, sw.js, manifest.json, icons/.
Daten: localStorage (Schlüssel `monkmode.v1`), Export/Import als JSON unter „Mehr“.

Gehostet auf GitHub Pages: https://mouad-1998.github.io/Monkmode/
Bei Änderungen CACHE-Version in sw.js erhöhen.

## v2 (02.11.2026)
- Standard-Gewohnheiten (Sport, Schlaf 22–5, Lesen 1 Seite, Lernen 60 Min) per Migration ergänzt (flag `defaultsAdded`, nichts gelöscht).
- Habit-Typen: check / count / timer / sleep. Social-Media-Minuten (`social`), Sperre > Limit (Standard 120).
- Wochenscore Mo–Sa (`weekScores` wird nach Samstag eingefroren), Sonntag = Freier Tag (`sunday`).
- sw.js: Cache `monk-mode-v2`, jetzt network-first.
