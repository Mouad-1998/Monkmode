'use strict';
/* ===== English Daily – Mouads Englisch-App (B1–B2, 15 Min/Tag) ===== */
const KEY = 'english.v1';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const pad = n => String(n).padStart(2, '0');
const dkey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseD = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (k, n) => { const d = parseD(k); d.setDate(d.getDate() + n); return dkey(d); };
const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const WDL = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const fmtD = k => { const d = parseD(k); return `${WD[d.getDay()]}, ${d.getDate()}.${d.getMonth() + 1}.`; };
const words = s => (String(s).trim().match(/[A-Za-zÀ-ÿ0-9'’-]+/g) || []).length;
const today = () => window.__TODAY || dkey();

const XP = { review: 5, reviewMax: 50, read: 30, readAI: 10, write: 50, speak: 50, grammar: 25, session: 20, extra: 15 };
const SRS = [0, 1, 3, 7, 14, 30, 60, 120]; // Tage je Box
const CAT_DE = {
  tenses: 'Zeitformen', articles: 'Artikel', prepositions: 'Präpositionen', word_order: 'Satzstellung', verb_forms: 'Verbformen',
  subject_verb_agreement: 'he/she/it + s', plural_countable: 'Zählbar/Plural', conditionals: 'If-Sätze', modals: 'Modalverben', passive: 'Passiv',
  gerund_infinitive: '-ing / to', relative_clauses: 'Relativsätze', comparatives: 'Vergleiche', adjective_adverb: 'Adjektiv/Adverb',
  false_friends: 'Falsche Freunde', word_choice: 'Wortwahl', collocations: 'Wortpaare (make/do)', spelling: 'Rechtschreibung',
  punctuation: 'Zeichensetzung', style_register: 'Stil & Verbindungen', questions_negation: 'Fragen/Verneinung', pronouns: 'Pronomen'
};

/* ---------- State ---------- */
function defaultState() {
  return { v: 1, createdAt: Date.now(), updatedAt: 0, firstDay: null,
    settings: { sundayFree: true, accent: 'en-GB', rate: 0.95, aiTexts: false },
    days: {}, vocab: {}, deleted: {}, mistakes: [], writings: [], speakings: [], readings: {}, grammarDone: {}, aiTexts: [], drafts: {} };
}
let S = load();
function load() {
  try { const raw = JSON.parse(localStorage.getItem(KEY)); if (raw) return Object.assign(defaultState(), raw, { settings: Object.assign(defaultState().settings, raw.settings || {}) }); } catch (e) {}
  return defaultState();
}
function writeLocal() { localStorage.setItem(KEY, JSON.stringify(S)); }
function save() { S.updatedAt = Date.now(); writeLocal(); if (window.onLocalSave) window.onLocalSave(); }
function migrate() { if (!S.firstDay) S.firstDay = today(); }
migrate();

const day = (k = today()) => (S.days[k] = S.days[k] || { steps: {}, xp: 0 });
const totalXP = () => Object.values(S.days).reduce((a, d) => a + (d.xp || 0), 0);
function addXP(n, k = today()) { day(k).xp = (day(k).xp || 0) + n; }
function levelInfo(xp = totalXP()) {
  let i = 0; while (i < LEVELS.length - 1 && xp >= LEVELS[i + 1].xp) i++;
  const cur = LEVELS[i], nxt = LEVELS[i + 1];
  return { n: i + 1, name: cur.name, xp, from: cur.xp, to: nxt ? nxt.xp : cur.xp, pct: nxt ? (xp - cur.xp) / (nxt.xp - cur.xp) : 1 };
}
const isSunday = k => parseD(k).getDay() === 0;
const freeDay = k => S.settings.sundayFree && isSunday(k);

/* ---------- Tagesplan ---------- */
const STEPS = [
  { id: 'review', icon: '🔁', name: 'Wiederholen', min: 3, desc: 'Deine Wörter aktiv abrufen' },
  { id: 'read', icon: '📖', name: 'Lesen & Verstehen', min: 4, desc: 'Text lesen, Bedeutungen erklären' },
  { id: 'main', icon: '✍️', name: 'Schreiben', min: 6, desc: '' },
  { id: 'grammar', icon: '🧩', name: 'Grammatik-Kick', min: 2, desc: 'Passend zu deinen Fehlern' }
];
function mainType(k = today()) {
  const d = day(k); if (d.mainType) return d.mainType;
  const wd = parseD(k).getDay(); return [1, 3, 5].includes(wd) ? 'write' : wd === 0 ? 'write' : 'speak';
}
function allTexts() { return [...TEXTS, ...S.aiTexts]; }
function textById(id) { return allTexts().find(t => t.id === id); }
function todaysText(k = today()) {
  const d = day(k); if (d.textId && textById(d.textId)) return textById(d.textId);
  const used = new Set(Object.values(S.days).map(x => x.textId).filter(Boolean));
  const unreadAI = S.aiTexts.find(t => !used.has(t.id) && !S.readings[t.id]);
  const unreadBuilt = TEXTS.find(t => !used.has(t.id) && !S.readings[t.id]);
  const t = (S.settings.aiTexts && unreadAI) || unreadBuilt || unreadAI || TEXTS[(Object.keys(S.days).length) % TEXTS.length];
  d.textId = t.id; writeLocal(); return t;
}
function rotate(list, usedIds, key, k) {
  const d = day(k); if (d[key]) return list.find(x => x.id === d[key]) || list[0];
  const it = list.find(x => !usedIds.has(x.id)) || list[Object.keys(S.days).length % list.length];
  d[key] = it.id; writeLocal(); return it;
}
const todaysWriting = (k = today()) => rotate(WRITING, new Set(S.writings.map(w => w.promptId)), 'writeId', k);
const todaysSpeaking = (k = today()) => rotate(SPEAKING, new Set(S.speakings.map(w => w.promptId)), 'speakId', k);
function mistakeStats(days = 30) {
  const from = addDays(today(), -days); const c = {};
  S.mistakes.filter(m => m.date >= from).forEach(m => { c[m.category] = (c[m.category] || 0) + 1; });
  return Object.entries(c).sort((a, b) => b[1] - a[1]);
}
function todaysGrammar(k = today(), persist = true) {
  const d = day(k); if (d.grammarId) return GRAMMAR.find(g => g.id === d.grammarId);
  const recent = id => S.grammarDone[id] && S.grammarDone[id].date >= addDays(k, -6);
  let pick = null, reason = '';
  for (const [cat, n] of mistakeStats()) {
    const g = GRAMMAR.find(g => g.cat === cat && !recent(g.id));
    if (g) { pick = g; reason = `Du hattest zuletzt ${n}× Fehler bei „${CAT_DE[cat] || cat}“.`; break; }
  }
  if (!pick) { pick = GRAMMAR.find(g => !S.grammarDone[g.id]) || GRAMMAR.filter(g => !recent(g.id)).sort((a, b) => (S.grammarDone[a.id].date < S.grammarDone[b.id].date ? -1 : 1))[0] || GRAMMAR[0]; reason = 'Typische Stolperfalle für Deutsche.'; }
  if (persist) { d.grammarId = pick.id; d.grammarReason = reason; writeLocal(); } return pick;
}
function dueCards(k = today()) { return Object.values(S.vocab).filter(v => !S.deleted[v.id] && (v.due || '0') <= k).sort((a, b) => (a.due || '').localeCompare(b.due || '') || a.box - b.box); }
function stepDone(id, k = today()) { const d = S.days[k]; return !!(d && d.steps && d.steps[id]); }
function sessionDone(k = today()) { return STEPS.every(s => stepDone(s.id, k)); }
function completeStep(id, xp, k = today()) {
  const d = day(k); const was = sessionDone(k);
  if (!d.steps[id]) { d.steps[id] = Date.now(); addXP(xp, k); } else if (xp) addXP(Math.round(xp / 3), k);
  let bonus = false;
  if (!was && sessionDone(k)) { addXP(XP.session, k); d.done = true; bonus = true; }
  save(); return bonus;
}
function streak() {
  let k = today(), n = 0;
  if (!sessionDone(k)) k = addDays(k, -1);
  for (let i = 0; i < 2000; i++) {
    if (sessionDone(k)) n++;
    else if (!freeDay(k)) break;
    k = addDays(k, -1);
    if (k < (S.firstDay || k)) break;
  }
  return n;
}
function bestStreak() {
  const ks = Object.keys(S.days).filter(k => sessionDone(k)).sort(); let best = 0, cur = 0, prev = null;
  for (const k of ks) {
    if (prev) { let g = addDays(prev, 1); while (g < k && freeDay(g)) g = addDays(g, 1); cur = g === k ? cur + 1 : 1; } else cur = 1;
    best = Math.max(best, cur); prev = k;
  }
  return Math.max(best, streak());
}
function weekStart(k = today()) { const d = parseD(k); const wd = (d.getDay() + 6) % 7; return addDays(k, -wd); }
function weekStats(ws = weekStart()) {
  const ks = [...Array(7)].map((_, i) => addDays(ws, i));
  const work = ks.slice(0, 6);
  const done = work.filter(k => sessionDone(k)).length;
  const steps = work.reduce((a, k) => a + STEPS.filter(s => stepDone(s.id, k)).length, 0);
  return { ks, done, score: Math.round(steps / 24 * 100), xp: ks.reduce((a, k) => a + ((S.days[k] || {}).xp || 0), 0),
    words: Object.values(S.vocab).filter(v => v.created >= ws && v.created <= ks[6]).length,
    writes: S.writings.filter(w => w.date >= ws && w.date <= ks[6]).length, speaks: S.speakings.filter(w => w.date >= ws && w.date <= ks[6]).length };
}

/* ---------- Vokabeln ---------- */
function findVocab(term) { const n = norm(term); return Object.values(S.vocab).find(v => !S.deleted[v.id] && norm(v.term) === n); }
function addVocab(o, silent) {
  if (!o.term || !o.term.trim()) return null;
  const ex = findVocab(o.term); if (ex) { if (!silent) toast('Schon in deinen Wörtern ✓'); return ex; }
  const v = { id: uid(), term: o.term.trim(), meaning: (o.meaning || '').trim(), expl: o.expl || '', example: o.example || '', note: o.note || '', source: o.source || '', created: today(), box: 0, due: today(), reps: 0, lapses: 0, updatedAt: Date.now() };
  S.vocab[v.id] = v; save(); if (!silent) toast(`„${v.term}“ gespeichert 📌`); return v;
}
function gradeCard(v, g) { // g: 0 falsch, 1 schwer, 2 gut, 3 leicht
  v.reps = (v.reps || 0) + 1;
  if (g === 0) { v.box = 1; v.lapses = (v.lapses || 0) + 1; v.due = addDays(today(), 1); }
  else { v.box = Math.min(SRS.length - 1, (v.box || 0) + (g === 1 ? 0 : g === 2 ? 1 : 2)); if (v.box < 1) v.box = 1; v.due = addDays(today(), g === 1 ? Math.max(1, Math.round(SRS[v.box] / 2)) : SRS[v.box]); }
  v.last = today(); v.updatedAt = Date.now();
}

/* ---------- Textvergleich ---------- */
function norm(s) {
  return String(s || '').toLowerCase().replace(/[’‘`´]/g, "'").replace(/[“”„]/g, '"')
    .replace(/\bcan't\b/g, 'can not').replace(/\bcannot\b/g, 'can not').replace(/\bwon't\b/g, 'will not').replace(/\bshan't\b/g, 'shall not')
    .replace(/n't\b/g, ' not').replace(/'m\b/g, ' am').replace(/'re\b/g, ' are').replace(/'ve\b/g, ' have').replace(/'ll\b/g, ' will').replace(/'d\b/g, ' would')
    .replace(/[^a-z0-9à-ÿ' ]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function lev(a, b) { const m = a.length, n = b.length; const d = [...Array(n + 1).keys()]; for (let i = 1; i <= m; i++) { let p = d[0]; d[0] = i; for (let j = 1; j <= n; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1)); p = t; } } return d[n]; }
function checkExercise(ex, input) {
  const n = norm(input); if (!n) return false;
  const opts = new Set(ex.a.map(norm));
  const m = ex.q.match(/"([^"]*___[^"]*)"/);
  if (m) ex.a.forEach(a => { if (!/,|\.\.\./.test(a)) opts.add(norm(m[1].replace(/\([^)]*\)\s*/g, '').replace('___', a))); });
  return opts.has(n);
}
function diffWords(a, b) { // LCS-Wortdiff → HTML
  a = String(a || ''); b = String(b || '');
  const tok = x => x.split(/(\s+|[.,!?;:"“”()])/).filter(t => t !== '' && t !== undefined);
  const A = tok(a), B = tok(b);
  const m = A.length, n = B.length; if (m * n > 600000) return esc(b);
  const L = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
  for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const ops = []; let i = 0, j = 0;
  while (i < m && j < n) { if (A[i] === B[j]) { ops.push(['=', A[i]]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) ops.push(['-', A[i++]]); else ops.push(['+', B[j++]]); }
  while (i < m) ops.push(['-', A[i++]]); while (j < n) ops.push(['+', B[j++]]);
  let out = '', prev = '';
  for (const [op, t] of ops) {
    const ws = /^\s+$/.test(t);
    if (op === '=') { out += esc(t); prev = ws ? prev : '='; }
    else if (op === '-') { if (ws) { if (prev === '-') out += ' '; } else { out += (prev === '+' ? ' ' : '') + `<del>${esc(t)}</del>`; prev = '-'; } }
    else { if (ws) { out += t; prev = '='; } else { out += (prev === '-' ? ' ' : '') + `<ins>${esc(t)}</ins>`; prev = '+'; } }
  }
  return out.replace(/<\/del>(\s*)<del>/g, '$1').replace(/<\/ins>(\s*)<ins>/g, '$1').replace(/ {2,}/g, ' ');
}

/* ---------- Sprache (TTS) ---------- */
let voices = [];
function loadVoices() { try { voices = speechSynthesis.getVoices(); } catch (e) {} }
if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
function pickVoice() {
  const acc = S.settings.accent; const en = voices.filter(v => /^en[-_]/i.test(v.lang));
  return en.find(v => v.lang.replace('_', '-') === acc && /natural|premium|enhanced|google/i.test(v.name)) || en.find(v => v.lang.replace('_', '-') === acc) || en[0] || null;
}
let speakingBtn = null;
function speak(text, btn) {
  if (!('speechSynthesis' in window)) { toast('Vorlesen wird hier nicht unterstützt'); return; }
  if (speechSynthesis.speaking) { speechSynthesis.cancel(); if (speakingBtn) speakingBtn.classList.remove('playing'); if (speakingBtn === btn) { speakingBtn = null; return; } }
  const u = new SpeechSynthesisUtterance(text); const v = pickVoice(); if (v) u.voice = v; u.lang = v ? v.lang : S.settings.accent; u.rate = S.settings.rate;
  speakingBtn = btn || null; if (btn) btn.classList.add('playing');
  u.onend = u.onerror = () => { if (btn) btn.classList.remove('playing'); if (speakingBtn === btn) speakingBtn = null; };
  speechSynthesis.speak(u);
}
const sayBtn = (text, label = '🔊') => `<button class="say" data-act="say" data-text="${esc(text)}" aria-label="Vorlesen">${label}</button>`;

/* ---------- KI ---------- */
window.aiState = { configured: null, used: 0, limit: 0 };
const aiReady = () => !!(window.sbClient && window.sbUser && aiState.configured !== false);
async function ai(action, payload) {
  if (!window.sbClient || !window.sbUser) throw Object.assign(new Error('Für KI-Feedback bitte unter „Mehr“ anmelden.'), { code: 'login' });
  if (!navigator.onLine) throw Object.assign(new Error('Keine Internetverbindung.'), { code: 'offline' });
  const { data, error } = await window.sbClient.functions.invoke('english-ai', { body: Object.assign({ action, level: 'B1-B2' }, payload) });
  if (error) {
    let j = null; try { j = await error.context.json(); } catch (e) {}
    if (j && j.error === 'no_key') aiState.configured = false;
    throw Object.assign(new Error((j && j.message) || error.message || 'KI-Fehler'), { code: (j && j.error) || 'ai' });
  }
  if (data && data.used != null) { aiState.used = data.used; aiState.limit = data.limit; aiState.configured = true; }
  return data.result;
}
window.refreshAiStatus = async function () {
  if (!window.sbClient || !window.sbUser) { aiState.configured = null; return; }
  try { const { data } = await window.sbClient.functions.invoke('english-ai', { body: { action: 'status' } }); if (data) Object.assign(aiState, { configured: data.configured, used: data.used, limit: data.limit }); } catch (e) {}
  if (!route.screen && (route.tab === 'more' || route.tab === 'today')) renderKeepScroll();
};
function aiNote() {
  if (!window.sbUser) return `<div class="note">💡 <b>KI-Feedback:</b> Melde dich unter <a href="#" data-act="tab" data-tab="more">Mehr → Konto</a> an, dann wird dein Englisch automatisch korrigiert. Ohne Konto kannst du trotzdem üben und selbst prüfen.</div>`;
  if (aiState.configured === false) return `<div class="note">💡 Die KI ist noch nicht eingerichtet (Gemini-Schlüssel fehlt). Du kannst trotzdem üben – mit Musterlösungen und Selbstcheck.</div>`;
  return '';
}
function aiErrBox(e) { return `<div class="note err">⚠️ ${esc(e.message || e)}</div>`; }
function addMistakes(list, source) {
  (list || []).forEach(m => { if (!m || !m.original) return; S.mistakes.push({ id: uid(), date: today(), original: m.original, correction: m.correction, explanation: m.explanation_de || m.explanation || '', category: CAT_DE[m.category] ? m.category : 'word_choice', source }); });
  if (S.mistakes.length > 800) S.mistakes = S.mistakes.slice(-800);
}

/* ---------- Routing ---------- */
let route = { tab: 'today', screen: null, p: {} };
let tmp = {};
function go(tab) { route = { tab, screen: null, p: {} }; tmp = {}; render(); window.scrollTo(0, 0); }
window.go = go;
function open(screen, p = {}) { route = { tab: route.tab, screen, p, back: { screen: route.screen, p: route.p } }; tmp = {}; render(); window.scrollTo(0, 0); }
function back() { if (route.back && route.back.screen) { route = { tab: route.tab, screen: route.back.screen, p: route.back.p }; } else route = { tab: route.tab, screen: null, p: {} }; tmp = {}; if ('speechSynthesis' in window) speechSynthesis.cancel(); stopRec(true); render(); window.scrollTo(0, 0); }
function renderKeepScroll() { const y = window.scrollY; render(); window.scrollTo(0, y); }
function setTitle(t, sub = '', showBack = false) {
  $('#title').textContent = t; $('#subtitle').innerHTML = sub;
  $('#backBtn').classList.toggle('hidden', !showBack);
}
const TABS = {}, SCREENS = {}, AFTER = {};
function render() {
  $$('.tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === route.tab));
  const v = $('#view');
  const scr = route.screen && SCREENS[route.screen];
  v.innerHTML = scr ? scr(route.p) : TABS[route.tab]();
  if (scr && AFTER[route.screen]) AFTER[route.screen](route.p);
  if (!scr && AFTER['tab_' + route.tab]) AFTER['tab_' + route.tab]();
}
window.render = render;

/* ---------- Heute ---------- */
TABS.today = function () {
  const k = today(), d = day(k), st = streak(), lv = levelInfo();
  setTitle('Heute', `${WDL[parseD(k).getDay()]}, ${parseD(k).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })}`);
  const free = freeDay(k);
  const doneN = STEPS.filter(s => stepDone(s.id, k)).length;
  const mt = mainType(k);
  let h = `<div class="hero">
    <div class="stat"><b>🔥 ${st}</b><span>Tage Serie</span></div>
    <div class="stat"><b>⭐ ${lv.xp}</b><span>XP · Lvl ${lv.n}</span></div>
    <div class="stat"><b>📌 ${Object.values(S.vocab).filter(v => !S.deleted[v.id]).length}</b><span>Wörter</span></div></div>
    <div class="lvl"><div class="row between small"><span><b>${esc(lv.name)}</b></span><span class="muted">${lv.to > lv.xp ? `${lv.to - lv.xp} XP bis Level ${lv.n + 1}` : 'Max-Level!'}</span></div><div class="bar"><i style="width:${Math.round(lv.pct * 100)}%"></i></div></div>`;
  if (free && !d.freeStart && !doneN) {
    h += `<div class="card free center"><div class="big">🌿</div><h3>Sonntag – freier Tag</h3><p class="muted">Deine Serie läuft weiter, auch wenn du heute nichts machst. Lust auf Englisch? Such dir aus, was dir Spaß macht.</p>
      <div class="btns col"><button class="btn primary" data-act="freestart">Trotzdem Tages-Session machen (+XP)</button>
      <button class="btn" data-act="tab" data-tab="practice">Frei üben: Lieblingsaufgabe wählen</button>
      <button class="btn" data-act="open" data-s="week">📊 Wochenrückblick ansehen</button></div></div>`;
    return h + weekMini();
  }
  if (sessionDone(k)) h += `<div class="card done-card center"><div class="big">🏆</div><h3>Session geschafft!</h3><p class="muted">+${d.xp} XP heute. ${st > 1 ? `Schon ${st} Tage in Folge – stark!` : 'Morgen geht’s weiter.'}</p><button class="btn block" data-act="tab" data-tab="practice">Noch mehr üben (+XP)</button></div>`;
  h += `<div class="card"><div class="row between"><h2 style="margin:0">Deine 15 Minuten</h2><span class="pill">${doneN}/4</span></div>`;
  STEPS.forEach((s, i) => {
    const done = stepDone(s.id, k);
    let name = s.name, desc = s.desc, icon = s.icon;
    if (s.id === 'main') { if (mt === 'speak') { name = 'Sprechen'; icon = '🎙️'; desc = todaysSpeaking(k).title; } else desc = todaysWriting(k).title; }
    if (s.id === 'review') { const n = dueCards(k).length; desc = n ? `${n} ${n === 1 ? 'Wort' : 'Wörter'} fällig` : (Object.keys(S.vocab).length ? 'Nichts fällig – super!' : 'Noch keine Wörter – sie kommen aus deinen Texten'); }
    if (s.id === 'read') desc = todaysText(k).title;
    if (s.id === 'grammar') desc = todaysGrammar(k, false).title;
    const next = !done && STEPS.slice(0, i).every(x => stepDone(x.id, k));
    h += `<button class="step ${done ? 'done' : ''} ${next ? 'next' : ''}" data-act="step" data-id="${s.id}">
      <span class="sicon">${done ? '✓' : icon}</span><span class="grow"><span class="sname">${name}</span><span class="sdesc">${esc(desc)}</span></span><span class="smin">${s.min} Min</span></button>`;
  });
  h += `<div class="row between small" style="margin-top:10px"><span class="muted">Heute: ${mt === 'write' ? 'Schreiben' : 'Sprechen'} (wechselt täglich)</span>${d.steps.main ? '' : `<button class="link" data-act="swapmain">↔ Lieber ${mt === 'write' ? 'sprechen' : 'schreiben'}</button>`}</div></div>`;
  h += aiNote();
  h += weekMini();
  return h;
};
function weekMini() {
  const w = weekStats(); const t = today();
  return `<div class="card"><div class="row between"><h2 style="margin:0">Diese Woche</h2><span class="pill">Score ${w.score}%</span></div><div class="weekdots">${w.ks.map(k => {
    const done = sessionDone(k), part = STEPS.some(s => stepDone(s.id, k)); const sun = isSunday(k);
    return `<div class="wd ${done ? 'done' : part ? 'part' : ''} ${k === t ? 'today' : ''}"><i>${done ? '✓' : sun && S.settings.sundayFree ? '🌿' : ''}</i><span>${WD[parseD(k).getDay()]}</span></div>`; }).join('')}</div>
    <p class="muted small" style="margin:8px 0 0">${w.done}/6 Sessions (Mo–Sa) · ${w.xp} XP · ${w.words} neue Wörter</p></div>`;
}

/* ---------- Schritt: Wiederholen ---------- */
SCREENS.review = function (p) {
  setTitle('Wiederholen', p.free ? 'Freies Training' : '≈ 3 Minuten', true);
  if (!tmp.queue) { tmp.queue = dueCards().slice(0, p.free ? 20 : 12).map(v => v.id); tmp.i = 0; tmp.right = 0; }
  if (!tmp.queue.length) {
    const t = todaysText();
    return `<div class="card center"><div class="big">🗂️</div><h3>Keine Wörter fällig</h3><p class="muted">Neue Wörter sammelst du beim Lesen (Wort antippen), aus deinen Korrekturen oder unter „Wörter“. Für heute zählt dieser Schritt als erledigt.</p>
      ${!p.free ? `<button class="btn primary block" data-act="reviewdone">Weiter zum Lesen →</button>` : ''}</div>
      <div class="card"><h2>Tipp</h2><p class="small" style="margin:0">Im heutigen Text „${esc(t.title)}“ stecken ${t.phrases.length} nützliche Ausdrücke. Nach den Fragen kannst du sie mit einem Tipp speichern.</p></div>`;
  }
  if (tmp.i >= tmp.queue.length) {
    return `<div class="card center"><div class="big">💪</div><h3>${tmp.right}/${tmp.queue.length} gewusst</h3><p class="muted">Falsche Wörter kommen morgen wieder, sichere erst in ein paar Tagen oder Wochen.</p>
      <button class="btn primary block" data-act="reviewdone">${p.free ? 'Fertig' : 'Weiter zum Lesen →'}</button></div>`;
  }
  const v = S.vocab[tmp.queue[tmp.i]]; if (!v) { tmp.i++; return SCREENS.review(p); }
  const mode = (v.box || 0) <= 1 || (v.reps || 0) % 2 === 0 ? 'produce' : 'use';
  tmp.mode = mode; tmp.v = v;
  const prog = `<div class="bar thin"><i style="width:${tmp.i / tmp.queue.length * 100}%"></i></div><p class="muted small">Karte ${tmp.i + 1} von ${tmp.queue.length} · Box ${v.box || 0}</p>`;
  const first = v.term.replace(/^(to|a|an|the) /i, '').split(' ')[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const blank = s => s ? esc(s).replace(new RegExp('\\b' + first.slice(0, Math.max(3, first.length - 2)) + '\\w*', 'ig'), '_____') : '';
  let h = prog + `<div class="card flash">`;
  if (mode === 'produce') {
    h += `<div class="label">Welches englische Wort / welcher Ausdruck?</div><div class="q">${esc(v.meaning || v.expl || '?')}</div>
      ${v.expl && v.meaning ? `<div class="muted small">${esc(v.expl)}</div>` : ''}${v.example ? `<div class="ex">„${blank(v.example)}“</div>` : ''}
      <input id="ans" class="inp" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Auf Englisch eintippen …">`;
  } else {
    h += `<div class="label">Benutze den Ausdruck in einem eigenen Satz</div><div class="q en">${esc(v.term)} ${sayBtn(v.term)}</div>
      <p class="muted small">Schreib einen Satz über dein Leben, der zeigt, dass du die Bedeutung kennst.</p>
      <textarea id="ans" class="inp" rows="3" placeholder="Your sentence …"></textarea>`;
  }
  h += `<div id="fb"></div><div class="btns" id="rvBtns"><button class="btn primary" data-act="rvcheck">Prüfen</button><button class="btn ghost" data-act="rvshow">Weiß ich nicht</button></div></div>`;
  return h;
};
AFTER.review = () => { const a = $('#ans'); if (a) { a.focus({ preventScroll: true }); a.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && tmp.mode === 'produce') { e.preventDefault(); $('[data-act=rvcheck]')?.click(); } }); } };
function revealCard(v, ok, extra = '') {
  $('#fb').innerHTML = `<div class="reveal ${ok === true ? 'ok' : ok === false ? 'bad' : ''}">${ok === true ? '✅ Richtig!' : ok === false ? '❌ Nicht ganz.' : ''}
    <div class="en big2">${esc(v.term)} ${sayBtn(v.term)}</div><div>${esc(v.meaning)}</div>${v.expl ? `<div class="muted small">${esc(v.expl)}</div>` : ''}${v.example ? `<div class="ex">„${esc(v.example)}“</div>` : ''}${v.note ? `<div class="small">💡 ${esc(v.note)}</div>` : ''}${extra}</div>`;
  $('#rvBtns').innerHTML = ok === false ? `<button class="btn primary" data-act="rvgrade" data-g="0">Nochmal üben</button><button class="btn ghost" data-act="rvgrade" data-g="2">War doch richtig</button>`
    : `<button class="btn" data-act="rvgrade" data-g="0">Falsch</button><button class="btn" data-act="rvgrade" data-g="1">Schwer</button><button class="btn primary" data-act="rvgrade" data-g="2">Gut</button><button class="btn" data-act="rvgrade" data-g="3">Leicht</button>`;
}

