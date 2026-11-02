'use strict';
/* ===== Storage ===== */
const KEY = 'monkmode.v1';
const defaultState = () => ({ version: 2, monk: null, monkHistory: [], habits: [], log: {}, ruleLog: {},
  sleep: {}, social: {}, sunday: {}, weekScores: {}, lockAck: {}, timer: null, settings: { socialLimit: 120 }, firstDay: null, defaultsAdded: false, deleted: {}, updatedAt: 0 });
let S;
function load() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(KEY)); } catch (e) { raw = null; }
  S = Object.assign(defaultState(), raw || {});
  migrate();
}
function writeLocal() { localStorage.setItem(KEY, JSON.stringify(S)); }
function save() { S.updatedAt = Date.now(); writeLocal(); if (window.onLocalSave) window.onLocalSave(); }

/* ===== Date helpers (local time) ===== */
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const today = () => iso(new Date());
const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
const DOW = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const fmtLong = s => parse(s).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtShort = s => parse(s).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtDM = s => parse(s).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = s => document.querySelector(s);
const isSunday = d => parse(d).getDay() === 0;
const weekStart = d => iso(addDays(parse(d), -((parse(d).getDay() + 6) % 7)));
const toMin = t => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + m; };

/* ===== Migration (never wipes data) ===== */
function migrate() {
  S.settings = Object.assign({ socialLimit: 120 }, S.settings || {});
  for (const k of ['sleep', 'social', 'sunday', 'weekScores', 'lockAck', 'log', 'ruleLog']) if (!S[k] || typeof S[k] !== 'object') S[k] = {};
  if (!Array.isArray(S.habits)) S.habits = [];
  if (!Array.isArray(S.monkHistory)) S.monkHistory = [];
  S.habits.forEach(h => { if (!h.type) h.type = (Number(h.target) || 1) > 1 ? 'count' : 'check'; if (!h.id) h.id = uid(); });
  if (!S.firstDay) {
    const keys = Object.keys(S.log).sort();
    const created = S.habits.map(h => h.created).filter(Boolean).sort();
    S.firstDay = [keys[0], created[0], today()].filter(Boolean).sort()[0];
  }
  if (!S.defaultsAdded) {
    const t = today();
    const defs = [
      { name: 'Sport', emoji: '🏋️', type: 'check', target: 1, unit: '' },
      { name: 'Schlaf 22–5 Uhr', emoji: '😴', type: 'sleep', target: 1, unit: '', bed: '22:00', wake: '05:00' },
      { name: 'Lesen – mind. 1 Seite', emoji: '📖', type: 'count', target: 1, unit: 'Seite(n)' },
      { name: 'Lernen – mind. 1 Stunde', emoji: '🧠', type: 'timer', target: 60, unit: 'Min' }
    ];
    const names = S.habits.map(h => h.name.toLowerCase());
    defs.forEach(d => { if (!names.includes(d.name.toLowerCase())) S.habits.push(Object.assign({ id: uid(), created: t }, d)); });
    S.defaultsAdded = true;
  }
  if (!S.deleted || typeof S.deleted !== 'object') S.deleted = {};
  S.version = 3;
  writeLocal();
}
load();
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

/* ===== Social media / lock ===== */
const limit = () => Number(S.settings.socialLimit) || 120;
const socialMin = d => Number(S.social[d]) || 0;
const isBlocked = d => !isSunday(d) && socialMin(d) > limit();
function setSocial(d, n) { n = Math.max(0, Math.min(1440, Math.round(n))); if (n) S.social[d] = n; else delete S.social[d]; save(); }

/* ===== Habit logic ===== */
const target = h => Math.max(1, Number(h.target) || 1);
const count = (h, day) => (S.log[day] && S.log[day][h.id]) || 0;
const isDone = (h, day) => count(h, day) >= target(h);
const doneEff = (h, day) => !isBlocked(day) && isDone(h, day); // counts for score/streaks
const habitStart = h => h.created || today();
const activeOn = (h, d) => habitStart(h) <= d;
function setCount(h, day, n) {
  n = Math.max(0, Math.min(n, Math.max(target(h) * 10, 1440)));
  S.log[day] = S.log[day] || {};
  if (n === 0) delete S.log[day][h.id]; else S.log[day][h.id] = n;
  if (!Object.keys(S.log[day]).length) delete S.log[day];
  if (day < habitStart(h)) h.created = day;
  save();
}
function sleepOk(h, e) {
  if (!e || !e.bed || !e.wake) return null;
  let b = toMin(e.bed); const w = toMin(e.wake);
  if (b < 12 * 60) b += 24 * 60; // after midnight = late
  return b <= toMin(h.bed || "22:00") && w <= toMin(h.wake || '05:00') && w >= 120;
}
function setSleep(h, day, bed, wake) {
  S.sleep[day] = S.sleep[day] || {};
  S.sleep[day][h.id] = { bed, wake };
  const ok = sleepOk(h, S.sleep[day][h.id]);
  setCount(h, day, ok ? 1 : 0);
}
// Streaks: Sundays are free days and neither count nor break a streak
function streaks(h) {
  const t = today();
  let cur = 0, d = parse(t);
  if (!doneEff(h, t) || isSunday(t)) d = addDays(d, -1);
  while (true) { const k = iso(d); if (k < habitStart(h)) break; if (isSunday(k)) { d = addDays(d, -1); continue; } if (!doneEff(h, k)) break; cur++; d = addDays(d, -1); }
  let best = 0, run = 0, x = parse(habitStart(h)); const end = parse(t);
  while (x <= end) { const k = iso(x); if (!isSunday(k)) { if (doneEff(h, k)) { run++; best = Math.max(best, run); } else if (k !== t) run = 0; } x = addDays(x, 1); }
  return { cur, best: Math.max(best, cur) };
}
function completion(h, n) {
  const t = today(); const start = habitStart(h);
  let tot = 0, done = 0;
  for (let i = 0; i < n; i++) { const d = iso(addDays(parse(t), -i)); if (d < start) break; if (isSunday(d)) continue; if (d === t && !doneEff(h, d)) continue; tot++; if (doneEff(h, d)) done++; }
  return tot ? Math.round(done / tot * 100) : 0;
}
function dayRatio(day, habits) {
  if (isSunday(day)) return null;
  const hs = habits.filter(h => activeOn(h, day));
  if (!hs.length) return null;
  if (isBlocked(day)) return -1;
  return hs.filter(h => doneEff(h, day)).length / hs.length;
}

