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

## v4 – Neugestaltung + robuste Speicherung (04.11.2026)
- „Gewohnheiten“-Bereich entfernt: **Monk Mode = deine Ziele** (`S.goals`, Typen check / minutes / pages / count / sleep), anlegen, bearbeiten, löschen, sortieren. Optionaler Challenge-Zeitraum (`S.challenge`).
- Migration v1–v3 → v4 (`store.js: migrateState`): `habits` → `goals` (gleiche IDs, Verlauf bleibt), Monk-Regeln → Abhak-Ziele (`ruleLog` → `log`), `monk` → `challenge`, `monkHistory` → `challengeHistory`, `timer` → `focus`. Originalstand bleibt als `localStorage['monkmode.v3.original']` und IndexedDB `snap:vor-v4`.
- Heute: Countdown bis Schlafenszeit + Mitternacht, Tagesbalken, Fortschritt (Ziele, Minuten, Seiten, Serie, „Scrollen ersetzt“), rotierende Zitate, Fokus-Timer, „Statt Scrollen“-Vorschläge (an offene Ziele gekoppelt, 1 Tipp zum Starten/Eintragen).
- Speicherung: jede Änderung synchron in localStorage (`monkmode.v1`), zusätzlich IndexedDB (`monkmode/kv/state`) + Tages-Snapshots (21 Tage), Flush bei pagehide/visibilitychange/freeze, `navigator.storage.persist()`, Wiederherstellung aus IndexedDB, Hinweise bei In-App-Browser / Safari-Tab.
- Sync: Zeitstempel pro Eintrag (`S.ts`) → Ent-Haken/Änderungen überleben das Zusammenführen; Änderungen während eines Uploads gehen nicht mehr verloren (`localRev`); eine leere Cloud-Zeile überschreibt nie echte lokale Daten; vor jeder Cloud-Übernahme lokaler Snapshot.
- sw.js: Cache `monk-mode-v5`, löscht nur eigene `monk-mode-*`-Caches, ignoriert `english/`, skipWaiting + clients.claim, Update-Hinweis „Neue Version ist da“.
