'use strict';
/* ===== Monk Mode v4 – Datenmodell, Migration, Speicherung (localStorage + IndexedDB) ===== */
const KEY = 'monkmode.v1';          // gleicher Schlüssel wie bisher -> alte Daten werden gefunden
const BAK_KEY = 'monkmode.v1.bak';  // letzte gültige Version (Schutz gegen kaputte Schreibvorgänge)
const APP_VERSION = '4.0';

const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const today = () => iso(new Date());
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const clone = o => JSON.parse(JSON.stringify(o == null ? {} : o));

const GOAL_TYPES = { check: 'Abhaken', minutes: 'Minuten', pages: 'Seiten', count: 'Anzahl', sleep: 'Schlaf' };
const DEFAULT_GOALS = () => {
  const t = today();
  return [
    { id: uid(), name: 'Sport', emoji: '🏋️', type: 'check', target: 1, created: t },
    { id: uid(), name: 'Schlaf 22–5 Uhr', emoji: '😴', type: 'sleep', target: 1, bed: '22:00', wake: '05:00', created: t },
    { id: uid(), name: 'Lesen', emoji: '📖', type: 'pages', target: 1, created: t },
    { id: uid(), name: 'Lernen', emoji: '🧠', type: 'minutes', target: 60, created: t }
  ];
};
const defaultState = () => ({
  version: 4, goals: [], log: {}, sleep: {}, social: {}, sunday: {}, alts: {}, weekScores: {}, lockAck: {},
  ts: {}, deleted: {}, challenge: null, challengeHistory: [], focus: null,
  settings: { socialLimit: 120 }, firstDay: null, updatedAt: 0
});
const isObj = o => o && typeof o === 'object' && !Array.isArray(o);

/* Bringt JEDEN gespeicherten Stand (v1–v4, Cloud, Backup-Datei) ins v4-Format. Löscht nie Einträge. */
function migrateState(raw) {
  const st = Object.assign(defaultState(), isObj(raw) ? clone(raw) : {});
  for (const k of ['log', 'sleep', 'social', 'sunday', 'alts', 'weekScores', 'lockAck', 'ts', 'deleted']) if (!isObj(st[k])) st[k] = {};
  st.settings = Object.assign({ socialLimit: 120 }, isObj(st.settings) ? st.settings : {});
  if (!Array.isArray(st.goals)) st.goals = [];
  if (!Array.isArray(st.challengeHistory)) st.challengeHistory = [];
  const fresh = !isObj(raw) || (!raw.goals && !raw.habits && !raw.log);
  // v1–v3: "Gewohnheiten" -> Monk-Mode-Ziele (gleiche IDs, Verlauf bleibt erhalten)
  if (Array.isArray(st.habits)) {
    const have = new Set(st.goals.map(g => g.id));
    st.habits.forEach(h => {
      if (!h || have.has(h.id)) return;
      let type = h.type || ((Number(h.target) || 1) > 1 ? 'count' : 'check');
      if (type === 'timer') type = 'minutes';
      if (type === 'count' && (/seite/i.test(h.unit || '') || /lesen|buch/i.test(h.name || ''))) type = 'pages';
      const g = { id: h.id || uid(), name: h.name || 'Ziel', emoji: h.emoji || '•', type, target: Math.max(1, Number(h.target) || 1), created: h.created || st.firstDay || today() };
      if (type === 'count') g.unit = h.unit || '';
      if (type === 'sleep') { g.bed = h.bed || '22:00'; g.wake = h.wake || '05:00'; }
      // alte Standardnamen etwas kürzer
      if (g.name === 'Lesen – mind. 1 Seite') g.name = 'Lesen';
      if (g.name === 'Lernen – mind. 1 Stunde') g.name = 'Lernen';
      st.goals.push(g); have.add(g.id);
    });
    delete st.habits;
  }
  // v1–v3: Monk-Challenge mit Regeln -> Regeln werden Abhak-Ziele, Challenge bleibt als Zeitraum
  if (isObj(st.monk)) {
    const m = st.monk;
    (m.rules || []).forEach(r => { if (r && r.id && !st.goals.some(g => g.id === r.id)) st.goals.push({ id: r.id, name: r.name, emoji: '🚫', type: 'check', target: 1, created: m.start || today() }); });
    if (!st.challenge) st.challenge = { id: m.id || uid(), name: m.name || 'Monk Mode', start: m.start || today(), days: Number(m.days) || 30 };
    delete st.monk;
  }
  if (isObj(st.ruleLog)) {
    for (const d in st.ruleLog) (st.ruleLog[d] || []).forEach(id => { st.log[d] = st.log[d] || {}; st.log[d][id] = Math.max(1, st.log[d][id] || 0); });
    delete st.ruleLog;
  }
  if (Array.isArray(st.monkHistory)) {
    st.monkHistory.forEach(h => { if (!st.challengeHistory.some(x => x.name === h.name && x.start === h.start && x.endedAt === h.endedAt)) st.challengeHistory.push(h); });
    delete st.monkHistory;
  }
  if (isObj(st.timer)) { if (!st.focus) st.focus = { kind: 'goal', goalId: st.timer.id, startedAt: st.timer.startedAt, day: st.timer.day || today(), plan: 0 }; }
  delete st.timer; delete st.defaultsAdded;
  if (fresh && !st.goals.length) st.goals = DEFAULT_GOALS();
  st.goals = st.goals.filter(g => g && g.id && !st.deleted[g.id]);
  st.goals.forEach(g => { if (!GOAL_TYPES[g.type]) g.type = 'check'; g.target = Math.max(1, Number(g.target) || 1); if (!g.created) g.created = today(); });
  if (!st.firstDay) {
    const days = Object.keys(st.log).concat(st.goals.map(g => g.created)).filter(Boolean).sort();
    st.firstDay = days[0] || today();
  }
  st.version = 4;
  return st;
}

