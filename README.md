# Monk Mode – PWA (Deutsch)
Statische PWA: index.html, styles.css, app.js, sw.js, manifest.json, icons/.
Daten: localStorage (Schlüssel `monkmode.v1`), Export/Import als JSON unter „Mehr“.

Deploy (live, anonym, läuft am 16.11.2026 ab): https://9283a27867564d85.flypod.page
Update: `cd /workspace/monk-deploy && npx flypod update` (vorher Dateien aus diesem Ordner kopieren).
Bei Änderungen CACHE-Version in sw.js erhöhen.
Dauerhaft: `npx flypod login` (claimt die Seite), oder GitHub Pages / Netlify / Vercel / Cloudflare Pages.

## v2 (02.11.2026)
- Standard-Gewohnheiten (Sport, Schlaf 22–5, Lesen 1 Seite, Lernen 60 Min) per Migration ergänzt (flag `defaultsAdded`, nichts gelöscht).
- Habit-Typen: check / count / timer / sleep. Social-Media-Minuten (`social`), Sperre > Limit (Standard 120).
- Wochenscore Mo–Sa (`weekScores` wird nach Samstag eingefroren), Sonntag = Freier Tag (`sunday`).
- sw.js: Cache `monk-mode-v2`, jetzt network-first.