/* ---------- Schritt: Lesen ---------- */
function tokenize(text) {
  return text.split(/\n\n+/).map(par => `<p>${par.split(/(\s+)/).map(tok => {
    if (/^\s+$/.test(tok)) return tok;
    const m = tok.match(/^([^A-Za-z]*)([A-Za-z][A-Za-z'’-]*[A-Za-z]|[A-Za-z])([^A-Za-z]*)$/);
    return m ? `${esc(m[1])}<span class="w" data-act="word">${esc(m[2])}</span>${esc(m[3])}` : esc(tok);
  }).join('')}</p>`).join('');
}
SCREENS.read = function (p) {
  const t = p.id ? textById(p.id) : todaysText();
  setTitle('Lesen & Verstehen', esc(t.topic || ''), true);
  tmp.text = t; tmp.isToday = !p.id || p.id === day().textId;
  const r = S.readings[t.id];
  const dr = S.drafts['read_' + t.id] || {};
  let h = `<div class="card reading"><div class="row between"><h3 class="ttl">${esc(t.title)}</h3>${sayBtn(t.text, '🔊 Anhören')}</div>
    <p class="muted small">Tippe auf ein Wort, das du nicht kennst → erklären lassen & speichern.</p><div class="txt" id="readText">${tokenize(t.text)}</div></div>`;
  h += `<div class="card"><h2>Fragen – antworte auf Englisch, in eigenen Worten</h2>`;
  t.questions.forEach((q, i) => {
    h += `<div class="qa"><div class="qq"><span class="qn">${i + 1}</span><span class="en">${esc(q.q)}</span></div>
      ${q.hint_de ? `<details class="hint"><summary>Hinweis</summary>${esc(q.hint_de)}</details>` : ''}
      <textarea class="inp" rows="2" data-qi="${i}" placeholder="In your own words …">${esc((r && r.answers && r.answers[i]) || dr[i] || '')}</textarea><div class="qfb" id="qfb${i}"></div></div>`;
  });
  h += `<div id="readFb"></div><div class="btns" id="readBtns"><button class="btn primary" data-act="readcheck">${aiReady() ? 'Prüfen lassen ✨' : 'Antworten prüfen'}</button></div></div>`;
  h += `<div class="card" id="phrases" ${r ? '' : 'style="display:none"'}>${phrasesHtml(t)}</div>`;
  return h + aiNote();
};
function phrasesHtml(t) {
  return `<h2>Schlüsselwörter aus dem Text</h2>${t.phrases.map((ph, i) => `<div class="item"><div class="grow"><div class="name en">${esc(ph.term)} ${sayBtn(ph.term)}</div><div class="meta">${esc(ph.meaning_de)}${ph.explanation_en ? ` · <i>${esc(ph.explanation_en)}</i>` : ''}</div></div>
    <button class="mini ${findVocab(ph.term) ? 'on' : ''}" data-act="addphrase" data-i="${i}" aria-label="Speichern">${findVocab(ph.term) ? '✓' : '+'}</button></div>`).join('')}
    <button class="btn block" data-act="addallphrases" style="margin-top:10px">Alle zu meinen Wörtern</button>`;
}
AFTER.read = () => { $$('textarea[data-qi]').forEach(ta => ta.addEventListener('input', () => { const k = 'read_' + tmp.text.id; S.drafts[k] = S.drafts[k] || {}; S.drafts[k][ta.dataset.qi] = ta.value; writeLocal(); })); };
function sentenceOf(el) {
  const p = el.closest('p'); const txt = p ? p.textContent : ''; const w = el.textContent;
  const parts = txt.match(/[^.!?]+[.!?]*/g) || [txt]; return (parts.find(s => s.includes(w)) || txt).trim();
}
function wordSheet(term, context) {
  const ex = findVocab(term);
  openSheet(`<h3 class="en">${esc(term)} ${sayBtn(term)}</h3><p class="muted small ex">„${esc(context)}“</p>
    <div id="wsAI">${aiReady() && !ex ? '<p class="muted small">✨ KI erklärt …</p>' : ''}</div>
    <label>Bedeutung (Deutsch)</label><input id="wsMeaning" class="inp" placeholder="z. B. widerstandsfähig" value="${esc(ex ? ex.meaning : '')}">
    <label>Ausdruck (Grundform)</label><input id="wsTerm" class="inp" value="${esc(ex ? ex.term : term)}" autocapitalize="off">
    <div class="btns"><button class="btn primary" id="wsSave">${ex ? 'Gespeichert ✓' : '📌 Zu meinen Wörtern'}</button><button class="btn" id="wsClose">Schließen</button></div>`, el => {
    let info = { example: context, source: tmp.text ? tmp.text.title : '' };
    el.querySelector('#wsClose').onclick = closeSheet;
    el.querySelector('#wsSave').onclick = () => { if (!ex) addVocab(Object.assign({}, info, { term: el.querySelector('#wsTerm').value, meaning: el.querySelector('#wsMeaning').value })); closeSheet(); };
    if (aiReady() && !ex) ai('explain', { term, context }).then(r => {
      info = { term: r.term, meaning: r.meaning_de, expl: r.explanation_en, example: r.example || context, note: r.note_de, source: info.source };
      const box = el.querySelector('#wsAI'); if (!box || !box.isConnected) return;
      box.innerHTML = `<div class="reveal"><div><b>${esc(r.meaning_de)}</b></div><div class="small">${esc(r.explanation_en)}</div>${r.example ? `<div class="ex">„${esc(r.example)}“</div>` : ''}${r.note_de ? `<div class="small">💡 ${esc(r.note_de)}</div>` : ''}</div>`;
      el.querySelector('#wsMeaning').value = r.meaning_de || ''; el.querySelector('#wsTerm').value = r.term || term;
    }).catch(e => { const box = el.querySelector('#wsAI'); if (box) box.innerHTML = `<p class="small errmsg">${esc(e.message)}</p>`; });
  });
}
async function readCheck(btn) {
  const t = tmp.text; const answers = $$('textarea[data-qi]').map(x => x.value.trim());
  if (answers.filter(a => words(a) >= 2).length < t.questions.length) { toast('Bitte beantworte alle Fragen (ein paar Wörter reichen).'); return; }
  const finish = (score, aiUsed) => {
    S.readings[t.id] = { date: today(), answers, score, ai: aiUsed, fb: tmp.readFb || null };
    delete S.drafts['read_' + t.id];
    const bonus = tmp.isToday ? completeStep('read', XP.read + (aiUsed ? XP.readAI : 0)) : (addXP(XP.extra), save(), false);
    $('#phrases').style.display = ''; $('#phrases').innerHTML = phrasesHtml(t);
    $('#readBtns').innerHTML = tmp.isToday ? `<button class="btn primary block" data-act="nextstep">Weiter →</button>` : `<button class="btn block" data-act="back">Fertig</button>`;
    if (bonus) celebrate();
  };
  if (aiReady()) {
    btn.disabled = true; btn.textContent = '✨ KI liest deine Antworten …';
    try {
      const r = await ai('reading', { text: t.text, answers: t.questions.map((q, i) => ({ q: q.q, answer: answers[i] })) });
      tmp.readFb = r;
      (r.results || []).forEach((x, i) => { const el = $('#qfb' + i); if (!el) return;
        el.innerHTML = `<div class="reveal ${x.understood === 'yes' ? 'ok' : x.understood === 'no' ? 'bad' : 'mid'}">${x.understood === 'yes' ? '✅ Verstanden' : x.understood === 'no' ? '❌ Nicht ganz' : '🟡 Teilweise'} – ${esc(x.feedback_de)}
        ${x.language_fix && norm(x.language_fix) !== norm(answers[i]) ? `<div class="small" style="margin-top:6px">✏️ Dein Englisch korrigiert: <span class="en diffi">${diffWords(answers[i], x.language_fix)}</span></div>` : ''}
        <div class="small muted" style="margin-top:6px">Musterantwort: <span class="en">${esc(x.model_answer)}</span></div></div>`; });
      addMistakes(r.mistakes, 'Lesen');
      $('#readFb').innerHTML = `<div class="note ok">📖 ${esc(r.summary_de || '')} ${r.score != null ? `<b>${r.score}/100</b>` : ''}</div>`;
      $$('textarea[data-qi]').forEach(x => x.readOnly = true);
      finish(r.score, true);
      return;
    } catch (e) { $('#readFb').innerHTML = aiErrBox(e) + '<p class="small muted">Dann prüfst du jetzt selbst:</p>'; btn.disabled = false; btn.textContent = 'Antworten prüfen'; }
  }
  // Selbstcheck mit Musterantworten
  t.questions.forEach((q, i) => { $('#qfb' + i).innerHTML = `<div class="reveal"><div class="small muted">Musterantwort:</div><div class="en">${esc(q.model || '–')}</div>
    <div class="seg" data-qi="${i}"><button data-act="selfq" data-v="2">Hatte ich ✓</button><button data-act="selfq" data-v="1">Teilweise</button><button data-act="selfq" data-v="0">Nicht</button></div></div>`; });
  tmp.self = {}; tmp.selfFinish = () => { const vals = Object.values(tmp.self); if (vals.length < t.questions.length) return; finish(Math.round(vals.reduce((a, b) => a + b, 0) / (2 * vals.length) * 100), false); };
  $('#readBtns').innerHTML = '<p class="muted small">Vergleiche ehrlich mit der Musterantwort und bewerte jede Antwort.</p>';
}

