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

## v3 – Konto & Cloud-Sync (Supabase)
- Supabase-Projekt `monk-mode` (Ref `dlrnygtprbhfrnabmvwv`, eu-central-1 Frankfurt, Free-Plan).
- Tabelle `public.user_data` (user_id uuid PK → auth.users, data jsonb, updated_at timestamptz), RLS: jeder Nutzer nur eigene Zeile (select/insert/update).
- Client: `vendor/supabase.js` (supabase-js 2.118.0 UMD, lokal mitgeliefert → offline gecacht), `sync.js` (Login, Sync, Merge). Nur der Publishable Key ist im Client.
- Sync: lokale Änderung → nach 1,5 s Upload; beim Öffnen/Wieder-sichtbar/online → Abgleich. Konflikte: Abhakungen werden vereinigt, sonst gewinnt die neuere Version.
- sw.js: Cache `monk-mode-v4`.
- Manuell im Supabase-Dashboard: Authentication → URL Configuration → Site URL `https://mouad-1998.github.io/Monkmode/` und als Redirect URL eintragen.