/* ===== Weekly score (Mo–Sa, 6 Tage) ===== */
function dayScore(d) {
  if (isSunday(d)) return null;
  const hs = S.habits.filter(h => activeOn(h, d));
  if (!hs.length) return null;
  const max = hs.length + 1; // + Social-Media-Limit
  if (isBlocked(d)) return { pts: 0, max, blocked: true };
  return { pts: hs.filter(h => isDone(h, d)).length + 1, max, blocked: false };
}
function grade(p) {
  if (p >= 92) return { n: '1', t: 'sehr gut', e: '🏆' };
  if (p >= 81) return { n: '2', t: 'gut', e: '💪' };
  if (p >= 67) return { n: '3', t: 'befriedigend', e: '👍' };
  if (p >= 50) return { n: '4', t: 'ausreichend', e: '😐' };
  if (p >= 30) return { n: '5', t: 'mangelhaft', e: '⚠️' };
  return { n: '6', t: 'ungenügend', e: '⛔' };
}
function weekScore(ws, upTo) {
  let pts = 0, max = 0, blocked = 0, days = [];
  for (let i = 0; i < 6; i++) {
    const d = iso(addDays(parse(ws), i));
    if (upTo && d > upTo) { days.push({ d, future: true }); continue; }
    const s = dayScore(d);
    days.push(Object.assign({ d }, s || { none: true }));
    if (s) { pts += s.pts; max += s.max; if (s.blocked) blocked++; }
  }
  const pct = max ? Math.round(pts / max * 100) : 0;
  return { ws, pts, max, pct, blocked, days, grade: grade(pct) };
}
// Freeze finished weeks once (computed at end of each week)
function finalizeWeeks() {
  const t = today();
  let ws = weekStart(S.firstDay || t); let changed = false;
  while (iso(addDays(parse(ws), 5)) < t) { // Mo–Sa finished (Saturday is over)
    if (!S.weekScores[ws]) { const w = weekScore(ws); if (w.max) { S.weekScores[ws] = { pts: w.pts, max: w.max, pct: w.pct, blocked: w.blocked }; changed = true; } }
    ws = iso(addDays(parse(ws), 7));
  }
  if (changed) save();
}
function monkInfo() {
  const m = S.monk; if (!m) return null;
  const t = today();
  const dayNum = diffDays(m.start, t) + 1;
  const end = addDays(parse(m.start), m.days); // moment the challenge finishes
  return { m, dayNum, started: dayNum >= 1, finished: dayNum > m.days, cur: Math.min(Math.max(dayNum, 0), m.days), end, pct: dayNum >= 1 ? Math.min(1, dayNum / m.days) : 0 };
}
const ruleDone = (rid, day) => (S.ruleLog[day] || []).includes(rid);
function toggleRule(rid, day) {
  const arr = S.ruleLog[day] = S.ruleLog[day] || [];
  const i = arr.indexOf(rid); if (i >= 0) arr.splice(i, 1); else arr.push(rid);
  if (!arr.length) delete S.ruleLog[day];
  save();
}

const CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 1900); }
function vibrate() { if (navigator.vibrate) navigator.vibrate(12); }
function ring(pct, size, stroke, inner) {
  const r = (100 - stroke) / 2, c = 2 * Math.PI * r;
  return `<div class="ring ${size}"><svg viewBox="0 0 100 100"><circle class="bg" cx="50" cy="50" r="${r}" fill="none" stroke-width="${stroke}"/><circle class="fg" cx="50" cy="50" r="${r}" fill="none" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}"/></svg><div class="center">${inner}</div></div>`;
}
function openSheet(html, onMount) {
  $('#sheetBody').innerHTML = html; $('#sheet').classList.remove('hidden');
  if (onMount) onMount($('#sheetBody'));
}
function closeSheet() { $('#sheet').classList.add('hidden'); $('#sheetBody').innerHTML = ''; }
$('#sheet .sheet-backdrop').addEventListener('click', closeSheet);

const QUOTES = ['Disziplin ist Freiheit.', 'Kleine Schritte, jeden Tag.', 'Was du täglich tust, formt, wer du bist.', 'Ruhe ist Stärke.', 'Fokus ist die Kunst, Nein zu sagen.', 'Der Weg ist das Ziel.', 'Heute zählt.', 'Werde 1 % besser – jeden Tag.'];
const quoteOfDay = () => QUOTES[(parse(today()) / 86400000 | 0) % QUOTES.length];