/* ---------- Schritt: Schreiben ---------- */
function targetWords() {
  const pool = Object.values(S.vocab).filter(v => !S.deleted[v.id] && (v.box || 0) <= 3).sort((a, b) => (a.box || 0) - (b.box || 0) || (b.updatedAt || 0) - (a.updatedAt || 0));
  return pool.slice(0, 2).map(v => v.term);
}
SCREENS.write = function (p) {
  const w = p.id ? WRITING.find(x => x.id === p.id) : p.own ? { id: 'own', type: 'Frei', title: 'Freies Schreiben', prompt: p.own, words: [60, 300], tips: [] } : todaysWriting();
  setTitle('Schreiben', esc(w.type) + ' · ≈ 6 Min', true);
  const dk = 'write_' + (p.id || (p.own ? 'own' : today()));
  tmp.w = w; tmp.dk = dk; tmp.isToday = !p.id && !p.own;
  if (!tmp.tw) tmp.tw = (S.drafts[dk] && S.drafts[dk].tw) || targetWords();
  const draft = (S.drafts[dk] && S.drafts[dk].text) || '';
  return `<div class="card"><div class="label">${esc(w.title)}</div><p class="prompt en">${esc(w.prompt)}</p>
    ${w.tips.length ? `<div class="chips">${w.tips.map(t => `<span class="chip en">${esc(t)}</span>`).join('')}</div>` : ''}
    ${tmp.tw.length ? `<div class="challenge">🎯 <b>Wort-Challenge:</b> Benutze ${tmp.tw.map(t => `<span class="en hl">${esc(t)}</span>`).join(' und ')}</div>` : ''}
    </div><div class="card"><textarea id="wtext" class="inp write" rows="11" placeholder="Start writing … Don’t translate word by word – think in English.">${esc(draft)}</textarea>
    <div class="row between small"><span id="wcount" class="muted"></span><span class="muted">Ziel: ${w.words[0]}–${w.words[1]} Wörter</span></div>
    <div class="btns"><button class="btn primary" data-act="writesubmit">${aiReady() ? 'Korrigieren lassen ✨' : 'Abgeben'}</button></div></div>
    <div id="wfb"></div>` + aiNote();
};
AFTER.write = () => {
  const ta = $('#wtext'); const upd = () => { const n = words(ta.value); $('#wcount').textContent = `${n} Wörter`; $('#wcount').className = n >= tmp.w.words[0] ? 'okmsg' : 'muted'; };
  upd(); ta.addEventListener('input', () => { upd(); S.drafts[tmp.dk] = { text: ta.value, tw: tmp.tw }; writeLocal(); });
};
function lessonChip(cat) { const g = GRAMMAR.find(x => x.cat === cat); return `<span class="chip sm">${esc(CAT_DE[cat] || cat || '')}</span>${g ? ` <button class="link small" data-act="open" data-s="lesson" data-id="${g.id}">Lektion ansehen</button>` : ''}`; }
function feedbackHtml(fb, original, kind) {
  if (!fb) return '';
  const cef = fb.cefr ? `<span class="cefr">${esc(fb.cefr)}</span>` : '';
  let h = `<div class="card fb"><div class="row between"><h2 style="margin:0">KI-Feedback</h2><span>${cef} ${fb.score != null ? `<span class="pill">${fb.score}/100</span>` : ''}</span></div>`;
  if (kind === 'speak') h += `<div class="scores">${['fluency', 'grammar', 'vocabulary'].map(k => `<div><span>${{ fluency: 'Flüssigkeit', grammar: 'Grammatik', vocabulary: 'Wortschatz' }[k]}</span><div class="bar"><i style="width:${(fb[k] || 0) * 10}%"></i></div><b>${fb[k] || '–'}/10</b></div>`).join('')}</div>`;
  h += `<p>${esc(fb.summary_de || '')}</p>`;
  if (fb.strengths_de && fb.strengths_de.length) h += `<div class="good">💪 ${fb.strengths_de.map(esc).join(' · ')}</div>`;
  if (kind === 'write' && fb.corrected) h += `<h4>Korrigierte Version ${sayBtn(fb.corrected)}</h4><div class="diff en">${diffWords(original, fb.corrected)}</div>`;
  if (kind === 'speak' && fb.transcript) h += `<h4>Das hast du gesagt</h4><div class="diff en">${esc(fb.transcript)}</div>`;
  if (fb.mistakes && fb.mistakes.length) h += `<h4>Deine Fehler – erklärt (${fb.mistakes.length})</h4>${fb.mistakes.map(m => `<div class="mist"><div class="en"><del>${esc(m.original)}</del> → <ins>${esc(m.correction)}</ins></div><div class="small">${esc(m.explanation_de)}</div>${lessonChip(m.category)}</div>`).join('')}`;
  if (fb.better_phrases && fb.better_phrases.length) h += `<h4>So klingst du natürlicher</h4>${fb.better_phrases.map(b => `<div class="mist up row"><div class="grow"><div class="en"><span class="muted">${esc(b.original)}</span> → <b>${esc(b.better)}</b></div><div class="small">${esc(b.why_de)}</div></div><button class="mini ${findVocab(b.better) ? 'on' : ''}" data-act="addv" data-term="${esc(b.better)}" data-meaning="${esc('statt: ' + b.original)}" data-example="">${findVocab(b.better) ? '✓' : '+'}</button></div>`).join('')}`;
  if (fb.target_words && fb.target_words.length) h += `<h4>🎯 Wort-Challenge</h4>${fb.target_words.map(t => `<div class="small">${t.used && t.correct ? '✅' : t.used ? '🟡' : '❌'} <b class="en">${esc(t.word)}</b> – ${esc(t.note_de || (t.used ? '' : 'nicht benutzt'))}</div>`).join('')}`;
  if (kind === 'speak' && fb.better_version) h += `<h4>Bessere Version zum Nachsprechen ${sayBtn(fb.better_version)}</h4><div class="diff en">${esc(fb.better_version)}</div><p class="muted small">🔁 <b>Shadowing:</b> Hör dir die Version an und sprich sie Satz für Satz laut nach.</p>`;
  if (fb.pronunciation_de) h += `<h4>Aussprache</h4><p class="small">🗣️ ${esc(fb.pronunciation_de)}</p>`;
  const voc = fb.vocab || (fb.useful_phrases || []).map(x => ({ term: x.phrase, meaning_de: x.meaning_de }));
  if (voc.length) h += `<h4>Neue Wörter für dich</h4>${voc.map(v => `<div class="item"><div class="grow"><div class="name en">${esc(v.term)} ${sayBtn(v.term)}</div><div class="meta">${esc(v.meaning_de)}${v.example ? ` · <i>${esc(v.example)}</i>` : ''}</div></div><button class="mini ${findVocab(v.term) ? 'on' : ''}" data-act="addv" data-term="${esc(v.term)}" data-meaning="${esc(v.meaning_de)}" data-example="${esc(v.example || '')}">${findVocab(v.term) ? '✓' : '+'}</button></div>`).join('')}`;
  if (fb.next_tip_de) h += `<div class="note">🎯 <b>Nächstes Mal:</b> ${esc(fb.next_tip_de)}</div>`;
  return h + '</div>';
}
const SELF_CHECK = ['Zeitformen: Past Simple bei „yesterday / ago / last …“?', 'he/she/it → Verb mit -s?', 'Satzstellung: Subjekt + Verb zusammen?', 'Präpositionen geprüft (depend on, interested in …)?', 'Verbindungswörter benutzt (however, although, because …)?', 'Laut vorgelesen – klingt es natürlich?'];
const nextBtn = () => tmp.isToday ? `<button class="btn primary block" data-act="nextstep">Weiter →</button>` : `<button class="btn block" data-act="back">Fertig</button>`;
async function writeSubmit(btn) {
  const text = $('#wtext').value.trim(); const w = tmp.w; const min = Math.min(40, w.words[0]);
  if (words(text) < min) { toast(`Schreib mindestens ${min} Wörter.`); return; }
  const entry = { id: uid(), date: today(), promptId: w.id, prompt: w.prompt, title: w.title, text, words: words(text), tw: tmp.tw, fb: null };
  const done = () => {
    S.writings.push(entry); delete S.drafts[tmp.dk];
    const bonus = tmp.isToday ? completeStep('main', XP.write + Math.min(20, Math.floor(entry.words / 20) * 2)) : (addXP(XP.extra + (entry.fb ? 10 : 0)), save(), false);
    if (bonus) celebrate();
  };
  tmp.pendingEntry = entry; tmp.pendingDone = done;
  if (aiReady()) {
    btn.disabled = true; btn.textContent = '✨ Dein Lehrer korrigiert … (10–30 s)';
    try {
      const fb = await ai('writing', { prompt: w.prompt, text, targetWords: tmp.tw });
      entry.fb = fb; entry.cefr = fb.cefr; addMistakes(fb.mistakes, 'Schreiben'); done();
      $('#wfb').innerHTML = feedbackHtml(fb, text, 'write') + nextBtn();
      $('#wtext').readOnly = true; btn.remove(); $('#wfb').scrollIntoView({ behavior: 'smooth' });
      return;
    } catch (e) {
      btn.disabled = false; btn.textContent = 'Nochmal versuchen ✨';
      $('#wfb').innerHTML = aiErrBox(e) + `<button class="btn block" data-act="writeself" style="margin-bottom:14px">Ohne KI abgeben (Selbstcheck)</button>`; return;
    }
  }
  writeSelf();
}
function writeSelf() {
  const entry = tmp.pendingEntry; tmp.pendingDone();
  $('#wtext').readOnly = true; $('[data-act=writesubmit]')?.remove();
  $('#wfb').innerHTML = `<div class="card"><h2>Selbstcheck</h2><p class="small">Lies deinen Text einmal laut ${sayBtn(entry.text, '🔊 vorlesen lassen')} und geh die Liste durch:</p>${SELF_CHECK.map(s => `<label class="chk"><input type="checkbox"> ${esc(s)}</label>`).join('')}
    <p class="muted small">Dein Text ist gespeichert. Sobald die KI aktiv ist, kannst du ihn unter <b>Fortschritt → Texte</b> nachträglich korrigieren lassen.</p></div>` + nextBtn();
}