/* "Echte" Daten = mehr als ein leerer Standard-Stand */
function hasRealData(st) {
  if (!isObj(st)) return false;
  const ne = o => isObj(o) && Object.keys(o).length > 0;
  return ne(st.log) || ne(st.social) || ne(st.sunday) || ne(st.sleep) || ne(st.ruleLog) || ne(st.alts) || !!st.monk || !!st.challenge ||
    (st.monkHistory || []).length > 0 || (st.challengeHistory || []).length > 0 ||
    [...(st.goals || []), ...(st.habits || [])].some(g => g && !DEFAULT_NAMES.includes(String(g.name).trim().toLowerCase()));
}
const DEFAULT_NAMES = ['sport', 'schlaf 22–5 uhr', 'lesen', 'lernen', 'lesen – mind. 1 seite', 'lernen – mind. 1 stunde'];

/* Zusammenführen zweier Stände (z. B. Handy + Cloud). Pro Eintrag gewinnt die zuletzt geänderte Version
   (Zeitstempel in st.ts), dadurch bleiben auch Ent-Haken und Löschungen erhalten. */
function mergeStates(a0, b0) {
  const a = migrateState(a0), b = migrateState(b0);
  const newer = (a.updatedAt || 0) >= (b.updatedAt || 0) ? a : b, older = newer === a ? b : a;
  const out = clone(newer);
  out.deleted = Object.assign({}, older.deleted, newer.deleted);
  out.ts = Object.assign({}, older.ts);
  for (const k in newer.ts) out.ts[k] = Math.max(out.ts[k] || 0, newer.ts[k]);
  // Ziele: Vereinigung nach ID; gleicher Name+Typ auf zwei Geräten -> zusammenlegen
  const byId = new Map(); older.goals.forEach(g => byId.set(g.id, g)); newer.goals.forEach(g => byId.set(g.id, g));
  const order = [...newer.goals.map(g => g.id), ...older.goals.map(g => g.id).filter(id => !newer.goals.some(g => g.id === id))];
  const remap = {}, seen = {};
  out.goals = order.map(id => byId.get(id)).filter(g => !out.deleted[g.id]).filter(g => {
    const k = String(g.name).trim().toLowerCase() + '|' + g.type;
    if (seen[k]) { remap[g.id] = seen[k].id; if (g.created < seen[k].created) seen[k].created = g.created; return false; }
    seen[k] = g; return true;
  });
  const pick = (key, va, vb, tsKey) => { // va = older, vb = newer
    const ta = older.ts[tsKey] || 0, tb = newer.ts[tsKey] || 0;
    if (ta || tb) return ta > tb ? va : vb;
    return va !== undefined && vb !== undefined && typeof va === 'number' ? Math.max(va, vb) : (vb !== undefined ? vb : va);
  };
  // pro Tag & Ziel
  const perDayGoal = (field, prefix) => {
    const res = {}; const days = new Set([...Object.keys(older[field]), ...Object.keys(newer[field])]);
    for (const k in out.ts) if (k.startsWith(prefix + '|')) days.add(k.split('|')[1]);
    for (const d of days) {
      const ids = new Set([...Object.keys(older[field][d] || {}), ...Object.keys(newer[field][d] || {})]);
      for (const k in out.ts) { const p = k.split('|'); if (p[0] === prefix && p[1] === d) ids.add(p[2]); }
      for (const id0 of ids) {
        const v = pick(id0, (older[field][d] || {})[id0], (newer[field][d] || {})[id0], `${prefix}|${d}|${id0}`);
        const id = remap[id0] || id0;
        if (v === undefined || v === null || v === 0 || out.deleted[id]) continue;
        res[d] = res[d] || {};
        res[d][id] = typeof v === 'number' && typeof res[d][id] === 'number' ? Math.max(v, res[d][id]) : v;
      }
    }
    return res;
  };
  out.log = perDayGoal('log', 'l');
  out.sleep = perDayGoal('sleep', 'z');
  // pro Tag
  const perDay = (field, prefix) => {
    const res = {}; const days = new Set([...Object.keys(older[field]), ...Object.keys(newer[field])]);
    for (const d of days) { const v = pick(d, older[field][d], newer[field][d], `${prefix}|${d}`); if (v !== undefined && v !== null && v !== 0) res[d] = v; }
    return res;
  };
  out.social = perDay('social', 's');
  out.sunday = perDay('sunday', 'u');
  out.alts = {};
  for (const src of [older.alts, newer.alts]) for (const d in src) { const m = new Map((out.alts[d] || []).map(x => [x.k, x])); (src[d] || []).forEach(x => m.set(x.k, x)); out.alts[d] = [...m.values()]; }
  out.weekScores = Object.assign({}, older.weekScores, newer.weekScores);
  out.lockAck = Object.assign({}, older.lockAck, newer.lockAck);
  const hk = h => `${h.name}|${h.start}|${h.endedAt}`; const hm = new Map();
  [...older.challengeHistory, ...newer.challengeHistory].forEach(h => hm.set(hk(h), h)); out.challengeHistory = [...hm.values()];
  out.firstDay = [a.firstDay, b.firstDay].filter(Boolean).sort()[0] || null;
  if (out.focus && remap[out.focus.goalId]) out.focus.goalId = remap[out.focus.goalId];
  out.updatedAt = Math.max(a.updatedAt || 0, b.updatedAt || 0);
  return out;
}