/* ===== Router ===== */
let tab = 'today';
const TITLES = { today: 'Heute', monk: 'Monk Mode', habits: 'Gewohnheiten', stats: 'Statistik', settings: 'Mehr' };
document.querySelectorAll('.tabbar button').forEach(b => b.addEventListener('click', () => go(b.dataset.tab)));
function go(t) {
  tab = t;
  document.querySelectorAll('.tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
  window.scrollTo(0, 0); render();
}
function render() {
  finalizeWeeks();
  $('#title').textContent = TITLES[tab];
  $('#subtitle').textContent = tab === 'today' ? fmtLong(today()) : '';
  const v = $('#view');
  v.innerHTML = ({ today: viewToday, monk: viewMonk, habits: viewHabits, stats: viewStats, settings: viewSettings })[tab]();
  bind(v);
  renderLock();
}

/* ===== Lock overlay ===== */
function renderLock() {
  const t = today(); let o = document.getElementById('lock');
  const show = isBlocked(t) && !S.lockAck[t] && tab === 'today';
  if (!show) { if (o) o.remove(); return; }
  if (!o) { o = document.createElement('div'); o.id = 'lock'; document.body.appendChild(o); }
  o.innerHTML = `<div class="lock-inner"><div class="lock-icon">⛔</div><h2>Limit überschritten –<br>alles gesperrt</h2>
    <p>Du warst heute <b>${socialMin(t)} Min</b> auf Social Media (Limit ${limit()} Min).</p>
    <p class="small">Der heutige Tag ist gesperrt und zählt als <b>nicht bestanden</b> – 0 Punkte im Wochenscore. Morgen ist ein neuer Tag.</p>
    <div class="btns" style="flex-direction:column"><button class="btn lockbtn" id="lockOk">Verstanden</button><button class="btn ghost" id="lockFix" style="color:#fff">Eingabe korrigieren</button></div></div>`;
  o.querySelector('#lockOk').onclick = () => { S.lockAck[t] = true; save(); render(); };
  o.querySelector('#lockFix').onclick = () => socialForm();
}

/* ===== Views ===== */
function fmtMin(m) { m = Math.round(m); return m >= 60 ? `${Math.floor(m / 60)} h ${pad(m % 60)} Min` : `${m} Min`; }
function timerElapsed(h) { return S.timer && S.timer.id === h.id ? (Date.now() - S.timer.startedAt) / 60000 : 0; }
function habitRow(h, day, locked) {
  const c = count(h, day), t = target(h), done = c >= t;
  const s = streaks(h);
  const streakTxt = s.cur ? `🔥 ${s.cur} ${s.cur === 1 ? 'Tag' : 'Tage'}` : 'Noch keine Serie';
  let ctl, meta;
  if (locked) {
    ctl = `<span class="locked-tag">🔒 gesperrt</span>`; meta = 'Tag gesperrt – Social-Media-Limit überschritten';
  } else if (h.type === 'timer') {
    const run = S.timer && S.timer.id === h.id;
    ctl = `<div class="counter"><button class="mini" data-act="addmin" data-id="${h.id}" data-n="15" aria-label="15 Minuten">+15</button>
      <button class="mini play ${run ? 'run' : ''}" data-act="timer" data-id="${h.id}" aria-label="${run ? 'Stopp' : 'Start'}">${run ? '■' : '▶'}</button>
      <button class="check ${done ? 'done' : c ? 'partial' : ''}" data-act="minutes" data-id="${h.id}" aria-label="Minuten eingeben">${done ? CHECK : `${Math.round(c / t * 100)}%`}</button></div>`;
    meta = `<span data-live="${h.id}">${fmtMin(c + timerElapsed(h))}</span> / ${fmtMin(t)}${run ? ' · <span class="rec">● läuft</span>' : ''} · ${streakTxt}`;
  } else if (h.type === 'sleep') {
    const e = S.sleep[day] && S.sleep[day][h.id];
    ctl = `<div class="counter"><button class="mini clock" data-act="sleep" data-id="${h.id}" aria-label="Zeiten eintragen">🕒</button>
      <button class="check ${done ? 'done' : ''}" data-act="toggle" data-id="${h.id}" aria-label="Abhaken">${CHECK}</button></div>`;
    const ok = sleepOk(h, e);
    meta = (e && e.bed ? `Bett ${e.bed} · Auf ${e.wake} ${ok ? '✓' : '✗'}` : `Ziel: Bett ${h.bed || '22:00'}, auf ${h.wake || '05:00'}`) + ' · ' + streakTxt;
  } else if (h.type === 'count' || t > 1) {
    ctl = `<div class="counter"><button class="mini" data-act="dec" data-id="${h.id}" aria-label="Weniger">−</button>
      <button class="check ${done ? 'done' : c ? 'partial' : ''}" data-act="inc" data-id="${h.id}" aria-label="Mehr">${done ? (c > t ? `${c}` : CHECK) : `${c}/${t}`}</button></div>`;
    meta = `${c} / ${t}${h.unit ? ' ' + esc(h.unit) : ''} · ${streakTxt}`;
  } else {
    ctl = `<button class="check ${done ? 'done' : ''}" data-act="toggle" data-id="${h.id}" aria-label="Abhaken">${CHECK}</button>`;
    meta = streakTxt;
  }
  return `<div class="item ${locked ? 'is-locked' : ''}"><div class="emoji">${esc(h.emoji || '•')}</div><div class="grow"><div class="name">${esc(h.name)}</div><div class="meta">${meta}</div></div>${ctl}</div>`;
}
function socialCard(t) {
  const m = socialMin(t), L = limit(), over = m > L, sun = isSunday(t);
  const pct = Math.min(100, m / L * 100);
  return `<div class="card ${over && !sun ? 'card-red' : ''}"><div class="row between"><h2 style="margin:0">📵 Social Media</h2><span class="small ${over ? 'red' : 'muted'}">${fmtMin(m)} / ${fmtMin(L)}</span></div>
    <div class="bar ${over ? 'bar-red' : m > L * .75 ? 'bar-warn' : ''}"><i style="width:${pct}%"></i></div>
    <div class="muted small" style="margin-top:6px">${over ? (sun ? 'Über dem Limit – heute ist Freier Tag, zählt nicht.' : '⛔ Limit überschritten – heute ist alles gesperrt.') : `Noch ${fmtMin(L - m)} bis zur Sperre.`}</div>
    <div class="btns"><button class="btn" data-act="social" data-n="15">+15</button><button class="btn" data-act="social" data-n="30">+30</button><button class="btn" data-act="socialedit">Eingeben</button></div></div>`;
}
function weekCard(compact) {
  const t = today(), ws = weekStart(t), w = weekScore(ws, t);
  const cells = w.days.map((x, i) => `<div class="wd ${x.future ? 'future' : x.blocked ? 'blocked' : ''} ${x.d === t ? 'today' : ''}" style="${!x.future && !x.blocked && x.max ? heat(x.pts / x.max) : ''}"><span>${DOW[(i + 1) % 7]}</span><b>${x.future || x.none ? '–' : x.blocked ? '⛔' : x.pts}</b></div>`).join('');
  return `<div class="card"><div class="row between"><h2 style="margin:0">Wochenscore ${fmtDM(ws)}–${fmtDM(iso(addDays(parse(ws), 5)))}</h2><span class="muted small">${isSunday(t) ? 'Endergebnis' : 'live'}</span></div>
    <div class="row" style="margin-top:10px">${ring(w.pct / 100, 'sm', 9, `<div class="big">${w.pct}%</div>`)}
    <div class="grow"><div style="font-size:20px;font-weight:650">${w.grade.e} Note ${w.grade.n} <span class="muted" style="font-size:14px;font-weight:500">${w.grade.t}</span></div>
    <div class="muted small">${w.pts} / ${w.max} Punkte${isSunday(t) ? '' : ' bisher'}${w.blocked ? ` · ${w.blocked}× gesperrt` : ''}</div><div class="muted small">Mo–Sa zählen · Sonntag frei</div></div></div>
    ${compact ? '' : `<div class="weekgrid">${cells}</div><p class="muted small" style="margin:10px 0 0">Pro Tag: 1 Punkt je erledigter Gewohnheit + 1 Punkt fürs eingehaltene Social-Media-Limit. Gesperrter Tag = 0 Punkte.</p>`}</div>`;
}
const SUN_IDEAS = ['Ausschlafen', 'Wandern', 'Freunde treffen', 'Familie', 'Natur', 'Kochen', 'Kino', 'Zocken', 'Lesen', 'Sport nach Lust', 'Ausflug', 'Nichts tun'];
function sundayView(t) {
  const plan = S.sunday[t] || { picks: [], text: '' };
  const lastWs = weekStart(iso(addDays(parse(t), -1)));
  const lw = S.weekScores[lastWs] || weekScore(lastWs);
  const hist = Object.keys(S.sunday).filter(d => d !== t).sort().reverse().slice(0, 12);
  return `<div class="card sunday"><div class="sun-icon">☀️</div><h2 class="sun-title">Freier Tag</h2>
    <p class="muted" style="text-align:center;margin:0 0 14px">Sonntag zählt nicht. Keine Pflicht-Gewohnheiten – mach, worauf du Lust hast.</p>
    <label style="margin-top:0">Was willst du heute machen?</label>
    <div class="chips" id="sunPicks">${SUN_IDEAS.map(s => `<button class="chip ${plan.picks.includes(s) ? 'on' : ''}" data-act="sunpick" data-v="${esc(s)}">${esc(s)}</button>`).join('')}</div>
    <textarea id="sunText" rows="3" placeholder="Eigene Pläne, z. B. Frühstück mit Familie, Spaziergang am See …" style="margin-top:10px">${esc(plan.text)}</textarea>
    <div class="btns"><button class="btn primary" data-act="sunsave">Plan speichern</button></div>
    ${S.sunday[t] ? `<p class="small" style="text-align:center;color:var(--ok);margin:10px 0 0">✓ Gespeichert – genieß deinen Tag!</p>` : ''}</div>
    ${lw && lw.max ? `<div class="card"><h2>Deine Woche (Mo–Sa)</h2><div class="row"><div style="font-size:34px;font-weight:700">${lw.pct}%</div><div><div style="font-weight:600">${grade(lw.pct).e} Note ${grade(lw.pct).n} – ${grade(lw.pct).t}</div><div class="muted small">${lw.pts} / ${lw.max} Punkte${lw.blocked ? ` · ${lw.blocked}× gesperrt` : ''}</div></div></div></div>` : ''}
    ${hist.length ? `<div class="card"><h2>Frühere Sonntage</h2>${hist.map(d => `<div class="hist"><b>${fmtShort(d)}</b><div class="muted">${esc([...(S.sunday[d].picks || []), S.sunday[d].text].filter(Boolean).join(' · ') || '–')}</div></div>`).join('')}</div>` : ''}`;
}
function viewToday() {
  const t = today(), mi = monkInfo(), sun = isSunday(t), locked = isBlocked(t);
  let html = '';
  if (locked) html += `<div class="banner-red" data-act="showlock">⛔ Limit überschritten – heute ist alles gesperrt</div>`;
  else html += `<div class="quote">„${quoteOfDay()}“</div>`;
  if (sun) html += sundayView(t);
  if (mi) {
    const rules = mi.m.rules || [];
    const rd = rules.filter(r => ruleDone(r.id, t)).length;
    html += `<div class="card" data-act="gomonk" style="cursor:pointer"><div class="row">
      ${ring(mi.pct, 'sm', 9, `<div class="big">${Math.round(mi.pct * 100)}%</div>`)}
      <div class="grow"><h2 style="margin:0 0 4px">${esc(mi.m.name)}</h2>
      <div style="font-size:22px;font-weight:650">${!mi.started ? `Startet in ${1 - mi.dayNum} ${1 - mi.dayNum === 1 ? 'Tag' : 'Tagen'}` : mi.finished ? 'Geschafft! 🏆' : `Tag ${mi.cur} von ${mi.m.days}`}</div>
      <div class="muted small">${mi.started && !mi.finished ? `Noch ${mi.m.days - mi.cur} ${mi.m.days - mi.cur === 1 ? 'Tag' : 'Tage'}` : ''}${rules.length && mi.started && !mi.finished ? ` · Regeln ${rd}/${rules.length}` : ''}</div></div></div></div>`;
    if (rules.length && mi.started && !mi.finished && !sun) {
      html += `<div class="card"><h2>Monk-Regeln heute</h2>${rules.map(r => `<div class="rule ${locked ? 'is-locked' : ''}"><div class="grow">${esc(r.name)}</div>${locked ? '<span class="locked-tag">🔒 gesperrt</span>' : `<button class="check ${ruleDone(r.id, t) ? 'done' : ''}" data-act="rule" data-id="${r.id}" aria-label="Regel eingehalten">${CHECK}</button>`}</div>`).join('')}</div>`;
    }
  } else if (!sun) {
    html += `<div class="card"><div class="row between"><div><h2 style="margin:0 0 4px">Monk Mode</h2><div class="muted small">Starte eine Challenge für 30, 60 oder 90 Tage.</div></div><button class="btn primary" data-act="newmonk">Starten</button></div></div>`;
  }
  if (!sun) html += socialCard(t);
  const hs = S.habits;
  if (!hs.length) {
    html += `<div class="card empty"><div class="big">🌱</div>Noch keine Gewohnheiten.<div class="btns"><button class="btn primary" data-act="addhabit">Gewohnheit hinzufügen</button></div></div>`;
  } else {
    const done = hs.filter(h => isDone(h, t)).length;
    html += `<div class="card ${locked ? 'locked-card' : ''}"><div class="row between"><h2 style="margin:0">${sun ? 'Gewohnheiten (optional)' : 'Tägliche Gewohnheiten'}</h2><span class="muted small">${locked ? '🔒 gesperrt' : `${done} / ${hs.length} erledigt`}</span></div>
      <div class="bar ${locked ? 'bar-red' : ''}"><i style="width:${locked ? 100 : done / hs.length * 100}%"></i></div>
      <div style="margin-top:6px">${hs.map(h => habitRow(h, t, locked)).join('')}</div></div>`;
  }
  if (sun) html += socialCard(t);
  if (!sun) html += weekCard(true);
  html += `<button class="btn block ghost" data-act="addhabit">+ Gewohnheit hinzufügen</button>`;
  return html;
}
let cdTimer = null;
function viewMonk() {
  const mi = monkInfo();
  let html = '';
  if (!mi) {
    html += `<div class="card empty"><div class="big">🧘</div><div style="font-size:18px;color:var(--text);font-weight:600">Kein aktiver Monk Mode</div><p>Lege einen Zeitraum fest, definiere deine Regeln und bleib fokussiert.</p><div class="btns"><button class="btn primary" data-act="newmonk">Monk Mode starten</button></div></div>`;
  } else {
    const m = mi.m;
    const inner = !mi.started ? `<div class="muted small">Start in</div><div class="big">${1 - mi.dayNum}</div><div class="muted small">${1 - mi.dayNum === 1 ? 'Tag' : 'Tagen'}</div>`
      : mi.finished ? `<div class="big">🏆</div><div class="muted small">${m.days} Tage geschafft</div>`
      : `<div class="muted small">Tag</div><div class="big">${mi.cur}</div><div class="muted small">von ${m.days}</div>`;
    html += `<div class="card"><div class="ringwrap"><h2 style="text-align:center;font-size:15px;color:var(--text);text-transform:none;letter-spacing:0">${esc(m.name)}</h2>
      ${ring(mi.pct, '', 7, inner)}
      <div class="muted small" style="margin-top:10px">${fmtShort(m.start)} – ${fmtShort(iso(addDays(mi.end, -1)))} · ${Math.round(mi.pct * 100)} %</div>
      ${!mi.finished ? `<div class="countdown" id="countdown"></div>` : ''}</div></div>`;
    const rules = m.rules || [];
    const t = today();
    html += `<div class="card"><div class="row between"><h2 style="margin:0">Regeln</h2><button class="btn ghost small" style="padding:6px 10px" data-act="editmonk">Bearbeiten</button></div>`;
    if (!rules.length) html += `<div class="muted small" style="padding-top:8px">Keine Regeln festgelegt (z. B. „Kein Social Media“, „Kein Zucker“).</div>`;
    else {
      html += rules.map(r => {
        // Count days the rule was kept since start
        let kept = 0; const span = Math.max(0, Math.min(mi.cur, m.days));
        for (let i = 0; i < span; i++) if (ruleDone(r.id, iso(addDays(parse(m.start), i)))) kept++;
        return `<div class="rule"><div class="grow">${esc(r.name)}<div class="muted small">${kept} / ${span} Tage eingehalten</div></div>${mi.started && !mi.finished ? `<button class="check ${ruleDone(r.id, t) ? 'done' : ''}" data-act="rule" data-id="${r.id}" aria-label="Heute eingehalten">${CHECK}</button>` : ''}</div>`;
      }).join('');
    }
    html += `</div>`;
    // rule-day calendar of the challenge
    if (rules.length && mi.started) {
      html += `<div class="card"><h2>Verlauf</h2><div class="cal">`;
      for (let i = 0; i < m.days; i++) {
        const d = iso(addDays(parse(m.start), i));
        const n = (S.ruleLog[d] || []).filter(id => rules.some(r => r.id === id)).length;
        const fut = d > t;
        html += `<div class="d ${d === t ? 'today' : ''} ${fut ? 'future' : ''}" style="${!fut && n ? heat(n / rules.length) : ''}" title="${fmtShort(d)}">${i + 1}</div>`;
      }
      html += `</div></div>`;
    }
    html += `<div class="btns"><button class="btn" data-act="restartmonk">Neu starten</button><button class="btn danger" data-act="endmonk">Beenden</button></div>`;
  }
  if (S.monkHistory.length) {
    html += `<div class="card" style="margin-top:14px"><h2>Vergangene Challenges</h2>${S.monkHistory.slice().reverse().map(h => `<div class="hist"><b>${esc(h.name)}</b> <span class="muted">· ${fmtShort(h.start)} · ${h.reached} / ${h.days} Tage ${h.reached >= h.days ? '🏆' : ''}</span></div>`).join('')}</div>`;
  }
  return html;
}
function startCountdown() {
  clearInterval(cdTimer);
  const el = document.getElementById('countdown'); const mi = monkInfo();
  if (!el || !mi) return;
  const tick = () => {
    if (!document.getElementById('countdown')) return clearInterval(cdTimer);
    const ms = Math.max(0, mi.end - new Date());
    const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1e3) % 60;
    el.innerHTML = `<div><b>${d}</b><span>Tage</span></div><div><b>${pad(h)}</b><span>Std</span></div><div><b>${pad(m)}</b><span>Min</span></div><div><b>${pad(s)}</b><span>Sek</span></div>`;
  };
  tick(); cdTimer = setInterval(tick, 1000);
}


