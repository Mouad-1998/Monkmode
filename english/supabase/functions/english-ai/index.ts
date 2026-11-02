// english-ai – KI-Feedback für die Englisch-App (Mouad)
// Ruft Google Gemini (AI Studio, Free Tier) auf. Der Schlüssel liegt NUR hier als Secret GEMINI_API_KEY.
// Nur angemeldete Supabase-Nutzer, mit Tageslimit pro Nutzer (public.bump_ai_usage).
import { createClient } from "npm:@supabase/supabase-js@2";

const DAILY_LIMIT = Number(Deno.env.get("AI_DAILY_LIMIT") || "60");
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// Modelle: zuerst stärkere (Feedback), bei 404/429/5xx automatisch das nächste
const STRONG = [Deno.env.get("GEMINI_MODEL"), "gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-2.5-flash", "gemini-2.5-flash-lite"].filter(Boolean) as string[];
const LIGHT = [Deno.env.get("GEMINI_MODEL_LIGHT"), "gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-2.5-flash-lite", "gemini-3.6-flash", "gemini-2.5-flash"].filter(Boolean) as string[];

const CATS = "tenses, articles, prepositions, word_order, verb_forms, subject_verb_agreement, plural_countable, conditionals, modals, passive, gerund_infinitive, relative_clauses, comparatives, adjective_adverb, false_friends, word_choice, collocations, spelling, punctuation, style_register, questions_negation, pronouns";

const SYSTEM = `You are a warm but demanding English teacher for Mouad, a German native speaker at level B1–B2 who wants to write and speak really well (not tourist English).
Rules:
- Explanations for Mouad are in simple GERMAN (fields ending in _de). English examples stay English.
- Be precise and honest: point out every real mistake, but praise real strengths. Do not invent mistakes.
- Typical German-speaker issues matter: tense choice (present perfect vs past simple, since/for), word order, false friends (become/bekommen, actual/aktuell, eventually/eventuell), prepositions, articles, "make vs do", missing -s in 3rd person.
- Every mistake gets exactly one category from: ${CATS}.
- Output ONLY valid JSON matching the requested shape. No markdown, no code fences.`;

type Body = Record<string, any>;
const clip = (s: unknown, n: number) => String(s ?? "").slice(0, n);

