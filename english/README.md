# English Daily – PWA (UI Deutsch, Lerninhalte Englisch)
Statische PWA für Mouad (B1–B2, ~15 Min/Tag). Gleiche Technik wie Monk Mode: index.html, styles.css, app.js, sync.js,
content-texts.js (20 Lesetexte), content-learn.js (19 Grammatik-Lektionen, 18 Schreib-, 16 Sprechaufgaben, Level),
sw.js (Cache `english-daily-v1`, network-first), manifest.json, icons/, vendor/supabase.js. Relative Pfade → läuft in jedem Unterordner (z. B. GitHub Pages).

## Tages-Session (Mo–Sa, Sonntag optional frei)
1. Wiederholen (~3 Min): Spaced Repetition (Boxen 0–7: 0/1/3/7/14/30/60/120 Tage), aktiv: Wort eintippen bzw. eigenen Satz schreiben (KI prüft).
2. Lesen (~4 Min): Text + Vorlesen (TTS), Wort antippen → KI-Erklärung → speichern; 3 Fragen in eigenen Worten (KI-Bewertung oder Musterlösung + Selbstcheck).
3. Schreiben (Mo/Mi/Fr) oder Sprechen (Di/Do/Sa), tauschbar: KI-Korrektur mit Diff, erklärten Fehlern, besseren Formulierungen, CEFR, Wort-Challenge. Sprechen: Aufnahme (MediaRecorder → WAV 16 kHz) + Live-Transkript (Web Speech API, falls vorhanden), KI-Feedback, „bessere Version“ zum Shadowing.
4. Grammatik-Kick (~2 Min): Lektion passend zu den häufigsten Fehlern der letzten 30 Tage, 4 Tipp-Übungen.
XP, Level, Serie (Sonntag bricht sie nicht), Wochen-Score Mo–Sa, Fehler-Tagebuch, Texte-Archiv, Wochenrückblick.

## Supabase (Projekt monk-mode, dlrnygtprbhfrnabmvwv)
- Tabelle `public.english_data` (user_id PK, data jsonb, updated_at) – RLS: nur eigene Zeile (select/insert/update).
- Tabelle `public.ai_usage` (user_id, day, count) – RLS: Nutzer darf nur lesen; Zählen nur über `public.bump_ai_usage()` (nur service_role).
- Edge Function `english-ai` (supabase/functions/english-ai/index.ts): prüft Login selbst (verify_jwt=false + auth.getUser), Tageslimit `AI_DAILY_LIMIT` (Standard 60), ruft Gemini auf.
- Secrets (Dashboard → Edge Functions → Secrets): `GEMINI_API_KEY` (Pflicht), optional `GEMINI_MODEL`, `GEMINI_MODEL_LIGHT`, `AI_DAILY_LIMIT`.
- Auth: eigener storageKey `english-auth` (eigene Anmeldung, gleiches Konto wie Monk Mode möglich). Site-URL/Redirect-URL der neuen Adresse in Auth → URL Configuration ergänzen.

Bei Änderungen CACHE-Version in sw.js erhöhen.