/* ---------- IndexedDB (zweite, unabhängige Sicherung + Tages-Snapshots) ---------- */
const IDB = (() => {
  let dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      if (!window.indexedDB) return rej(new Error('kein IndexedDB'));
      const r = indexedDB.open('monkmode', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); r.onblocked = () => rej(new Error('blocked'));
    });
    dbp.catch(() => { dbp = null; });
    return dbp;
  }
  const tx = async (mode, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction('kv', mode); const out = fn(t.objectStore('kv')); t.oncomplete = () => res(out && 'result' in out ? out.result : undefined); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }); };
  return {
    put: (k, v) => tx('readwrite', s => s.put(v, k)),
    get: k => tx('readonly', s => s.get(k)),
    keys: () => tx('readonly', s => s.getAllKeys()),
    del: k => tx('readwrite', s => s.delete(k))
  };
})();

const Persist = { lsOk: true, idbOk: null, persisted: null, lastSaved: 0, restoredFrom: null };
let S;
let idbTimer = null;

function writeLocal() {
  const json = JSON.stringify(S);
  try { localStorage.setItem(KEY, json); Persist.lsOk = true; Persist.lastSaved = Date.now(); }
  catch (e) { Persist.lsOk = false; console.warn('localStorage', e); }
  clearTimeout(idbTimer); idbTimer = setTimeout(writeIdb, 250);
  return json;
}
function writeIdb() {
  clearTimeout(idbTimer);
  const json = JSON.stringify(S);
  return IDB.put('state', json).then(() => { Persist.idbOk = true; return snapshot(json); }).catch(e => { Persist.idbOk = false; console.warn('IDB', e); });
}
// ein Snapshot pro Tag, die letzten 21 Tage bleiben
async function snapshot(json) {
  if (!hasRealData(S)) return;
  await IDB.put('snap:' + today(), json);
  if (Math.random() < 0.2) {
    const ks = (await IDB.keys()).filter(k => /^snap:\d{4}-/.test(k)).sort();
    for (const k of ks.slice(0, Math.max(0, ks.length - 21))) await IDB.del(k);
  }
}
async function snapshotNamed(name) { try { await IDB.put('snap:' + name, JSON.stringify(S)); } catch (e) {} }
// sofort und vollständig speichern (beim Verlassen der App)
function flush() { if (!S) return; writeLocal(); writeIdb(); }