function build(action: string, b: Body): { prompt: string; light: boolean; audio?: { mime: string; data: string } } {
  const level = clip(b.level || "B1-B2", 10);
  switch (action) {
    case "writing":
      return { light: false, prompt: `TASK: Correct Mouad's text. Level ${level}.
Writing prompt: """${clip(b.prompt, 600)}"""
${b.targetWords?.length ? `He should try to use these words: ${clip((b.targetWords || []).join(", "), 300)}. Check whether he used each correctly.` : ""}
Mouad's text: """${clip(b.text, 6000)}"""
Return JSON:
{"cefr":"A2|B1|B1+|B2|B2+|C1","score":0-100,"summary_de":"2-3 sentences overall feedback in German",
"strengths_de":["..."],
"corrected":"his full text with all mistakes fixed but his own style kept",
"mistakes":[{"original":"exact wrong snippet","correction":"fixed snippet","explanation_de":"short why in German","category":"one category"}],
"better_phrases":[{"original":"correct but plain phrase he used","better":"more natural / more advanced B2-C1 phrase","why_de":"..."}],
"target_words":[{"word":"...","used":true,"correct":true,"note_de":"..."}],
"vocab":[{"term":"useful English word/phrase for this topic he did not use","meaning_de":"German meaning","example":"English example sentence"}],
"next_tip_de":"one concrete thing to focus on next time"}
Max 12 mistakes (most important first), 3-5 better_phrases, 3 vocab.` };
    case "speaking":
      return { light: false, audio: b.audio, prompt: `TASK: Mouad answered a speaking task out loud. ${b.audio ? "The audio recording is attached. First transcribe exactly what he said (keep his mistakes, mark long pauses with …)." : "Here is the speech-recognition transcript (may contain recognition errors; be lenient with obvious recognition errors)."}
Speaking prompt: """${clip(b.prompt, 600)}"""
${b.transcript ? `Transcript: """${clip(b.transcript, 5000)}"""` : ""}
Return JSON:
{"transcript":"what he said","cefr":"A2|B1|B1+|B2|B2+|C1","fluency":1-10,"grammar":1-10,"vocabulary":1-10,
"summary_de":"2-3 sentences in German","strengths_de":["..."],
"mistakes":[{"original":"...","correction":"...","explanation_de":"...","category":"..."}],
"better_version":"a natural, spoken-style B2 version of his answer (similar length) he can read aloud to practise",
"useful_phrases":[{"phrase":"...","meaning_de":"..."}],
"pronunciation_de":"${b.audio ? "concrete pronunciation hints from the audio (th, w/v, word stress, final consonants...)" : "general hints for words in this answer German speakers often mispronounce"}",
"next_tip_de":"..."}
Max 10 mistakes, 3-4 useful_phrases.` };
    case "reading":
      return { light: true, prompt: `TASK: Mouad read a text and answered questions in English in his own words. Judge whether his answers show he understood, and correct his English.
Text: """${clip(b.text, 4000)}"""
Questions and his answers: ${clip(JSON.stringify(b.answers || []), 4000)}
Return JSON:
{"results":[{"q":"question","understood":"yes|partly|no","feedback_de":"short German feedback","model_answer":"a good short English answer","language_fix":"his answer with English corrected (or empty if fine)"}],
"score":0-100,"mistakes":[{"original":"...","correction":"...","explanation_de":"...","category":"..."}],"summary_de":"1-2 sentences"}` };
    case "explain":
      return { light: true, prompt: `TASK: Explain an English word or phrase for Mouad's vocabulary notebook.
Word/phrase: """${clip(b.term, 120)}"""
Context sentence: """${clip(b.context, 600)}"""
Return JSON: {"term":"base form (e.g. infinitive, lemma; keep phrases)","meaning_de":"German meaning(s) in this context","explanation_en":"simple English definition (B1 level)","example":"new natural English example","register":"neutral|informal|formal","note_de":"optional tip, e.g. false friend, typical collocation, or empty"}` };
    case "vocab_check":
      return { light: true, prompt: `TASK: Vocabulary check. The target word is "${clip(b.term, 120)}" (meaning: ${clip(b.meaning, 300)}). Task given to Mouad: ${clip(b.task, 300)}
Mouad's answer: """${clip(b.answer, 1000)}"""
Is the word used/explained correctly and naturally? Return JSON: {"correct":true|false,"rating":"wrong|ok|good|great","feedback_de":"short German feedback","better":"an improved version of his sentence/explanation"}` };
    case "text":
      return { light: true, prompt: `TASK: Write a fresh reading text for Mouad (German, 20s, into discipline/"monk mode", sport, self-improvement, learning, tech, everyday life; vary topics). Level ${level}, 170-230 words, engaging, real-world, with 5-7 useful B2 words/phrases. Topic idea: ${clip(b.topic || "surprise me", 120)}. Avoid these recent titles: ${clip((b.avoid || []).join("; "), 600)}.
Return JSON: {"title":"...","topic":"one word","text":"...","phrases":[{"term":"phrase exactly as in text","meaning_de":"German","explanation_en":"simple English definition"}],
"questions":[{"type":"meaning","q":"What does \\"...\\" mean in the text? Explain in your own words.","hint_de":"..."},{"type":"meaning","q":"...","hint_de":"..."},{"type":"opinion","q":"a personal question connected to the text","hint_de":"..."}]}` };
    case "grammar":
      return { light: true, prompt: `TASK: Check Mouad's answers to grammar exercises on "${clip(b.topic, 120)}".
Exercises with expected answers and his answers: ${clip(JSON.stringify(b.items || []), 3000)}
Accept alternative correct answers. Return JSON: {"results":[{"ok":true|false,"feedback_de":"short German explanation"}]}` };
    default:
      throw new Error("unknown action");
  }
}