/* ---------- Schritt: Sprechen ---------- */
let rec = null;
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
SCREENS.speak = function (p) {
  const s = p.id ? SPEAKING.find(x => x.id === p.id) : todaysSpeaking();
  setTitle('Sprechen', '60–90 Sekunden', true);
  tmp.s = s; tmp.isToday = !p.id;
  const canRec = !!(navigator.mediaDevices && window.MediaRecorder);
  return `<div class="card"><div class="label">${esc(s.title)}</div><p class="prompt en">${esc(s.prompt)} ${sayBtn(s.prompt)}</p>
    <div class="small muted">Deine Gliederung:</div><ol class="helpers">${s.helpers.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
    <div class="small muted">Nützliche Satzanfänge (antippen zum Anhören):</div><div class="chips">${s.phrases.map(t => `<span class="chip en" data-act="say" data-text="${esc(t)}">${esc(t)}</span>`).join('')}</div>
    <p class="muted small">Tipp: 30 Sekunden still planen, dann frei sprechen. Nicht ablesen!</p></div>
    <div class="card center"><button class="recbtn" id="recBtn" data-act="rec" ${canRec || SR ? '' : 'disabled'}><span>🎙️</span></button>
    <div id="recTime" class="rectime">${canRec || SR ? 'Tippen zum Aufnehmen' : 'Mikrofon wird hier nicht unterstützt'}</div>
    <div id="liveTr" class="live en"></div><audio id="recAudio" controls class="hidden"></audio></div>
    <div class="card hidden" id="trCard"><h2>Transkript${SR ? ' (automatisch – bei Bedarf korrigieren)' : ''}</h2>
      <textarea id="trText" class="inp" rows="4" placeholder="${SR ? '' : 'Optional – die KI hört sich sonst die Aufnahme an.'}"></textarea>
      <div class="btns"><button class="btn primary" data-act="speaksubmit">${aiReady() ? 'Feedback holen ✨' : 'Fertig'}</button><button class="btn" data-act="rerec">Neu aufnehmen</button></div></div>
    <div id="sfb"></div>` + aiNote();
};
function fmtSec(s) { return `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`; }
async function startRec() {
  rec = { chunks: [], start: Date.now(), transcript: '', interim: '' };
  try {
    if (navigator.mediaDevices && window.MediaRecorder) {
      rec.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const mt = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg'].find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
      rec.mr = new MediaRecorder(rec.stream, mt ? { mimeType: mt } : undefined);
      rec.mr.ondataavailable = e => e.data.size && rec.chunks.push(e.data);
      rec.mr.onstop = onRecStop; rec.mr.start(1000);
    }
  } catch (e) { toast('Kein Mikrofon-Zugriff – bitte in den Einstellungen erlauben.'); rec = null; return; }
  rec.start = Date.now();
  if (SR) {
    try {
      const r = new SR(); r.lang = S.settings.accent; r.continuous = true; r.interimResults = true;
      let finals = '';
      r.onresult = ev => { let fin = '', int = ''; for (let i = ev.resultIndex; i < ev.results.length; i++) { const t = ev.results[i][0].transcript; if (ev.results[i].isFinal) fin += t + ' '; else int += t; } finals += fin; rec.transcript = finals; rec.interim = int; const el = $('#liveTr'); if (el) el.textContent = (finals + int).trim(); };
      r.onend = () => { if (rec && rec.active) { try { r.start(); } catch (e) {} } };
      r.onerror = () => {}; r.start(); rec.sr = r;
    } catch (e) {}
  }
  rec.active = true; $('#recBtn').classList.add('on'); $('#recBtn').innerHTML = '<span>■</span>';
  rec.timer = setInterval(() => { const s = (Date.now() - rec.start) / 1000; const el = $('#recTime'); if (el) el.textContent = `● ${fmtSec(s)} – tippen zum Stoppen`; if (s >= 150) stopRec(); }, 250);
}
function stopRec(silent) {
  if (!rec || !rec.active) return; rec.active = false; clearInterval(rec.timer);
  rec.dur = (Date.now() - rec.start) / 1000;
  try { rec.sr && rec.sr.stop(); } catch (e) {}
  if (silent) { try { rec.mr && rec.mr.state !== 'inactive' && (rec.mr.onstop = null, rec.mr.stop()); } catch (e) {} if (rec.stream) rec.stream.getTracks().forEach(t => t.stop()); rec = null; return; }
  if (rec.mr && rec.mr.state !== 'inactive') rec.mr.stop(); else onRecStop();
  if (rec.stream) rec.stream.getTracks().forEach(t => t.stop());
}
function onRecStop() {
  if (!rec) return;
  const btn = $('#recBtn'); if (!btn) return;
  btn.classList.remove('on'); btn.innerHTML = '<span>🎙️</span>';
  $('#recTime').textContent = `Aufnahme: ${fmtSec(rec.dur || 0)}${(rec.dur || 0) < 30 ? ' – etwas kurz, versuch 60 s!' : ' ✓'}`;
  if (rec.chunks.length) { rec.blob = new Blob(rec.chunks, { type: (rec.mr && rec.mr.mimeType) || 'audio/webm' }); const a = $('#recAudio'); a.src = URL.createObjectURL(rec.blob); a.classList.remove('hidden'); }
  $('#trCard').classList.remove('hidden'); $('#trText').value = ((rec.transcript || '') + (rec.interim || '')).trim();
}
async function blobToWavBase64(blob) {
  const buf = await blob.arrayBuffer(); const AC = window.AudioContext || window.webkitAudioContext; const ac = new AC();
  const audio = await new Promise((res, rej) => ac.decodeAudioData(buf, res, rej)); if (ac.close) ac.close();
  const rate = 16000, ch = audio.getChannelData(0), ratio = audio.sampleRate / rate, len = Math.floor(ch.length / ratio);
  const out = new DataView(new ArrayBuffer(44 + len * 2)); const ws = (o, s) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
  ws(0, 'RIFF'); out.setUint32(4, 36 + len * 2, true); ws(8, 'WAVE'); ws(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true);
  out.setUint32(24, rate, true); out.setUint32(28, rate * 2, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true); ws(36, 'data'); out.setUint32(40, len * 2, true);
  for (let i = 0; i < len; i++) { const s = Math.max(-1, Math.min(1, ch[Math.floor(i * ratio)])); out.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); }
  return b64(new Uint8Array(out.buffer));
}
function b64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
async function speakSubmit(btn) {
  const transcript = $('#trText').value.trim(); const s = tmp.s;
  if (!rec || (!rec.blob && !transcript)) { toast('Erst aufnehmen 🎙️'); return; }
  const entry = { id: uid(), date: today(), promptId: s.id, prompt: s.prompt, title: s.title, transcript, dur: Math.round(rec.dur || 0), fb: null };
  const done = () => { S.speakings.push(entry); const bonus = tmp.isToday ? completeStep('main', XP.speak) : (addXP(XP.extra + (entry.fb ? 10 : 0)), save(), false); if (bonus) celebrate(); };
  tmp.pendingDone = done;
  if (aiReady()) {
    btn.disabled = true; btn.textContent = '✨ Dein Lehrer hört zu …';
    try {
      let audio = null;
      if (rec.blob) { try { audio = { mime: 'audio/wav', data: await blobToWavBase64(rec.blob) }; } catch (e) { audio = { mime: /mp4/.test(rec.blob.type) ? 'video/mp4' : 'video/webm', data: b64(new Uint8Array(await rec.blob.arrayBuffer())) }; } }
      const fb = await ai('speaking', { prompt: s.prompt, transcript, audio });
      entry.fb = fb; entry.cefr = fb.cefr; if (fb.transcript) entry.transcript = fb.transcript; addMistakes(fb.mistakes, 'Sprechen'); done();
      $('#sfb').innerHTML = feedbackHtml(fb, transcript, 'speak') + nextBtn(); btn.closest('.btns').remove(); $('#sfb').scrollIntoView({ behavior: 'smooth' });
      return;
    } catch (e) { btn.disabled = false; btn.textContent = 'Nochmal versuchen ✨'; $('#sfb').innerHTML = aiErrBox(e) + `<button class="btn block" data-act="speakself" style="margin-bottom:14px">Ohne KI abschließen</button>`; return; }
  }
  speakSelf();
}
function speakSelf() {
  tmp.pendingDone(); $('#trCard .btns')?.remove(); const s = tmp.s;
  $('#sfb').innerHTML = `<div class="card"><h2>Selbstcheck & Shadowing</h2><p class="small">Hör dir deine Aufnahme oben an. Dann sprich diese Sätze nach – achte auf Betonung und das „th“:</p>
    ${s.phrases.map(t => `<div class="item"><div class="grow en">${esc(t)}</div>${sayBtn(t)}</div>`).join('')}
    ${['Habe ich in ganzen Sätzen gesprochen?', 'Habe ich Verbindungswörter benutzt (because, so, however)?', 'Wo habe ich lange Pausen gemacht – und warum?', 'Welches Wort hat mir gefehlt? → unter „Wörter“ speichern'].map(x => `<label class="chk"><input type="checkbox"> ${esc(x)}</label>`).join('')}</div>` + nextBtn();
}