function heat(r) {
  if (r == null) return '';
  if (r < 0) return 'background:rgba(210,80,70,.55);color:#fff';
  if (r <= 0) return '';
  const a = [0.22, 0.45, 0.7, 1][Math.min(3, Math.floor(r * 4 - 1e-9))];
  return `background:rgba(201,169,110,${a});color:${a > 0.6 ? '#16130d' : 'var(--text)'}`;
}
function weekStrip(h) {
  const t = today(); let head = '', cells = '';
  for (let i = 6; i >= 0; i--) {
    const d = iso(addDays(parse(t), -i)); const c = count(h, d), tg = target(h);
    const bl = isBlocked(d), sun = isSunday(d);
    head += `<span>${DOW[parse(d).getDay()]}</span>`;
    cells += `<button class="${bl ? 'blk' : c >= tg ? 'on' : c ? 'part' : ''} ${sun ? 'sun' : ''} ${d === t ? 'today' : ''}" ${bl ? 'disabled' : ''} data-act="weektoggle" data-id="${h.id}" data-day="${d}">${bl ? '🔒' : parse(d).getDate()}</button>`;
  }
  return `<div class="weekhead">${head}</div><div class="week">${cells}</div>`;
}
const TYPE_LABEL = { check: 'Abhaken', count: 'Zähler', timer: 'Timer', sleep: 'Schlaf' };
function habitDesc(h) {
  if (h.type === 'sleep') return `Bett bis ${h.bed || '22:00'}, auf um ${h.wake || '05:00'}`;
  if (h.type === 'timer') return `Ziel: ${fmtMin(target(h))} pro Tag`;
  if (h.type === 'count' || target(h) > 1) return `Ziel: ${target(h)}${h.unit ? ' ' + esc(h.unit) : ''} pro Tag`;
  return 'Täglich abhaken';
}
function viewHabits() {
  if (!S.habits.length) return `<div class="card empty"><div class="big">🌱</div>Lege deine erste Gewohnheit an.<div class="btns"><button class="btn primary" data-act="addhabit">Gewohnheit hinzufügen</button></div></div>`;
  return S.habits.map(h => {
    const s = streaks(h);
    return `<div class="card"><div class="row"><div class="emoji">${esc(h.emoji || '•')}</div><div class="grow" style="min-width:0"><div style="font-weight:600">${esc(h.name)}</div>
      <div class="muted small">${habitDesc(h)}</div><div class="muted small">🔥 ${s.cur} · Rekord ${s.best} · ${completion(h, 30)} % (30 T)</div></div>
      <button class="btn ghost small" style="padding:6px 10px" data-act="edithabit" data-id="${h.id}">Bearbeiten</button></div>
      <div style="margin-top:10px">${weekStrip(h)}</div></div>`;
  }).join('') + `<button class="btn block primary" data-act="addhabit">+ Gewohnheit hinzufügen</button><p class="muted small" style="text-align:center">Tippe auf einen Tag, um ihn nachträglich abzuhaken. Sonntage sind frei und unterbrechen keine Serie.</p>`;
}