async function gemini(key: string, models: string[], prompt: string, audio?: { mime: string; data: string }) {
  const parts: any[] = [{ text: prompt }];
  if (audio?.data) parts.push({ inline_data: { mime_type: clip(audio.mime, 60).split(";")[0] || "audio/webm", data: audio.data } });
  let lastErr = "no model";
  for (const model of [...new Set(models)]) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.4, maxOutputTokens: 16384 },
      }),
    });
    if (r.ok) {
      const d = await r.json();
      const txt = (d.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || "").join("");
      try { return { model, result: JSON.parse(txt.replace(/^```(json)?|```$/g, "").trim()) }; }
      catch { lastErr = "invalid JSON from " + model; continue; }
    }
    const t = await r.text();
    lastErr = `${model}: ${r.status} ${t.slice(0, 200)}`;
    if (r.status === 400 && /API key|API_KEY/i.test(t)) throw Object.assign(new Error("bad_key"), { code: "bad_key" });
    if (r.status === 403) throw Object.assign(new Error("bad_key"), { code: "bad_key" });
    // 404 (Modell gibt's nicht), 429 (Limit), 5xx -> nächstes Modell
  }
  throw Object.assign(new Error(lastErr), { code: /429/.test(lastErr) ? "quota" : "ai_failed" });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  // 1) Angemeldeten Nutzer prüfen
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "auth", message: "Bitte anmelden." }, 401);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: u, error: ue } = await admin.auth.getUser(token);
  if (ue || !u?.user) return json({ error: "auth", message: "Bitte (neu) anmelden." }, 401);

  let body: Body;
  try { body = await req.json(); } catch { return json({ error: "bad_request" }, 400); }
  const action = String(body.action || "");

  if (action === "status") {
    const { data } = await admin.from("ai_usage").select("count").eq("user_id", u.user.id).eq("day", new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" })).maybeSingle();
    return json({ ok: true, configured: !!Deno.env.get("GEMINI_API_KEY"), used: data?.count || 0, limit: DAILY_LIMIT });
  }

  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return json({ error: "no_key", message: "KI ist noch nicht eingerichtet (GEMINI_API_KEY fehlt)." }, 503);
  if (body.audio?.data && body.audio.data.length > 8_000_000) return json({ error: "too_large", message: "Aufnahme zu lang (max. ca. 3 Minuten)." }, 413);

  let job;
  try { job = build(action, body); } catch { return json({ error: "bad_request", message: "Unbekannte Aktion." }, 400); }

  // 2) Tageslimit pro Nutzer
  const { data: n, error: be } = await admin.rpc("bump_ai_usage", { p_user: u.user.id, p_limit: DAILY_LIMIT });
  if (be) return json({ error: "server", message: be.message }, 500);
  if (n === -1) return json({ error: "limit", message: `Tageslimit erreicht (${DAILY_LIMIT} KI-Anfragen). Morgen geht's weiter!` }, 429);

  // 3) Gemini
  try {
    const out = await gemini(key, job.light ? LIGHT : STRONG, job.prompt, job.audio);
    return json({ ok: true, model: out.model, used: n, limit: DAILY_LIMIT, result: out.result });
  } catch (e: any) {
    const code = e.code || "ai_failed";
    const msg = code === "bad_key" ? "Der Gemini-API-Schlüssel ist ungültig." : code === "quota" ? "Das kostenlose Gemini-Kontingent ist gerade erschöpft – versuch es später nochmal." : "KI-Fehler, bitte nochmal versuchen.";
    console.error("gemini", e.message);
    return json({ error: code, message: msg }, code === "quota" ? 429 : 502);
  }
});