function readJSON(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
function loadState() {
  let raw = readJSON(KEY);
  if (!raw) { raw = readJSON(BAK_KEY); if (raw) Persist.restoredFrom = 'bak'; }
  const wasOld = raw && (raw.version || 0) < 4;
  if (wasOld) { try { localStorage.setItem('monkmode.v3.original', JSON.stringify(raw)); } catch (e) {} IDB.put('snap:vor-v4', JSON.stringify(raw)).catch(() => {}); }
  S = migrateState(raw);
  const json = writeLocal();
  try { localStorage.setItem(BAK_KEY, json); } catch (e) {}
  return raw;
}
// Nach dem Start: IndexedDB prüfen – falls localStorage leer/älter war (z. B. von iOS geleert), wiederherstellen
async function reconcileWithIdb(onRestore) {
  try {
    const j = await IDB.get('state'); Persist.idbOk = true;
    if (!j) { writeIdb(); return; }
    const st = JSON.parse(j);
    if (hasRealData(st) && (!hasRealData(S) || (st.updatedAt || 0) > (S.updatedAt || 0))) {
      S = hasRealData(S) ? mergeStates(S, st) : migrateState(st);
      Persist.restoredFrom = 'idb'; writeLocal(); onRestore && onRestore();
    } else writeIdb();
  } catch (e) { Persist.idbOk = false; }
}
async function requestPersist() {
  try {
    if (!navigator.storage || !navigator.storage.persist) return;
    Persist.persisted = await navigator.storage.persisted();
    if (!Persist.persisted) Persist.persisted = await navigator.storage.persist();
  } catch (e) {}
}
// Umgebung erkennen, in der Daten typischerweise verloren gehen
function storageEnv() {
  const ua = navigator.userAgent || '';
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const inApp = /FBAN|FBAV|Instagram|Line\/|Snapchat|TikTok|GSA\/|Twitter|LinkedInApp|wv\)/.test(ua) || (ios && !/Safari\//.test(ua) && !standalone);
  return { ios, standalone, inApp, browserTab: !standalone };
}