let statMonth = null, statHabit = 'all';
function viewStats() {
  const t = today();
  if (!statMonth) statMonth = t.slice(0, 7);
  let html = weekCard(false);
  const past = Object.keys(S.weekScores).sort().reverse();
  html += `<div class="card"><h2>Vergangene Wochen</h2>${past.length ? past.map(ws => { const w = S.weekScores[ws], g = grade(w.pct); return `<div class="hist row between"><div><b>${fmtDM(ws)}–${fmtShort(iso(addDays(parse(ws), 5)))}</b><div class="muted small">${w.pts} / ${w.max} Punkte${w.blocked ? ` · ${w.blocked}× gesperrt` : ''}</div></div><div style="text-align:right"><b style="font-size:18px">${w.pct}%</b><div class="small">${g.e} Note ${g.n}</div></div></div>`; }).join('') : '<div class="muted small">Noch keine abgeschlossene Woche. Der Score wird jeden Samstagabend festgeschrieben.</div>'}</div>`;
  if (!S.habits.length) return html;
  const hs = statHabit === 'all' ? S.habits : S.habits.filter(h => h.id === statHabit);
  const avg = n => { const v = hs.map(h => completion(h, n)); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0; };
  const st = hs.map(streaks);
  const best = Math.max(0, ...st.map(s => s.best)), cur = Math.max(0, ...st.map(s => s.cur));
  let total = 0; for (const d in S.log) for (const h of hs) if (doneEff(h, d)) total++;
  const blockedDays = Object.keys(S.social).filter(isBlocked).length;
  html += `<select id="habitSel" style="margin-bottom:14px"><option value="all">Alle Gewohnheiten</option>${S.habits.map(h => `<option value="${h.id}" ${statHabit === h.id ? 'selected' : ''}>${esc(h.emoji || '')} ${esc(h.name)}</option>`).join('')}</select>
  <div class="card"><div class="stats">
    <div class="stat"><b>${avg(7)} %</b><span>Letzte 7 Tage</span></div>
    <div class="stat"><b>${avg(30)} %</b><span>Letzte 30 Tage</span></div>
    <div class="stat"><b>🔥 ${cur}</b><span>Aktuelle Serie</span></div>
    <div class="stat"><b>🏆 ${best}</b><span>Beste Serie</span></div>
    <div class="stat"><b>${total}</b><span>Erledigt insgesamt</span></div>
    <div class="stat"><b>⛔ ${blockedDays}</b><span>Gesperrte Tage</span></div>
  </div></div>`;
  const [y, m] = statMonth.split('-').map(Number);
  const first = new Date(y, m - 1, 1), daysIn = new Date(y, m, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  html += `<div class="card"><div class="row between" style="margin-bottom:10px"><button class="mini" data-act="mprev" aria-label="Voriger Monat">‹</button><b>${MONTHS[m - 1]} ${y}</b><button class="mini" data-act="mnext" aria-label="Nächster Monat">›</button></div><div class="cal">`;
  html += ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => `<div class="dow">${d}</div>`).join('');
  for (let i = 0; i < offset; i++) html += '<div></div>';
  let mDone = 0, mTot = 0;
  for (let d = 1; d <= daysIn; d++) {
    const ds = `${y}-${pad(m)}-${pad(d)}`; const fut = ds > t;
    const r = fut ? null : dayRatio(ds, hs);
    if (r != null) { mTot++; mDone += Math.max(0, r); }
    html += `<div class="d ${ds === t ? 'today' : ''} ${fut ? 'future' : ''} ${isSunday(ds) ? 'sun' : ''}" style="${heat(r)}">${d}</div>`;
  }
  html += `</div><div class="row between" style="margin-top:10px"><span class="muted small">Monat: ${mTot ? Math.round(mDone / mTot * 100) : 0} % erfüllt</span><div class="legend">weniger <i style="background:var(--card2)"></i><i style="${heat(.25)}"></i><i style="${heat(.5)}"></i><i style="${heat(.75)}"></i><i style="${heat(1)}"></i> mehr</div></div>
  <div class="legend" style="justify-content:flex-start;margin-top:6px"><i style="${heat(-1)}"></i> gesperrt &nbsp; <i class="sunlg"></i> Sonntag (frei)</div></div>`;
  if (statHabit === 'all') {
    html += `<div class="card"><h2>Pro Gewohnheit (30 Tage, ohne Sonntage)</h2>${S.habits.map(h => { const p = completion(h, 30); return `<div style="padding:8px 0"><div class="row between small"><span>${esc(h.emoji || '')} ${esc(h.name)}</span><span class="muted">${p} %</span></div><div class="bar"><i style="width:${p}%"></i></div></div>`; }).join('')}</div>`;
  }
  const suns = Object.keys(S.sunday).sort().reverse();
  if (suns.length) html += `<div class="card"><h2>Sonntage</h2>${suns.slice(0, 20).map(d => `<div class="hist"><b>${fmtShort(d)}</b><div class="muted">${esc([...(S.sunday[d].picks || []), S.sunday[d].text].filter(Boolean).join(' · ') || '–')}</div></div>`).join('')}</div>`;
  return html;
}