/* ---------- Schritt: Grammatik ---------- */
SCREENS.lesson = function (p) {
  const g = p.id ? GRAMMAR.find(x => x.id === p.id) : todaysGrammar();
  tmp.g = g; tmp.isToday = !p.id || (p.id === day().grammarId && !stepDone('grammar'));
  setTitle('Grammatik', esc(CAT_DE[g.cat] || ''), true);
  const myM = S.mistakes.filter(m => m.category === g.cat).slice(-3).reverse();
  return `<div class="card"><h3 class="ttl">${esc(g.title)}</h3>${tmp.isToday && day().grammarReason ? `<p class="muted small">Warum heute: ${esc(day().grammarReason)}</p>` : ''}<p class="lesson">${g.explain}</p>
    <div class="exs">${g.examples.map(e => `<div><span class="bad">✗ <span class="en">${esc(e.wrong)}</span></span><span class="good">✓ <span class="en">${esc(e.right)}</span></span></div>`).join('')}</div>
    <div class="note">💡 ${g.tip}</div></div>
    ${myM.length ? `<div class="card"><h2>Deine eigenen Fehler dazu</h2>${myM.map(m => `<div class="mist"><div class="en"><del>${esc(m.original)}</del> → <ins>${esc(m.correction)}</ins></div><div class="small muted">${esc(m.explanation)}</div></div>`).join('')}</div>` : ''}
    <div class="card"><h2>Jetzt du – tippe die Lösung</h2>${g.ex.map((e, i) => `<div class="qa"><div class="qq"><span class="qn">${i + 1}</span><span class="en">${esc(e.q)}</span></div><input class="inp" data-gi="${i}" autocomplete="off" autocapitalize="off" spellcheck="false"><div class="qfb" id="gfb${i}"></div></div>`).join('')}
    <div class="btns" id="gBtns"><button class="btn primary" data-act="gcheck">Prüfen</button></div></div>`;
};
async function grammarCheck() {
  const g = tmp.g; const vals = $$('input[data-gi]').map(x => x.value.trim());
  if (vals.some(v => !v)) { toast('Bitte alle Aufgaben ausfüllen.'); return; }
  tmp.gok = vals.map((v, i) => checkExercise(g.ex[i], v));
  vals.forEach((v, i) => { const ok = tmp.gok[i]; $('#gfb' + i).innerHTML = ok ? `<div class="reveal ok">✅ Richtig</div>` : `<div class="reveal bad">❌ Lösung: <span class="en">${esc(g.ex[i].a[0])}</span><div class="seg"><button data-act="gover" data-i="${i}">Meine war auch richtig</button></div></div>`; $$('input[data-gi]')[i].readOnly = true; });
  const wrong = tmp.gok.map((ok, i) => ok ? null : i).filter(i => i !== null);
  if (wrong.length && aiReady()) {
    $('#gBtns').innerHTML = `<p class="muted small">✨ KI prüft deine abweichenden Antworten …</p>`;
    try { const r = await ai('grammar', { topic: g.title, items: wrong.map(i => ({ task: g.ex[i].q, expected: g.ex[i].a, answer: vals[i] })) });
      (r.results || []).forEach((x, j) => { const i = wrong[j]; if (i == null) return; if (x.ok) tmp.gok[i] = true; $('#gfb' + i).innerHTML = `<div class="reveal ${x.ok ? 'ok' : 'bad'}">${x.ok ? '✅ Auch richtig!' : `❌ Lösung: <span class="en">${esc(g.ex[i].a[0])}</span>`}<div class="small">${esc(x.feedback_de || '')}</div></div>`; });
    } catch (e) {}
  }
  grammarFinish();
}
function grammarFinish() {
  const g = tmp.g; const n = tmp.gok.filter(Boolean).length; const score = Math.round(n / tmp.gok.length * 100);
  S.grammarDone[g.id] = { date: today(), score };
  const bonus = tmp.isToday ? completeStep('grammar', XP.grammar) : (addXP(10), save(), false);
  $('#gBtns').innerHTML = `<div class="note ${score >= 75 ? 'ok' : ''}">${score >= 75 ? '🎉' : '💪'} ${n}/${tmp.gok.length} richtig${score < 75 ? ' – die Lektion kommt bald wieder.' : ''}</div>` + (tmp.isToday ? `<button class="btn primary block" data-act="nextstep">${sessionDone() ? 'Zur Übersicht 🏆' : 'Weiter →'}</button>` : `<button class="btn block" data-act="back">Fertig</button>`);
  if (bonus) celebrate();
}

/* ---------- Üben ---------- */
const li = (attrs, emoji, name, meta) => `<button class="item btnitem" ${attrs}><div class="emoji">${emoji}</div><div class="grow"><div class="name">${name}</div><div class="meta">${meta}</div></div><span class="chev">›</span></button>`;
TABS.practice = function () {
  setTitle('Üben', 'Frei, ohne Tagesplan');
  const due = dueCards().length;
  return `<div class="card"><h2>Wörter</h2>${li('data-act="open" data-s="review" data-free="1"', '🔁', 'Wörter wiederholen', `${due} fällig`)}</div>
  <div class="card"><h2>Lesen</h2>
    ${li('data-act="gentext"', '✨', 'Neuer Text von der KI', aiReady() ? 'Passend zu deinem Niveau – Thema frei wählbar' : 'Braucht Anmeldung & KI')}
    ${allTexts().slice().reverse().map(t => li(`data-act="open" data-s="read" data-id="${t.id}"`, S.readings[t.id] ? '✅' : '📖', esc(t.title), `${esc(t.topic || '')}${t.ai ? ' · KI' : ''}${S.readings[t.id] && S.readings[t.id].score != null ? ` · ${S.readings[t.id].score}%` : ''}`)).join('')}</div>
  <div class="card"><h2>Schreiben</h2>${li('data-act="ownwrite"', '📝', 'Eigenes Thema / Essay', 'Schreib, was du willst – z. B. Tagebuch')}
    ${WRITING.map(w => li(`data-act="open" data-s="write" data-id="${w.id}"`, S.writings.some(x => x.promptId === w.id) ? '✅' : '✍️', esc(w.title), `${esc(w.type)} · ${w.words[0]}–${w.words[1]} Wörter`)).join('')}</div>
  <div class="card"><h2>Sprechen</h2>${SPEAKING.map(w => li(`data-act="open" data-s="speak" data-id="${w.id}"`, S.speakings.some(x => x.promptId === w.id) ? '✅' : '🎙️', esc(w.title), `<span class="en">${esc(w.prompt.slice(0, 58))}…</span>`)).join('')}</div>
  <div class="card"><h2>Grammatik</h2>${GRAMMAR.map(g => li(`data-act="open" data-s="lesson" data-id="${g.id}"`, S.grammarDone[g.id] ? '✅' : '🧩', esc(g.title), `${esc(g.short)}${S.grammarDone[g.id] ? ` · ${S.grammarDone[g.id].score}%` : ''}`)).join('')}</div>`;
};
function askSheet(title, label, placeholder, value, cb) {
  openSheet(`<h3>${esc(title)}</h3><label>${esc(label)}</label><input id="askIn" class="inp" placeholder="${esc(placeholder)}" value="${esc(value || '')}"><div class="btns"><button class="btn primary" id="askOk">Los</button><button class="btn" id="askNo">Abbrechen</button></div>`, el => {
    const i = el.querySelector('#askIn'); setTimeout(() => i.focus(), 50);
    el.querySelector('#askOk').onclick = () => { closeSheet(); cb(i.value.trim()); };
    el.querySelector('#askNo').onclick = closeSheet;
  });
}

/* ---------- Wörter ---------- */
TABS.words = function () {
  const all = Object.values(S.vocab).filter(v => !S.deleted[v.id]);
  setTitle('Wörter', `${all.length} gesammelt`);
  const q = (tmp.q || '').toLowerCase();
  const list = all.filter(v => !q || v.term.toLowerCase().includes(q) || (v.meaning || '').toLowerCase().includes(q)).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const due = dueCards().length;
  const boxes = [0, 0, 0]; all.forEach(v => boxes[(v.box || 0) <= 1 ? 0 : v.box <= 4 ? 1 : 2]++);
  return `<div class="hero"><div class="stat"><b>${due}</b><span>fällig</span></div><div class="stat"><b>${boxes[1]}</b><span>im Aufbau</span></div><div class="stat"><b>${boxes[2]}</b><span>sitzen fest</span></div></div>
    <div class="btns" style="margin:0 0 14px"><button class="btn primary" data-act="open" data-s="review" data-free="1" ${due ? '' : 'disabled'}>🔁 Wiederholen</button><button class="btn" data-act="addword">+ Wort</button></div>
    ${all.length ? `<input class="inp" id="wsearch" placeholder="Suchen …" value="${esc(tmp.q || '')}" style="margin-bottom:12px">` : ''}
    <div class="card" id="wlist">${list.length ? list.map(v => `<button class="item btnitem" data-act="editword" data-id="${v.id}"><div class="grow"><div class="name en">${esc(v.term)}</div><div class="meta">${esc(v.meaning || v.expl || '')}</div></div><span class="boxpill b${Math.min(7, v.box || 0)}">${(v.box || 0) >= 5 ? 'sitzt' : (v.box || 0) >= 2 ? 'im Aufbau' : 'neu'}</span></button>`).join('')
      : `<div class="empty"><div class="big">📌</div>Noch keine Wörter.<br>Tippe beim Lesen auf unbekannte Wörter oder übernimm Vorschläge aus deinen Korrekturen.</div>`}</div>`;
};
AFTER.tab_words = () => { const s = $('#wsearch'); if (s) s.addEventListener('input', () => { tmp.q = s.value; const y = s.selectionStart; render(); const n = $('#wsearch'); n.focus(); n.setSelectionRange(y, y); }); };
function wordEditSheet(v) {
  openSheet(`<h3>${v ? 'Wort bearbeiten' : 'Neues Wort'}</h3>
    <label>Englisch</label><input id="ewTerm" class="inp" value="${esc(v ? v.term : '')}" autocapitalize="off" placeholder="z. B. take on">
    <label>Bedeutung (Deutsch)</label><input id="ewMeaning" class="inp" value="${esc(v ? v.meaning : '')}">
    <label>Beispielsatz</label><textarea id="ewEx" class="inp" rows="2">${esc(v ? v.example : '')}</textarea>
    ${v ? `<p class="muted small">Box ${v.box || 0} · nächste Wiederholung: ${v.due ? fmtD(v.due) : '–'} · ${v.reps || 0}× geübt${v.source ? ` · aus: ${esc(v.source)}` : ''}</p>` : (aiReady() ? `<p class="muted small">Tipp: Nur das englische Wort eingeben und „✨ Erklären“ tippen.</p>` : '')}
    <div class="btns"><button class="btn primary" id="ewSave">Speichern</button>${aiReady() ? '<button class="btn" id="ewAI">✨ Erklären</button>' : ''}${v ? '<button class="btn danger" id="ewDel">Löschen</button>' : ''}</div>`, el => {
    el.querySelector('#ewSave').onclick = () => {
      const term = el.querySelector('#ewTerm').value.trim(); if (!term) return;
      if (v) { Object.assign(v, { term, meaning: el.querySelector('#ewMeaning').value.trim(), example: el.querySelector('#ewEx').value.trim(), updatedAt: Date.now() }); save(); }
      else addVocab({ term, meaning: el.querySelector('#ewMeaning').value, example: el.querySelector('#ewEx').value, source: 'manuell' });
      closeSheet(); render();
    };
    const del = el.querySelector('#ewDel'); if (del) del.onclick = () => { if (!confirm(`„${v.term}“ löschen?`)) return; S.deleted[v.id] = Date.now(); delete S.vocab[v.id]; save(); closeSheet(); render(); };
    const aiB = el.querySelector('#ewAI'); if (aiB) aiB.onclick = async () => {
      const term = el.querySelector('#ewTerm').value.trim(); if (!term) return; aiB.disabled = true; aiB.textContent = '…';
      try { const r = await ai('explain', { term, context: el.querySelector('#ewEx').value }); el.querySelector('#ewTerm').value = r.term || term; el.querySelector('#ewMeaning').value = r.meaning_de || ''; el.querySelector('#ewEx').value = r.example || ''; }
      catch (e) { toast(e.message); } aiB.disabled = false; aiB.textContent = '✨ Erklären';
    };
  });
}