function viewSettings() {
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  return `${window.accountCard ? window.accountCard() : ''}<div class="card"><h2>Social-Media-Limit</h2><p class="small" style="margin-top:0">Aktuell: <b>${fmtMin(limit())}</b> pro Tag. Gehst du darüber, wird der Tag gesperrt (0 Punkte).</p>
    <div class="row" style="gap:8px"><input type="number" id="limitIn" min="15" max="600" step="15" inputmode="numeric" value="${limit()}"><button class="btn" data-act="savelimit">Speichern</button></div></div>
  <div class="card"><h2>Apps wirklich sperren</h2>
    <p class="small" style="margin-top:0">Diese App kann andere Apps nicht blockieren. Stell zusätzlich ein echtes Limit im System ein:</p>
    <p class="small"><b>iPhone:</b> Einstellungen → <b>Bildschirmzeit</b> → <b>App-Limits</b> → „Limit hinzufügen“ → <b>Soziale Netzwerke</b> auswählen → <b>2 Std.</b> → „Am Ende des Limits blockieren“ aktivieren. Tipp: Unter „Bildschirmzeit-Code verwenden“ einen Code setzen, den dir jemand anderes ausdenkt.</p>
    <p class="small" style="margin-bottom:0"><b>Android:</b> Einstellungen → <b>Digital Wellbeing & Jugendschutz</b> → Dashboard → App auswählen (Instagram, TikTok …) → <b>App-Timer</b> → <b>2 Std.</b> (für jede Social-App). Optional: „Konzentrationsmodus“ für feste Zeiten.</p></div>
  <div class="card"><h2>Datensicherung</h2><p class="muted small" style="margin-top:0">Deine Daten werden nur lokal auf diesem Gerät gespeichert. Exportiere regelmäßig ein Backup.</p>
    <div class="btns"><button class="btn primary" data-act="export">Exportieren (JSON)</button><button class="btn" data-act="import">Importieren</button></div>
    <input type="file" id="importFile" accept="application/json,.json" hidden></div>
  ${!standalone ? `<div class="card"><h2>Zum Homescreen hinzufügen</h2><p class="small" style="margin:0 0 8px"><b>iPhone (Safari):</b> Teilen-Symbol <span class="muted">(Quadrat mit Pfeil)</span> → „Zum Home-Bildschirm“ → „Hinzufügen“.</p><p class="small" style="margin:0"><b>Android (Chrome):</b> Menü ⋮ → „App installieren“ bzw. „Zum Startbildschirm hinzufügen“.</p>${deferredPrompt ? '<div class="btns"><button class="btn primary" data-act="install">Jetzt installieren</button></div>' : ''}</div>` : ''}
  <div class="card"><h2>Gefahrenzone</h2><button class="btn danger block" data-act="reset">Alle Daten löschen</button></div>
  <p class="muted small" style="text-align:center">Monk Mode · v3 · funktioniert offline</p>`;
}

/* ===== Sheets / forms ===== */
const EMOJIS = ['🏋️', '😴', '📖', '🧠', '🧘', '💧', '🏃', '💪', '🥗', '🧊', '✍️', '🙏', '🚶', '📵', '☀️', '🚭', '🎯', '🍎', '🎸', '💻', '🌿', '🦷', '💊', '💰'];
function habitForm(h) {
  const isNew = !h; h = h || { name: '', emoji: '🧘', type: 'check', target: 1, unit: '' };
  let type = h.type || 'check';
  openSheet(`<h3>${isNew ? 'Neue Gewohnheit' : 'Gewohnheit bearbeiten'}</h3>
    <label>Name</label><input type="text" id="hName" maxlength="40" placeholder="z. B. Meditieren" value="${esc(h.name)}">
    <label>Symbol</label><div class="emojis">${EMOJIS.map(e => `<button type="button" class="${e === h.emoji ? 'on' : ''}" data-e="${e}">${e}</button>`).join('')}</div>
    <input type="text" id="hEmoji" maxlength="4" placeholder="oder eigenes Emoji" value="${EMOJIS.includes(h.emoji) ? '' : esc(h.emoji)}" style="margin-top:8px">
    <label>Art</label><div class="segment" id="hType">${Object.entries(TYPE_LABEL).map(([k, v]) => `<button type="button" data-t="${k}">${v}</button>`).join('')}</div>
    <div id="fCount"><div class="row" style="gap:10px"><div style="flex:1"><label id="tLbl">Tagesziel</label><input type="number" id="hTarget" min="1" max="1440" inputmode="numeric" value="${target(h)}"></div>
    <div style="flex:1" id="fUnit"><label>Einheit (optional)</label><input type="text" id="hUnit" maxlength="12" placeholder="z. B. Seiten" value="${esc(h.unit || '')}"></div></div></div>
    <div id="fSleep"><div class="row" style="gap:10px"><div style="flex:1"><label>Im Bett bis</label><input type="time" id="hBed" value="${h.bed || '22:00'}"></div><div style="flex:1"><label>Aufstehen um</label><input type="time" id="hWake" value="${h.wake || '05:00'}"></div></div></div>
    <div class="btns"><button class="btn" data-x="cancel">Abbrechen</button><button class="btn primary" data-x="save">Speichern</button></div>
    ${!isNew ? '<div class="btns"><button class="btn danger block" data-x="del">Löschen</button></div>' : ''}`, el => {
    let emoji = h.emoji;
    const syncType = () => {
      el.querySelectorAll('#hType button').forEach(b => b.classList.toggle('on', b.dataset.t === type));
      el.querySelector('#fCount').style.display = type === 'count' || type === 'timer' ? '' : 'none';
      el.querySelector('#fUnit').style.display = type === 'count' ? '' : 'none';
      el.querySelector('#fSleep').style.display = type === 'sleep' ? '' : 'none';
      el.querySelector('#tLbl').textContent = type === 'timer' ? 'Tagesziel (Minuten)' : 'Tagesziel';
    };
    el.querySelectorAll('#hType button').forEach(b => b.onclick = () => { type = b.dataset.t; if (type === 'timer' && +el.querySelector('#hTarget').value < 5) el.querySelector('#hTarget').value = 60; syncType(); });
    syncType();
    el.querySelectorAll('.emojis button').forEach(b => b.onclick = () => { emoji = b.dataset.e; el.querySelector('#hEmoji').value = ''; el.querySelectorAll('.emojis button').forEach(x => x.classList.toggle('on', x === b)); });
    el.querySelector('[data-x=cancel]').onclick = closeSheet;
    el.querySelector('[data-x=save]').onclick = () => {
      const name = el.querySelector('#hName').value.trim();
      if (!name) { el.querySelector('#hName').focus(); return toast('Bitte einen Namen eingeben'); }
      const custom = el.querySelector('#hEmoji').value.trim();
      const data = { name, emoji: custom || emoji, type,
        target: type === 'count' || type === 'timer' ? Math.max(1, parseInt(el.querySelector('#hTarget').value) || 1) : 1,
        unit: type === 'count' ? el.querySelector('#hUnit').value.trim() : type === 'timer' ? 'Min' : '' };
      if (type === 'sleep') { data.bed = el.querySelector('#hBed').value || '22:00'; data.wake = el.querySelector('#hWake').value || '05:00'; }
      if (isNew) S.habits.push(Object.assign({ id: uid(), created: today() }, data)); else Object.assign(h, data);
      save(); closeSheet(); render(); toast(isNew ? 'Gewohnheit angelegt' : 'Gespeichert');
    };
    const del = el.querySelector('[data-x=del]');
    if (del) del.onclick = () => {
      if (!confirm(`„${h.name}“ wirklich löschen? Der Verlauf geht verloren.`)) return;
      S.habits = S.habits.filter(x => x.id !== h.id);
      S.deleted = S.deleted || {}; S.deleted[h.id] = Date.now();
      for (const d in S.log) { delete S.log[d][h.id]; if (!Object.keys(S.log[d]).length) delete S.log[d]; }
      if (S.timer && S.timer.id === h.id) S.timer = null;
      save(); closeSheet(); render(); toast('Gelöscht');
    };
    if (isNew) setTimeout(() => el.querySelector('#hName').focus(), 250);
  });
}
function sleepForm(h) {
  const t = today(); const e = (S.sleep[t] && S.sleep[t][h.id]) || {};
  openSheet(`<h3>😴 Schlaf eintragen</h3><p class="muted small" style="margin:0">Ziel: im Bett bis ${h.bed || '22:00'}, aufstehen um ${h.wake || '05:00'}. Erfolg wird automatisch abgehakt.</p>
    <div class="row" style="gap:10px"><div style="flex:1"><label>Gestern ins Bett</label><input type="time" id="sBed" value="${e.bed || h.bed || '22:00'}"></div>
    <div style="flex:1"><label>Heute aufgestanden</label><input type="time" id="sWake" value="${e.wake || h.wake || '05:00'}"></div></div>
    <div class="btns"><button class="btn" data-x="cancel">Abbrechen</button><button class="btn primary" data-x="save">Speichern</button></div>`, el => {
    el.querySelector('[data-x=cancel]').onclick = closeSheet;
    el.querySelector('[data-x=save]').onclick = () => {
      const bed = el.querySelector('#sBed').value, wake = el.querySelector('#sWake').value;
      if (!bed || !wake) return toast('Bitte beide Zeiten eintragen');
      setSleep(h, t, bed, wake); closeSheet(); render();
      toast(sleepOk(h, { bed, wake }) ? 'Ziel erreicht ✓' : 'Ziel diesmal verpasst');
    };
  });
}
function minutesForm(h) {
  const t = today();
  openSheet(`<h3>${esc(h.emoji)} ${esc(h.name)}</h3><p class="muted small" style="margin:0">Gesamtminuten heute (Ziel ${fmtMin(target(h))}).</p>
    <label>Minuten heute</label><input type="number" id="mMin" min="0" max="1440" inputmode="numeric" value="${count(h, t)}">
    <div class="chips" style="margin-top:8px">${[15, 30, 45, 60, 90, 120].map(n => `<button class="chip" data-n="${n}">${n}</button>`).join('')}</div>
    <div class="btns"><button class="btn" data-x="cancel">Abbrechen</button><button class="btn primary" data-x="save">Speichern</button></div>`, el => {
    el.querySelectorAll('[data-n]').forEach(b => b.onclick = () => el.querySelector('#mMin').value = b.dataset.n);
    el.querySelector('[data-x=cancel]').onclick = closeSheet;
    el.querySelector('[data-x=save]').onclick = () => { setCount(h, t, parseInt(el.querySelector('#mMin').value) || 0); closeSheet(); render(); };
  });
}
function socialForm() {
  const t = today();
  openSheet(`<h3>📵 Social Media heute</h3><p class="muted small" style="margin:0">Trag deine Gesamtzeit ein (z. B. aus der Bildschirmzeit). Limit: ${fmtMin(limit())}.</p>
    <label>Minuten heute</label><input type="number" id="soMin" min="0" max="1440" inputmode="numeric" value="${socialMin(t)}">
    <div class="btns"><button class="btn" data-x="cancel">Abbrechen</button><button class="btn primary" data-x="save">Speichern</button></div>`, el => {
    el.querySelector('[data-x=cancel]').onclick = closeSheet;
    el.querySelector('[data-x=save]').onclick = () => {
      const was = isBlocked(t); setSocial(t, parseInt(el.querySelector('#soMin').value) || 0);
      if (!isBlocked(t)) delete S.lockAck[t]; else if (!was) delete S.lockAck[t];
      save(); closeSheet(); render();
    };
  });
}
function monkForm(edit) {
  const m = edit ? S.monk : { name: 'Monk Mode', start: today(), days: 30, rules: [] };
  let days = m.days; let rules = (m.rules || []).map(r => ({ ...r }));
  const presets = [30, 60, 90];
  const SUGG = ['Kein Social Media', 'Kein Zucker', 'Kein Alkohol', 'Keine Pornos', 'Früh aufstehen', 'Kalt duschen', 'Kein Fast Food', 'Kein Gaming'];
  openSheet(`<h3>${edit ? 'Monk Mode bearbeiten' : 'Monk Mode starten'}</h3>
    <label>Name</label><input type="text" id="mName" maxlength="40" value="${esc(m.name)}">
    <label>Startdatum</label><input type="date" id="mStart" value="${m.start}">
    <label>Dauer</label><div class="chips" id="mPresets">${presets.map(p => `<button type="button" class="chip" data-p="${p}">${p} Tage</button>`).join('')}<button type="button" class="chip" data-p="custom">Eigene</button></div>
    <input type="number" id="mDays" min="1" max="1000" inputmode="numeric" value="${days}" style="margin-top:8px">
    <label>Regeln / Verzichte (optional)</label><div id="mRules"></div>
    <div class="row" style="gap:8px;margin-top:8px"><input type="text" id="mRuleIn" maxlength="40" placeholder="Neue Regel …"><button class="btn" type="button" id="mRuleAdd">+</button></div>
    <div class="chips" id="mSugg" style="margin-top:8px"></div>
    <div class="btns"><button class="btn" data-x="cancel">Abbrechen</button><button class="btn primary" data-x="save">${edit ? 'Speichern' : 'Los geht’s'}</button></div>`, el => {
    const dIn = el.querySelector('#mDays');
    const syncPresets = () => el.querySelectorAll('#mPresets .chip').forEach(c => c.classList.toggle('on', c.dataset.p === 'custom' ? !presets.includes(+dIn.value) : +c.dataset.p === +dIn.value));
    const showDays = () => dIn.style.display = presets.includes(+dIn.value) && !showDays.custom ? 'none' : '';
    el.querySelectorAll('#mPresets .chip').forEach(c => c.onclick = () => { if (c.dataset.p === 'custom') { showDays.custom = true; showDays(); dIn.focus(); syncPresets(); el.querySelectorAll('#mPresets .chip').forEach(x => x.classList.toggle('on', x === c)); return; } showDays.custom = false; dIn.value = c.dataset.p; syncPresets(); showDays(); });
    dIn.oninput = syncPresets; syncPresets(); showDays();
    const drawRules = () => {
      el.querySelector('#mRules').innerHTML = rules.map((r, i) => `<div class="rule"><div class="grow">${esc(r.name)}</div><button class="mini" data-ri="${i}" aria-label="Entfernen">×</button></div>`).join('');
      el.querySelectorAll('[data-ri]').forEach(b => b.onclick = () => { rules.splice(+b.dataset.ri, 1); drawRules(); });
      el.querySelector('#mSugg').innerHTML = SUGG.filter(s => !rules.some(r => r.name === s)).map(s => `<button type="button" class="chip small" data-s="${esc(s)}">+ ${esc(s)}</button>`).join('');
      el.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { rules.push({ id: uid(), name: b.dataset.s }); drawRules(); });
    };
    drawRules();
    const addRule = () => { const i = el.querySelector('#mRuleIn'); const v = i.value.trim(); if (!v) return; rules.push({ id: uid(), name: v }); i.value = ''; drawRules(); };
    el.querySelector('#mRuleAdd').onclick = addRule;
    el.querySelector('#mRuleIn').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); addRule(); } };
    el.querySelector('[data-x=cancel]').onclick = closeSheet;
    el.querySelector('[data-x=save]').onclick = () => {
      const d = parseInt(dIn.value); if (!d || d < 1) return toast('Bitte eine gültige Dauer angeben');
      const start = el.querySelector('#mStart').value || today();
      const data = { name: el.querySelector('#mName').value.trim() || 'Monk Mode', start, days: d, rules };
      if (edit) Object.assign(S.monk, data); else S.monk = Object.assign({ id: uid() }, data);
      save(); closeSheet(); go('monk'); toast(edit ? 'Gespeichert' : 'Monk Mode gestartet 🧘');
    };
  });
}
function archiveMonk() {
  const mi = monkInfo(); if (!mi) return;
  S.monkHistory.push({ name: mi.m.name, start: mi.m.start, days: mi.m.days, reached: mi.finished ? mi.m.days : Math.max(0, mi.cur), endedAt: today() });
}