/* ---------- Fortschritt ---------- */
TABS.progress = function () {
  setTitle('Fortschritt', '');
  const lv = levelInfo(), st = streak(), ws = weekStart();
  const weeks = [...Array(6)].map((_, i) => weekStats(addDays(ws, -7 * (5 - i))));
  const maxXp = Math.max(50, ...weeks.map(w => w.xp));
  const cefrs = [...S.writings, ...S.speakings].filter(x => x.cefr).sort((a, b) => a.date.localeCompare(b.date)).slice(-10);
  const ms = mistakeStats(30);
  const sec = tmp.psec || 'overview';
  let h = `<div class="seg tabs">${[['overview', 'Übersicht'], ['mistakes', 'Fehler'], ['texts', 'Texte']].map(([k, l]) => `<button data-act="psec" data-k="${k}" class="${sec === k ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  if (sec === 'overview') {
    const w = weekStats();
    h += `<div class="hero"><div class="stat"><b>🔥 ${st}</b><span>Serie</span></div><div class="stat"><b>🏅 ${bestStreak()}</b><span>Rekord</span></div><div class="stat"><b>Lvl ${lv.n}</b><span>${esc(lv.name)}</span></div></div>
    <div class="card"><div class="row between"><h2 style="margin:0">Wochen-Score (Mo–Sa)</h2><span class="pill big">${w.score}%</span></div>
      <div class="grid4"><div><b>${w.done}/6</b><span>Sessions</span></div><div><b>${w.writes}</b><span>Texte</span></div><div><b>${w.speaks}</b><span>Sprechen</span></div><div><b>${w.words}</b><span>Wörter</span></div></div>
      <button class="btn block" data-act="open" data-s="week" style="margin-top:12px">📊 Wochenrückblick</button></div>
    <div class="card"><h2>XP pro Woche</h2><div class="chart">${weeks.map((x, i) => `<div class="col"><b>${x.xp}</b><i style="height:${Math.max(2, Math.round(x.xp / maxXp * 100))}%"></i><span>${i === 5 ? 'jetzt' : '−' + (5 - i) + ' W'}</span></div>`).join('')}</div></div>
    <div class="card"><h2>Dein Niveau (KI-Einschätzung)</h2>${cefrs.length ? `<div class="cefrline">${cefrs.map(c => `<span class="cefr sm" title="${esc(c.date)}">${esc(c.cefr)}</span>`).join('')}</div><p class="muted small">Letzte ${cefrs.length} korrigierte Texte/Aufnahmen, alt → neu.</p>` : '<p class="muted small" style="margin:0">Erscheint, sobald die KI deine ersten Texte bewertet hat.</p>'}</div>
    <div class="card"><h2>Gesamt</h2><div class="grid4"><div><b>${Object.values(S.days).filter(d => d.done).length}</b><span>Sessions</span></div><div><b>${S.writings.reduce((a, w) => a + (w.words || 0), 0)}</b><span>Wörter geschrieben</span></div><div><b>${Math.round(S.speakings.reduce((a, w) => a + (w.dur || 0), 0) / 60)}</b><span>Min gesprochen</span></div><div><b>${Object.keys(S.readings).length}</b><span>Texte gelesen</span></div></div></div>`;
  } else if (sec === 'mistakes') {
    const maxM = Math.max(1, ...ms.map(x => x[1]));
    h += `<div class="card"><h2>Deine häufigsten Fehler (30 Tage)</h2>${ms.length ? ms.map(([c, n]) => { const g = GRAMMAR.find(x => x.cat === c); return `<div class="mrow"><div class="row between"><span>${esc(CAT_DE[c] || c)}</span><b>${n}×</b></div><div class="bar"><i style="width:${n / maxM * 100}%"></i></div>${g ? `<button class="link small" data-act="open" data-s="lesson" data-id="${g.id}">→ Lektion „${esc(g.title)}“</button>` : ''}</div>`; }).join('') : '<p class="muted small">Noch keine Fehler gesammelt. Sie kommen automatisch aus dem KI-Feedback.</p>'}</div>
    <div class="card"><h2>Fehler-Tagebuch</h2>${S.mistakes.length ? S.mistakes.slice(-40).reverse().map(m => `<div class="mist"><div class="en"><del>${esc(m.original)}</del> → <ins>${esc(m.correction)}</ins></div><div class="small muted">${esc(m.explanation)}</div><span class="chip sm">${esc(CAT_DE[m.category] || m.category)}</span> <span class="muted small">${fmtD(m.date)} · ${esc(m.source || '')}</span></div>`).join('') : '<p class="muted small">Leer – noch.</p>'}</div>`;
  } else {
    const all = [...S.writings.map(w => ({ ...w, k: 'w' })), ...S.speakings.map(w => ({ ...w, k: 's' }))].sort((a, b) => b.date.localeCompare(a.date));
    h += `<div class="card"><h2>Deine Texte & Aufnahmen</h2>${all.length ? all.map(x => `<button class="item btnitem" data-act="open" data-s="entry" data-id="${x.id}"><div class="emoji">${x.k === 'w' ? '✍️' : '🎙️'}</div><div class="grow"><div class="name">${esc(x.title)}</div><div class="meta">${fmtD(x.date)} · ${x.k === 'w' ? `${x.words} Wörter` : `${fmtSec(x.dur || 0)} Min`}${x.fb ? '' : ' · ohne Feedback'}</div></div>${x.cefr ? `<span class="cefr sm">${esc(x.cefr)}</span>` : ''}</button>`).join('') : '<div class="empty">Noch nichts – dein erster Text kommt heute!</div>'}</div>`;
  }
  return h;
};
SCREENS.entry = function (p) {
  const w = S.writings.find(x => x.id === p.id), s = S.speakings.find(x => x.id === p.id), e = w || s;
  if (!e) return '<div class="empty">Nicht gefunden</div>';
  setTitle(w ? 'Text' : 'Aufnahme', fmtD(e.date), true); tmp.entry = e;
  return `<div class="card"><div class="label">${esc(e.title)}</div><p class="prompt en small">${esc(e.prompt)}</p><div class="diff en">${esc(w ? e.text : e.transcript || '(kein Transkript)')}</div></div>
    ${e.fb ? feedbackHtml(e.fb, w ? e.text : e.transcript, w ? 'write' : 'speak') : w ? `<div class="card"><p class="small" style="margin-top:0">Dieser Text hat noch kein KI-Feedback.</p><button class="btn primary block" data-act="latefb" ${aiReady() ? '' : 'disabled'}>Jetzt korrigieren lassen ✨</button></div>${aiNote()}` : ''}`;
};
SCREENS.week = function () {
  setTitle('Wochenrückblick', '', true);
  const ws = weekStart(), w = weekStats(ws), prev = weekStats(addDays(ws, -7));
  const ms = S.mistakes.filter(m => m.date >= ws); const cats = {}; ms.forEach(m => cats[m.category] = (cats[m.category] || 0) + 1);
  const top = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const newW = Object.values(S.vocab).filter(v => v.created >= ws).slice(0, 16);
  return `<div class="card center"><div class="big">${w.score >= 80 ? '🏆' : w.score >= 50 ? '💪' : '🌱'}</div><h3>Wochen-Score: ${w.score}%</h3><p class="muted">${w.done}/6 Sessions · ${w.xp} XP${prev.xp ? ` (${w.xp >= prev.xp ? '+' : ''}${w.xp - prev.xp} zur Vorwoche)` : ''}</p>${weekMini().replace('class="card"', 'class="inner"')}</div>
    <div class="card"><h2>Fokus für nächste Woche</h2>${top.length ? top.map(([c, n]) => { const g = GRAMMAR.find(x => x.cat === c); return `<div class="row between" style="padding:4px 0"><span>${esc(CAT_DE[c] || c)} <b>${n}×</b></span>${g ? `<button class="link small" data-act="open" data-s="lesson" data-id="${g.id}">Lektion</button>` : ''}</div>`; }).join('') : '<p class="muted small" style="margin:0">Diese Woche keine KI-Fehler erfasst.</p>'}</div>
    <div class="card"><h2>Neue Wörter dieser Woche</h2>${newW.length ? `<div class="chips">${newW.map(v => `<span class="chip en">${esc(v.term)}</span>`).join('')}</div>` : '<p class="muted small" style="margin:0">Noch keine.</p>'}</div>`;
};

/* ---------- Mehr ---------- */
TABS.more = function () {
  setTitle('Mehr', '');
  const st = S.settings;
  const aiTxt = !window.sbUser ? 'Melde dich oben an, um den KI-Lehrer zu nutzen.' : aiState.configured === false ? '⚠️ Noch nicht eingerichtet – der Gemini-Schlüssel fehlt auf dem Server.' : aiState.configured ? `✅ Aktiv · heute ${aiState.used}/${aiState.limit} Anfragen genutzt` : 'Prüfe …';
  return (window.accountCard ? window.accountCard() : '') +
  `<div class="card"><h2>KI-Lehrer</h2><p class="small" style="margin:0">${aiTxt}</p>
    <details class="hint"><summary>So funktioniert die KI</summary><p class="small">Deine Texte und Aufnahmen gehen über deinen eigenen Supabase-Server an Google Gemini (kostenlose Stufe). Der Schlüssel liegt nur auf dem Server, nicht in der App. Pro Tag sind ${aiState.limit || 60} Anfragen möglich – eine Session braucht etwa 3–6.</p></details></div>
  <div class="card"><h2>Einstellungen</h2>
    <label class="switch"><span>Sonntag = freier Tag 🌿<br><span class="muted small">Serie läuft weiter, Wochen-Score zählt Mo–Sa</span></span><input type="checkbox" data-set="sundayFree" ${st.sundayFree ? 'checked' : ''}></label>
    <label class="switch"><span>KI-Texte zuerst<br><span class="muted small">Täglicher Lesetext von der KI statt eingebaut</span></span><input type="checkbox" data-set="aiTexts" ${st.aiTexts ? 'checked' : ''}></label>
    <label>Akzent (Vorlesen & Spracherkennung)</label><select class="inp" data-set="accent"><option value="en-GB" ${st.accent === 'en-GB' ? 'selected' : ''}>🇬🇧 Britisch</option><option value="en-US" ${st.accent === 'en-US' ? 'selected' : ''}>🇺🇸 Amerikanisch</option></select>
    <label>Vorlesetempo: <b id="rateV">${st.rate}</b></label><input type="range" min="0.6" max="1.2" step="0.05" value="${st.rate}" data-set="rate" style="width:100%">
    <button class="btn block" data-act="say" data-text="Hi Mouad! This is how I sound. Let's practise a little English every day." style="margin-top:8px">🔊 Stimme testen</button></div>
  <div class="card"><h2>Daten</h2><p class="small muted" style="margin-top:0">Alles wird auf dem Handy gespeichert${window.sbUser ? ' und mit deinem Konto synchronisiert' : ''}.</p>
    <div class="btns"><button class="btn" data-act="export">Exportieren</button><button class="btn" data-act="import">Importieren</button></div><input type="file" id="impFile" accept="application/json" class="hidden"></div>
  <div class="card"><h2>Zum Homescreen</h2><p class="small" style="margin:0"><b>iPhone:</b> In Safari auf Teilen ⬆️ → „Zum Home-Bildschirm“.<br><b>Android:</b> In Chrome ⋮ → „App installieren“.</p></div>
  <p class="muted small center">English Daily v1</p>`;
};
AFTER.tab_more = () => {
  $$('[data-set]').forEach(el => el.addEventListener(el.type === 'range' ? 'input' : 'change', () => {
    const k = el.dataset.set; S.settings[k] = el.type === 'checkbox' ? el.checked : el.type === 'range' ? Number(el.value) : el.value;
    if (k === 'rate') $('#rateV').textContent = el.value; save();
  }));
  const f = $('#impFile'); if (f) f.onchange = async () => { try { const d = JSON.parse(await f.files[0].text()); if (!d || !d.days) throw 0; if (!confirm('Daten aus der Datei übernehmen? (Wird mit deinen aktuellen Daten zusammengeführt.)')) return; S = mergeStates(S, d); save(); toast('Importiert ✓'); render(); } catch (e) { toast('Datei ungültig'); } };
};