/* ===== Event binding ===== */
function bind(v) {
  v.querySelectorAll('[data-act]').forEach(el => el.addEventListener('click', e => {
    e.stopPropagation();
    const a = el.dataset.act, id = el.dataset.id, h = S.habits.find(x => x.id === id), t = today();
    const lockedNow = isBlocked(t);
    if (lockedNow && ['toggle', 'inc', 'dec', 'rule', 'timer', 'addmin', 'minutes', 'sleep'].includes(a)) { toast('🔒 Heute gesperrt – Social-Media-Limit überschritten'); return; }
    switch (a) {
      case 'toggle': setCount(h, t, isDone(h, t) ? 0 : target(h)); vibrate(); render(); break;
      case 'inc': setCount(h, t, count(h, t) + 1); vibrate(); render(); break;
      case 'dec': setCount(h, t, count(h, t) - 1); render(); break;
      case 'weektoggle': { const d = el.dataset.day; if (isBlocked(d)) return toast('🔒 Dieser Tag ist gesperrt'); setCount(h, d, isDone(h, d) ? 0 : target(h)); vibrate(); render(); break; }
      case 'rule': toggleRule(id, t); vibrate(); render(); break;
      case 'timer':
        if (S.timer && S.timer.id === id) { const add = Math.round((Date.now() - S.timer.startedAt) / 60000); const d = S.timer.day || t; S.timer = null; setCount(h, d, count(h, d) + add); toast(`+${add} Min gespeichert`); }
        else { if (S.timer) { const oh = S.habits.find(x => x.id === S.timer.id); if (oh) setCount(oh, S.timer.day || t, count(oh, S.timer.day || t) + Math.round((Date.now() - S.timer.startedAt) / 60000)); } S.timer = { id, startedAt: Date.now(), day: t }; toast('Timer läuft ▶'); }
        save(); vibrate(); render(); break;
      case 'addmin': setCount(h, t, count(h, t) + Number(el.dataset.n)); vibrate(); render(); break;
      case 'minutes': minutesForm(h); break;
      case 'sleep': sleepForm(h); break;
      case 'social': { const was = isBlocked(t); setSocial(t, socialMin(t) + Number(el.dataset.n)); if (!was && isBlocked(t)) { delete S.lockAck[t]; save(); if (navigator.vibrate) navigator.vibrate([80, 60, 80]); } render(); break; }
      case 'socialedit': socialForm(); break;
      case 'showlock': delete S.lockAck[t]; save(); render(); break;
      case 'sunpick': el.classList.toggle('on'); break;
      case 'sunsave': {
        const picks = [...v.querySelectorAll('#sunPicks .chip.on')].map(c => c.dataset.v);
        const text = v.querySelector('#sunText').value.trim();
        if (!picks.length && !text) { delete S.sunday[t]; save(); render(); return toast('Plan geleert'); }
        S.sunday[t] = { picks, text }; save(); render(); toast('Sonntagsplan gespeichert ☀️'); break;
      }
      case 'savelimit': { const n = parseInt(v.querySelector('#limitIn').value); if (!n || n < 1) return toast('Ungültiger Wert'); S.settings.socialLimit = n; save(); render(); toast('Limit gespeichert'); break; }
      case 'addhabit': habitForm(); break;
      case 'edithabit': habitForm(h); break;
      case 'newmonk': monkForm(false); break;
      case 'editmonk': monkForm(true); break;
      case 'gomonk': go('monk'); break;
      case 'endmonk': if (confirm('Monk Mode wirklich beenden?')) { archiveMonk(); S.monk = null; save(); render(); toast('Monk Mode beendet'); } break;
      case 'restartmonk': if (confirm('Challenge ab heute neu starten? Regeln bleiben erhalten.')) { archiveMonk(); S.monk.start = today(); save(); render(); toast('Neu gestartet – Tag 1'); } break;
      case 'mprev': case 'mnext': { const [y, m] = statMonth.split('-').map(Number); const d = new Date(y, m - 1 + (a === 'mnext' ? 1 : -1), 1); statMonth = iso(d).slice(0, 7); render(); break; }
      case 'export': exportData(); break;
      case 'import': v.querySelector('#importFile').click(); break;
      case 'install': deferredPrompt && deferredPrompt.prompt(); break;
      case 'reset': if (confirm(window.sbUser ? 'Wirklich ALLE Daten löschen – auf diesem Gerät UND in der Cloud? Das kann nicht rückgängig gemacht werden.' : 'Wirklich ALLE Daten löschen? Das kann nicht rückgängig gemacht werden.')) { S = defaultState(); migrate(); save(); render(); toast('Alle Daten gelöscht'); } break;
    }
  }));
  const sel = v.querySelector('#habitSel'); if (sel) sel.onchange = () => { statHabit = sel.value; render(); };
  const f = v.querySelector('#importFile'); if (f) f.onchange = () => importData(f.files[0]);
  if (tab === 'monk') startCountdown(); else clearInterval(cdTimer);
}
// live timer display
setInterval(() => {
  if (!S.timer || tab !== 'today') return;
  const h = S.habits.find(x => x.id === S.timer.id); const el = document.querySelector(`[data-live="${S.timer.id}"]`);
  if (h && el) el.textContent = fmtMin(count(h, S.timer.day || today()) + timerElapsed(h));
}, 5000);

/* ===== Export / Import ===== */
async function exportData() {
  const json = JSON.stringify(Object.assign({ exportedAt: new Date().toISOString(), app: 'monk-mode' }, S), null, 2);
  const name = `monk-mode-backup-${today()}.json`;
  const file = new File([json], name, { type: 'application/json' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] }) && /iPhone|iPad|Android/i.test(navigator.userAgent)) { await navigator.share({ files: [file], title: 'Monk Mode Backup' }); return; }
  } catch (e) { if (e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast('Backup exportiert');
}
function importData(file) {
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result);
      if (!d || !Array.isArray(d.habits) || typeof d.log !== 'object') throw new Error('format');
      if (!confirm('Aktuelle Daten durch das Backup ersetzen?')) return;
      delete d.exportedAt; delete d.app;
      S = Object.assign(defaultState(), d);
      if (!('defaultsAdded' in d)) S.defaultsAdded = false;
      migrate(); save(); render(); toast('Backup importiert ✓');
    } catch (e) { toast('Ungültige Backup-Datei'); }
  };
  r.readAsText(file);
}

/* ===== PWA ===== */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; if (tab === 'settings') render(); });
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const hadCtl = !!navigator.serviceWorker.controller; let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadCtl && !reloaded) { reloaded = true; location.reload(); } });
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').then(r => r.update && r.update()).catch(err => console.warn('SW', err)));
}
let lastDay = today();
document.addEventListener('visibilitychange', () => { if (!document.hidden && today() !== lastDay) { lastDay = today(); render(); } });
setInterval(() => { if (today() !== lastDay) { lastDay = today(); render(); } }, 60000);

render();