/* ---------- Merge (für Sync & Import) ---------- */
function mergeStates(a, b) {
  const cl = o => JSON.parse(JSON.stringify(o || {}));
  a = Object.assign(defaultState(), cl(a)); b = Object.assign(defaultState(), cl(b));
  const newer = (a.updatedAt || 0) >= (b.updatedAt || 0) ? a : b, older = newer === a ? b : a;
  const out = cl(newer);
  out.deleted = Object.assign({}, older.deleted, newer.deleted);
  out.vocab = {};
  for (const src of [older.vocab, newer.vocab]) for (const id in src) { const v = src[id]; if (out.deleted[id]) continue; if (!out.vocab[id] || (v.updatedAt || 0) >= (out.vocab[id].updatedAt || 0)) out.vocab[id] = v; }
  const seen = {}; for (const id in out.vocab) { const k = norm(out.vocab[id].term); if (seen[k]) delete out.vocab[id]; else seen[k] = id; }
  out.days = {};
  for (const src of [older.days, newer.days]) for (const k in src) {
    const d = src[k], o = out.days[k];
    if (!o) { out.days[k] = cl(d); continue; }
    o.steps = Object.assign({}, d.steps, o.steps); o.xp = Math.max(o.xp || 0, d.xp || 0); o.done = o.done || d.done;
    ['textId', 'writeId', 'speakId', 'grammarId', 'mainType', 'grammarReason', 'freeStart'].forEach(f => { if (o[f] == null && d[f] != null) o[f] = d[f]; });
  }
  const byId = (x, y) => { const m = new Map(); [...(x || []), ...(y || [])].forEach(e => m.set(e.id, Object.assign({}, m.get(e.id), e))); return [...m.values()]; };
  out.mistakes = byId(older.mistakes, newer.mistakes).sort((p, q) => String(p.date).localeCompare(String(q.date))).slice(-800);
  out.writings = byId(older.writings, newer.writings); out.speakings = byId(older.speakings, newer.speakings); out.aiTexts = byId(older.aiTexts, newer.aiTexts);
  out.readings = Object.assign({}, older.readings, newer.readings);
  out.grammarDone = Object.assign({}, older.grammarDone, newer.grammarDone);
  out.drafts = Object.assign({}, older.drafts, newer.drafts);
  out.firstDay = [a.firstDay, b.firstDay].filter(Boolean).sort()[0] || null;
  out.updatedAt = Date.now();
  return out;
}
window.mergeStates = mergeStates;
window.hasRealData = st => !!st && (Object.keys(st.days || {}).some(k => Object.keys((st.days[k] || {}).steps || {}).length) || Object.keys(st.vocab || {}).length > 0 || (st.writings || []).length > 0 || (st.speakings || []).length > 0);
window.applyState = st => { S = Object.assign(defaultState(), st, { settings: Object.assign(defaultState().settings, st.settings || {}) }); migrate(); writeLocal(); if (!route.screen) render(); };
window.getState = () => S;
window.setStateTime = () => { S.updatedAt = Date.now(); };
window.writeLocal = writeLocal;
window.renderSafe = () => { if (!route.screen) renderKeepScroll(); };

/* ---------- UI-Helfer ---------- */
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600); }
window.toast = toast;
function openSheet(html, init) { const s = $('#sheet'); $('#sheetBody').innerHTML = html; s.classList.remove('hidden'); requestAnimationFrame(() => s.classList.add('open')); if (init) init($('#sheetBody')); }
function closeSheet() { const s = $('#sheet'); s.classList.remove('open'); setTimeout(() => { if (!s.classList.contains('open')) s.classList.add('hidden'); }, 200); }
window.openSheet = openSheet; window.closeSheet = closeSheet;
document.addEventListener('click', e => { if (e.target.classList.contains('sheet-backdrop')) closeSheet(); });
function celebrate() {
  const d = day(); const el = document.createElement('div'); el.className = 'celebrate';
  el.innerHTML = `<div class="cbox"><div class="big">🏆</div><h3>Tages-Session geschafft!</h3><p>+${d.xp} XP heute · 🔥 ${streak()} ${streak() === 1 ? 'Tag' : 'Tage'} Serie</p><p class="muted small">Level ${levelInfo().n}: ${esc(levelInfo().name)}</p><button class="btn primary block">Weiter</button></div>`;
  document.body.appendChild(el); el.querySelector('button').onclick = () => el.remove();
  for (let i = 0; i < 40; i++) { const c = document.createElement('i'); c.className = 'conf'; c.style.left = Math.random() * 100 + '%'; c.style.background = ['#6ec6b0', '#f2c46d', '#e98a7a', '#8fb8ff'][i % 4]; c.style.animationDelay = Math.random() * .6 + 's'; el.appendChild(c); }
}
function openStep(id) {
  if (id === 'review') open('review');
  else if (id === 'read') open('read');
  else if (id === 'main') open(mainType() === 'speak' ? 'speak' : 'write');
  else if (id === 'grammar') open('lesson');
}
function nextStep() {
  const n = STEPS.find(s => !stepDone(s.id));
  route = { tab: 'today', screen: null, p: {} };
  if (!n) { go('today'); return; }
  openStep(n.id);
}

/* ---------- Events ---------- */
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const act = b.dataset.act;
  if (b.tagName === 'A') e.preventDefault();
  switch (act) {
    case 'tab': closeSheet(); go(b.dataset.tab); break;
    case 'open': closeSheet(); open(b.dataset.s, { id: b.dataset.id, free: b.dataset.free }); break;
    case 'back': back(); break;
    case 'step': openStep(b.dataset.id); break;
    case 'nextstep': nextStep(); break;
    case 'swapmain': { const d = day(); d.mainType = mainType() === 'write' ? 'speak' : 'write'; save(); render(); break; }
    case 'freestart': day().freeStart = true; save(); render(); break;
    case 'say': speak(b.dataset.text, b); break;
    case 'word': wordSheet(b.textContent, sentenceOf(b)); break;
    case 'readcheck': readCheck(b); break;
    case 'selfq': { const i = b.parentElement.dataset.qi; tmp.self[i] = Number(b.dataset.v); $$('button', b.parentElement).forEach(x => x.classList.toggle('on', x === b)); tmp.selfFinish(); break; }
    case 'addphrase': { const ph = tmp.text.phrases[b.dataset.i]; const re = new RegExp('[^.!?\\n]*' + ph.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^.!?\\n]*[.!?]', 'i'); addVocab({ term: ph.term, meaning: ph.meaning_de, expl: ph.explanation_en, example: ((tmp.text.text.match(re) || [''])[0]).trim(), source: tmp.text.title }, true); b.textContent = '✓'; b.classList.add('on'); toast(`„${ph.term}“ gespeichert 📌`); break; }
    case 'addallphrases': { let n = 0; $$('[data-act=addphrase]').forEach(x => { if (!x.classList.contains('on')) { x.click(); n++; } }); toast(n ? `${n} Wörter gespeichert 📌` : 'Schon alle gespeichert ✓'); break; }
    case 'addv': addVocab({ term: b.dataset.term, meaning: b.dataset.meaning, example: b.dataset.example, source: 'Feedback' }); b.textContent = '✓'; b.classList.add('on'); break;
    case 'writesubmit': writeSubmit(b); break;
    case 'writeself': writeSelf(); break;
    case 'rec': if (rec && rec.active) stopRec(); else startRec(); break;
    case 'rerec': $('#trCard').classList.add('hidden'); $('#recAudio').classList.add('hidden'); $('#liveTr').textContent = ''; rec = null; startRec(); break;
    case 'speaksubmit': speakSubmit(b); break;
    case 'speakself': speakSelf(); break;
    case 'gcheck': grammarCheck(); break;
    case 'gover': { const i = Number(b.dataset.i); tmp.gok[i] = true; const r = b.closest('.reveal'); r.className = 'reveal ok'; r.innerHTML = '✅ Als richtig gewertet'; const g = tmp.g; S.grammarDone[g.id] = { date: today(), score: Math.round(tmp.gok.filter(Boolean).length / tmp.gok.length * 100) }; save(); break; }
    case 'rvcheck': {
      const v = tmp.v, ans = $('#ans').value.trim(); if (!ans) { toast('Erst eine Antwort eingeben'); break; }
      if (tmp.mode === 'produce') {
        const a = norm(ans), t = norm(v.term), t2 = norm(v.term.replace(/^(to|a|an|the) /i, ''));
        const ok = a === t || a === t2 || (t.length > 5 && lev(a, t) <= 1);
        revealCard(v, ok, ok && a !== t && a !== t2 ? `<div class="small">Fast perfekt – Schreibweise: <b>${esc(v.term)}</b></div>` : '');
        if (ok) $('#rvBtns').innerHTML = `<button class="btn" data-act="rvgrade" data-g="1">Schwer</button><button class="btn primary" data-act="rvgrade" data-g="2">Gut</button><button class="btn" data-act="rvgrade" data-g="3">Leicht</button>`;
      } else {
        if (words(ans) < 4) { toast('Schreib einen ganzen Satz 🙂'); break; }
        if (aiReady()) {
          b.disabled = true; b.textContent = '✨ …';
          try { const r = await ai('vocab_check', { term: v.term, meaning: v.meaning, task: 'Use the word in your own sentence', answer: ans });
            revealCard(v, !!r.correct, `<div class="small" style="margin-top:8px">${esc(r.feedback_de)}</div>${r.better && norm(r.better) !== norm(ans) ? `<div class="small en">✏️ ${diffWords(ans, r.better)}</div>` : ''}`);
            if (r.correct) $('#rvBtns').innerHTML = `<button class="btn" data-act="rvgrade" data-g="1">Schwer</button><button class="btn primary" data-act="rvgrade" data-g="${r.rating === 'great' ? 3 : 2}">Weiter</button>`;
          } catch (err) { revealCard(v, null, `<p class="small errmsg">${esc(err.message)} – bewerte dich selbst:</p>`); }
        } else revealCard(v, null, '<p class="muted small">Passt dein Satz zur Bedeutung? Bewerte dich selbst:</p>');
      }
      break; }
    case 'rvshow': revealCard(tmp.v, false); $('#rvBtns').innerHTML = `<button class="btn primary" data-act="rvgrade" data-g="0">Weiter</button>`; break;
    case 'rvgrade': { const g = Number(b.dataset.g); gradeCard(tmp.v, g); if (g > 0) tmp.right++; tmp.i++; tmp.xp = (tmp.xp || 0) + (g > 0 ? XP.review : 1); save(); render(); AFTER.review(); break; }
    case 'reviewdone': {
      const xp = Math.min(XP.reviewMax, tmp.xp || 0);
      if (route.p.free) { addXP(xp); save(); back(); }
      else { const bonus = completeStep('review', xp || 10); if (bonus) celebrate(); nextStep(); }
      break; }
    case 'psec': tmp.psec = b.dataset.k; render(); break;
    case 'addword': wordEditSheet(null); break;
    case 'editword': wordEditSheet(S.vocab[b.dataset.id]); break;
    case 'ownwrite': askSheet('Eigenes Thema', 'Worüber willst du schreiben?', 'z. B. My plans for next year', '', t => { if (t) open('write', { own: t }); }); break;
    case 'gentext': {
      if (!aiReady()) { toast(window.sbUser ? 'KI ist noch nicht eingerichtet' : 'Bitte zuerst unter „Mehr“ anmelden'); break; }
      askSheet('Neuer KI-Text', 'Thema (leer = Überraschung)', 'z. B. Boxing, Startups, Ramadan …', '', async topic => {
        toast('✨ KI schreibt deinen Text …');
        try { const r = await ai('text', { topic, avoid: allTexts().slice(-15).map(t => t.title) }); if (!r || !r.text || !r.questions) throw new Error('Text unvollständig – bitte nochmal.');
          const t = { id: 'ai_' + uid(), ai: true, date: today(), title: r.title, topic: r.topic || topic, text: r.text, phrases: r.phrases || [], questions: r.questions.map(q => ({ ...q, model: q.model || '' })) };
          S.aiTexts.push(t); save(); open('read', { id: t.id }); } catch (err) { toast(err.message); }
      });
      break; }
    case 'latefb': {
      const e2 = tmp.entry; b.disabled = true; b.textContent = '✨ Dein Lehrer korrigiert …';
      try { const fb = await ai('writing', { prompt: e2.prompt, text: e2.text, targetWords: e2.tw || [] }); e2.fb = fb; e2.cefr = fb.cefr; addMistakes(fb.mistakes, 'Schreiben'); addXP(10); save(); render(); }
      catch (err) { toast(err.message); b.disabled = false; b.textContent = 'Jetzt korrigieren lassen ✨'; }
      break; }
    case 'export': { const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `english-daily-${today()}.json`; a.click(); break; }
    case 'import': $('#impFile').click(); break;
  }
});
$$('.tabbar button').forEach(b => b.addEventListener('click', () => { stopRec(true); if ('speechSynthesis' in window) speechSynthesis.cancel(); go(b.dataset.tab); }));
$('#backBtn').addEventListener('click', back);
let lastDay = today();
document.addEventListener('visibilitychange', () => { if (!document.hidden && today() !== lastDay) { lastDay = today(); if (!route.screen) render(); } });

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
render();
