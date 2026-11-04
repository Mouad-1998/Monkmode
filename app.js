'use strict';
/* ===== Monk Mode v4 ===== */
loadState();

/* ===== Helpers ===== */
const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
const DOW = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const fmtLong = s => parse(s).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtShort = s => parse(s).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtDM = s => parse(s).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = s => document.querySelector(s);
const isSunday = d => parse(d).getDay() === 0;
const weekStart = d => iso(addDays(parse(d), -((parse(d).getDay() + 6) % 7)));
const toMin = t => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const fmtMin = m => { m = Math.round(m); return m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ' ' + (m % 60) + ' Min' : ''}` : `${m} Min`; };
const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;
const CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

function save() { S.updatedAt = Date.now(); writeLocal(); if (window.onLocalSave) window.onLocalSave(); }
function stamp(k) { S.ts[k] = Date.now(); }

/* ===== Social media / Sperre ===== */
const limit = () => Number(S.settings.socialLimit) || 120;
const socialMin = d => Number(S.social[d]) || 0;
const isBlocked = d => !isSunday(d) && socialMin(d) > limit();
function setSocial(d, n) { n = Math.max(0, Math.min(1440, Math.round(n))); if (n) S.social[d] = n; else delete S.social[d]; stamp('s|' + d); save(); }

/* ===== Ziele ===== */
const goalById = id => S.goals.find(g => g.id === id);
const target = g => Math.max(1, Number(g.target) || 1);
const val = (g, d) => (S.log[d] && S.log[d][g.id]) || 0;
const isDone = (g, d) => val(g, d) >= target(g);
const doneEff = (g, d) => !isBlocked(d) && isDone(g, d);
const activeOn = (g, d) => (g.created || today()) <= d;
const unitOf = g => g.type === 'minutes' ? 'Min' : g.type === 'pages' ? (target(g) === 1 ? 'Seite' : 'Seiten') : (g.unit || '');
function setVal(g, d, n) {
  n = Math.max(0, Math.min(Math.round(n), 1440 * 2));
  S.log[d] = S.log[d] || {};
  if (n === 0) delete S.log[d][g.id]; else S.log[d][g.id] = n;
  if (!Object.keys(S.log[d]).length) delete S.log[d];
  if (d < g.created) g.created = d;
  stamp(`l|${d}|${g.id}`); save();
}
function sleepOk(g, e) {
  if (!e || !e.bed || !e.wake) return null;
  let b = toMin(e.bed); const w = toMin(e.wake);
  if (b < 12 * 60) b += 24 * 60;
  return b <= toMin(g.bed || '22:00') && w <= toMin(g.wake || '05:00') && w >= 120;
}
function setSleep(g, d, bed, wake) {
  S.sleep[d] = S.sleep[d] || {}; S.sleep[d][g.id] = { bed, wake }; stamp(`z|${d}|${g.id}`);
  setVal(g, d, sleepOk(g, S.sleep[d][g.id]) ? 1 : 0);
}
function goalStreak(g) {
  const t = today(); let cur = 0, d = parse(t);
  if (!doneEff(g, t) || isSunday(t)) d = addDays(d, -1);
  for (let i = 0; i < 3660; i++) { const k = iso(d); if (k < g.created) break; if (isSunday(k)) { d = addDays(d, -1); continue; } if (!doneEff(g, k)) break; cur++; d = addDays(d, -1); }
  let best = 0, run = 0, x = parse(g.created); const end = parse(t);
  while (x <= end) { const k = iso(x); if (!isSunday(k)) { if (doneEff(g, k)) { run++; best = Math.max(best, run); } else if (k !== t) run = 0; } x = addDays(x, 1); }
  return { cur, best: Math.max(best, cur) };
}
const allDone = d => { const gs = S.goals.filter(g => activeOn(g, d)); return gs.length > 0 && !isBlocked(d) && gs.every(g => isDone(g, d)); };
function dayStreak() {
  const t = today(); let cur = 0, d = parse(t);
  if (!allDone(t) || isSunday(t)) d = addDays(d, -1);
  for (let i = 0; i < 3660; i++) { const k = iso(d); if (k < S.firstDay) break; if (isSunday(k)) { d = addDays(d, -1); continue; } if (!allDone(k)) break; cur++; d = addDays(d, -1); }
  return cur;
}
function completion(g, n) {
  const t = today(); let tot = 0, done = 0;
  for (let i = 0; i < n; i++) { const d = iso(addDays(parse(t), -i)); if (d < g.created) break; if (isSunday(d)) continue; if (d === t && !doneEff(g, d)) continue; tot++; if (doneEff(g, d)) done++; }
  return tot ? Math.round(done / tot * 100) : 0;
}
function dayRatio(d, gs) {
  if (isSunday(d)) return null; gs = gs.filter(g => activeOn(g, d)); if (!gs.length) return null;
  if (isBlocked(d)) return -1; return gs.filter(g => doneEff(g, d)).length / gs.length;
}

/* ===== Wochenscore (Mo–Sa) ===== */
function dayScore(d) {
  if (isSunday(d)) return null;
  const gs = S.goals.filter(g => activeOn(g, d)); if (!gs.length) return null;
  const max = gs.length + 1;
  if (isBlocked(d)) return { pts: 0, max, blocked: true };
  return { pts: gs.filter(g => isDone(g, d)).length + 1, max, blocked: false };
}
function grade(p) {
  if (p >= 92) return { n: '1', t: 'sehr gut', e: '🏆' }; if (p >= 81) return { n: '2', t: 'gut', e: '💪' };
  if (p >= 67) return { n: '3', t: 'befriedigend', e: '👍' }; if (p >= 50) return { n: '4', t: 'ausreichend', e: '😐' };
  if (p >= 30) return { n: '5', t: 'mangelhaft', e: '⚠️' }; return { n: '6', t: 'ungenügend', e: '⛔' };
}
function weekScore(ws, upTo) {
  let pts = 0, max = 0, blocked = 0; const days = [];
  for (let i = 0; i < 6; i++) {
    const d = iso(addDays(parse(ws), i));
    if (upTo && d > upTo) { days.push({ d, future: true }); continue; }
    const s = dayScore(d); days.push(Object.assign({ d }, s || { none: true }));
    if (s) { pts += s.pts; max += s.max; if (s.blocked) blocked++; }
  }
  const pct = max ? Math.round(pts / max * 100) : 0;
  return { ws, pts, max, pct, blocked, days, grade: grade(pct) };
}
function finalizeWeeks() {
  const t = today(); let ws = weekStart(S.firstDay || t), changed = false;
  for (let i = 0; i < 600 && iso(addDays(parse(ws), 5)) < t; i++) {
    if (!S.weekScores[ws]) { const w = weekScore(ws); if (w.max) { S.weekScores[ws] = { pts: w.pts, max: w.max, pct: w.pct, blocked: w.blocked }; changed = true; } }
    ws = iso(addDays(parse(ws), 7));
  }
  if (changed) save();
}

/* ===== Challenge-Zeitraum (optional) ===== */
function challengeInfo() {
  const c = S.challenge; if (!c) return null;
  const n = diffDays(c.start, today()) + 1, end = addDays(parse(c.start), c.days);
  return { c, n, started: n >= 1, finished: n > c.days, cur: Math.min(Math.max(n, 0), c.days), end, pct: n >= 1 ? Math.min(1, n / c.days) : 0 };
}

/* ===== Tageszeit ===== */
function bedWake() { const sg = S.goals.find(g => g.type === 'sleep'); return { bed: (sg && sg.bed) || '22:00', wake: (sg && sg.wake) || '05:00' }; }
function dayClock() {
  const now = new Date(), { bed, wake } = bedWake();
  const nowS = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const bedS = toMin(bed) * 60, wakeS = toMin(wake) * 60;
  return { bed, wake, toBed: bedS - nowS, toMid: 86400 - nowS, phase: nowS < wakeS ? 'night' : nowS >= bedS ? 'late' : 'day', dayPct: Math.min(1, Math.max(0, (nowS - wakeS) / (bedS - wakeS))) };
}
const hms = s => { s = Math.max(0, Math.floor(s)); return `${Math.floor(s / 3600)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`; };
const hm = s => { s = Math.max(0, Math.floor(s / 60)); const h = Math.floor(s / 60), m = s % 60; return h ? `${h} h ${pad(m)} min` : `${m} min`; };

/* ===== Motivation ===== */
const QUOTES = [
  ['Disziplin ist die Brücke zwischen Zielen und Erfolg.', 'Jim Rohn'], ['Wir sind, was wir wiederholt tun.', 'Aristoteles'],
  ['Der Feed nimmt dir Zeit. Ein Buch gibt sie dir zurück.', ''], ['Kleine Schritte, jeden Tag.', ''],
  ['Wer heute nichts tut, lebt morgen wie gestern.', ''], ['Fokus ist die Kunst, Nein zu sagen.', 'Steve Jobs'],
  ['Es ist nicht wenig Zeit, die wir haben, sondern viel Zeit, die wir nicht nutzen.', 'Seneca'],
  ['Erst formen wir unsere Gewohnheiten, dann formen sie uns.', ''], ['Werde jeden Tag 1 % besser.', 'James Clear'],
  ['Langeweile ist der Anfang von Kreativität – nicht von Scrollen.', ''], ['Du musst nicht motiviert sein. Fang einfach an.', ''],
  ['Ruhe ist Stärke.', ''], ['Der beste Zeitpunkt war gestern. Der zweitbeste ist jetzt.', ''],
  ['Schwierige Dinge jetzt, leichtes Leben später.', ''], ['Die Zeit vergeht sowieso. Nutze sie.', ''],
  ['Wer sich selbst besiegt, ist der stärkste Krieger.', 'Konfuzius'], ['Ein Tag ohne Ausreden ist ein gewonnener Tag.', ''],
  ['Handy weg. Leben an.', ''], ['Was du heute säst, erntest du in 90 Tagen.', ''], ['Stolz kommt nach der Arbeit, nicht davor.', '']
];
let quoteIdx = Math.floor(Math.random() * QUOTES.length);
const quoteHtml = () => { const [q, a] = QUOTES[quoteIdx % QUOTES.length]; return `„${esc(q)}“${a ? `<span>– ${esc(a)}</span>` : ''}`; };

/* Statt Scrollen: kurze, konkrete Alternativen */
const ALTS = [
  { k: 'read5', e: '📖', t: '5 Seiten lesen', d: 'Buch statt Feed', goal: 'pages', add: 5 },
  { k: 'learn25', e: '🧠', t: '25 Min Fokus-Lernen', d: 'Timer startet sofort', goal: 'minutes', focus: 25 },
  { k: 'english', e: '🇬🇧', t: 'English Daily – 15 Min', d: 'Öffnet deine Englisch-App, Timer läuft mit', goal: 'minutes', focus: 15, href: './english/' },
  { k: 'pushups', e: '💪', t: '10 Liegestütze', d: 'Jetzt sofort, dauert 1 Minute', sport: true },
  { k: 'walk', e: '🚶', t: '10 Min spazieren', d: 'Ohne Handy in der Hand', focus: 10 },
  { k: 'breathe', e: '🧘', t: '5 Min atmen', d: '4 Sek. ein, 6 Sek. aus', focus: 5 },
  { k: 'water', e: '💧', t: 'Ein Glas Wasser trinken', d: 'Oft ist es nur Langeweile' },
  { k: 'tidy', e: '🧹', t: '5 Min aufräumen', d: 'Schreibtisch oder Zimmer', focus: 5 },
  { k: 'journal', e: '✍️', t: '3 Sätze Tagebuch', d: 'Wie läuft dein Tag wirklich?' },
  { k: 'plan', e: '🗓️', t: 'Morgen planen', d: '3 wichtigste Aufgaben notieren' },
  { k: 'stretch', e: '🤸', t: '5 Min dehnen', d: 'Nacken, Rücken, Beine', focus: 5 },
  { k: 'cold', e: '🧊', t: 'Kalt duschen', d: '30 Sekunden reichen' },
  { k: 'phoneaway', e: '📵', t: 'Handy 30 Min weglegen', d: 'In einen anderen Raum', focus: 30 },
  { k: 'squats', e: '🦵', t: '20 Kniebeugen', d: 'Kreislauf an, Kopf frei', sport: true },
  { k: 'bed', e: '😴', t: 'Handy weg, ab ins Bett', d: 'Morgen früh klingelt der Wecker', night: true }
];
let altSeed = 0;
const altsToday = () => S.alts[today()] || [];
function suggestions() {
  const t = today(), clock = dayClock();
  const open = S.goals.filter(g => !isDone(g, t));
  const hasOpen = type => open.some(g => g.type === type);
  const sportOpen = open.some(g => /sport|training|gym|workout|laufen|joggen/i.test(g.name));
  const doneKeys = new Set(altsToday().map(x => x.a));
  return ALTS.map((a, i) => {
    let s = ((i * 7 + altSeed * 5 + parse(t).getDate()) % ALTS.length) / 100;
    if (a.night) { if (clock.phase === 'day' && clock.toBed > 3600) return null; s += 10; }
    else if (clock.phase !== 'day') s -= 2;
    const tied = !!((a.goal && hasOpen(a.goal)) || (a.sport && sportOpen));
    if (a.goal && hasOpen(a.goal)) s += a.k === 'english' ? 2.5 : 3;
    if (a.sport && sportOpen) s += 2.5;
    if (altSeed) s += ((i * 13 + altSeed * 11) % ALTS.length) / 10;
    if (doneKeys.has(a.k) && !a.add && !a.focus) s -= 1.5;
    return { a, s, tied };
  }).filter(Boolean).sort((x, y) => y.s - x.s).slice(0, 5);
}

/* ===== Fokus-Timer (Ziel-Minuten oder Statt-Scrollen-Aktion) ===== */
const focusElapsed = () => S.focus ? (Date.now() - S.focus.startedAt) / 1000 : 0;
function startFocus(f) {
  if (S.focus) stopFocus(true, true);
  S.focus = Object.assign({ startedAt: Date.now(), day: today(), plan: 0 }, f); save();
}
function stopFocus(commit, silent) {
  const f = S.focus; if (!f) return;
  const mins = Math.round(focusElapsed() / 60);
  S.focus = null;
  if (commit) {
    const g = f.goalId && goalById(f.goalId);
    if (g && g.type === 'minutes' && mins > 0) setVal(g, f.day, val(g, f.day) + mins);
    if (f.altId) logAlt(f.altId, f.day);
    if (!silent) toast(mins > 0 ? `+${fmtMin(mins)} gespeichert 💪` : 'Gespeichert ✓');
  }
  save();
}
// Timer vergessen (z. B. über Nacht)? -> automatisch beenden, höchstens die geplante Zeit gutschreiben
function checkStaleFocus() {
  const f = S.focus; if (!f) return;
  const mins = focusElapsed() / 60, cap = Math.max(f.plan || 60, 60) * 2;
  if (f.day === today() && mins <= Math.max(180, cap)) return;
  const credit = Math.min(Math.round(mins), f.plan || 60);
  f.startedAt = Date.now() - credit * 60000;
  stopFocus(true, true);
  setTimeout(() => toast(`⏱ Vergessener Timer beendet – ${fmtMin(credit)} gutgeschrieben`), 400);
}
function logAlt(k, d) { d = d || today(); S.alts[d] = S.alts[d] || []; S.alts[d].push({ k: uid(), a: k, t: Date.now() }); save(); }
function doAlt(k) {
  const a = ALTS.find(x => x.k === k); if (!a) return;
  const t = today();
  if (a.add) {
    const g = !isBlocked(t) && (S.goals.find(x => x.type === a.goal && !isDone(x, t)) || S.goals.find(x => x.type === a.goal));
    if (g) setVal(g, t, val(g, t) + a.add);
    logAlt(k); toast(g ? `+${a.add} ${g.type === 'pages' ? 'Seiten' : unitOf(g)} bei „${g.name}“ 📖` : 'Stark – Scrollen ersetzt ✓');
  } else if (a.focus) {
    const g = a.goal && !isBlocked(t) && (S.goals.find(x => x.type === a.goal && !isDone(x, t)) || S.goals.find(x => x.type === a.goal));
    startFocus({ kind: 'alt', altId: k, goalId: g ? g.id : null, plan: a.focus });
    // In der Home-Bildschirm-App nicht wegnavigieren (kein Zurück-Button, getrennter Speicher) -> Hinweis im Timer
    if (a.href && !storageEnv().standalone) { flush(); location.href = a.href; return; }
    toast(`${a.e} Timer läuft – ${a.focus} Min`);
  } else { logAlt(k); toast('Stark – Scrollen ersetzt ✓'); }
  vibrate(); render();
}

/* ===== UI-Grundlagen ===== */
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2200); }
function vibrate(p) { if (navigator.vibrate) navigator.vibrate(p || 12); }
function ring(pct, cls, stroke, inner) {
  const r = (100 - stroke) / 2, c = 2 * Math.PI * r;
  return `<div class="ring ${cls}"><svg viewBox="0 0 100 100"><circle class="bg" cx="50" cy="50" r="${r}" fill="none" stroke-width="${stroke}"/><circle class="fg" cx="50" cy="50" r="${r}" fill="none" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.min(1, Math.max(0, pct)))}"/></svg><div class="center">${inner}</div></div>`;
}
function openSheet(html, onMount) { $('#sheetBody').innerHTML = `<div class="grab"></div>` + html; $('#sheet').classList.remove('hidden'); if (onMount) onMount($('#sheetBody')); }
function closeSheet() { $('#sheet').classList.add('hidden'); $('#sheetBody').innerHTML = ''; }
$('#sheet .sheet-backdrop').addEventListener('click', closeSheet);
const UIK = 'monkmode.ui';
const ui = (() => { try { return JSON.parse(localStorage.getItem(UIK)) || {}; } catch (e) { return {}; } })();
const saveUi = () => { try { localStorage.setItem(UIK, JSON.stringify(ui)); } catch (e) {} };

/* ===== Router ===== */
let tab = 'today', sortMode = false;
const TITLES = { today: 'Heute', monk: 'Monk Mode', stats: 'Statistik', settings: 'Mehr' };
document.querySelectorAll('.tabbar button').forEach(b => b.addEventListener('click', () => go(b.dataset.tab)));
function go(t) { tab = t; sortMode = false; document.querySelectorAll('.tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === t)); window.scrollTo(0, 0); render(); }
function render() {
  finalizeWeeks(); checkStaleFocus();
  $('#title').textContent = TITLES[tab];
  $('#subtitle').textContent = tab === 'today' ? fmtLong(today()) : tab === 'monk' ? 'Deine Ziele = deine Gewohnheiten' : '';
  const y = window.scrollY, v = $('#view');
  v.innerHTML = ({ today: viewToday, monk: viewMonk, stats: viewStats, settings: viewSettings })[tab]();
  window.scrollTo(0, y);
  bind(v); renderLock(); renderNotice(); tick();
}

/* ===== Hinweise (Speicher-Umgebung, Update) ===== */
let updateReady = false;
function renderNotice() {
  const el = $('#notice'), env = storageEnv(); let html = '';
  if (updateReady) html += `<div class="notice info"><span>✨ Neue Version ist da.</span><button class="btn small primary" data-n="reload">Neu laden</button></div>`;
  if (Persist.restoredFrom === 'idb' && !ui.restoredSeen) html += `<div class="notice ok"><span>🛟 Deine Daten wurden aus der Sicherung wiederhergestellt.</span><button class="x" data-n="restoredok">×</button></div>`;
  if (!Persist.lsOk) html += `<div class="notice bad"><span>⚠️ Speichern auf diesem Gerät fehlgeschlagen (privater Modus oder Speicher voll?). Melde dich unter „Mehr“ an, damit nichts verloren geht.</span></div>`;
  else if (env.inApp) html += `<div class="notice bad"><span>⚠️ Du bist in einem In-App-Browser. Hier werden Einträge oft gelöscht, sobald du ihn schließt. Öffne <b>mouad-1998.github.io/Monkmode</b> in Safari/Chrome und füg die App zum Home-Bildschirm hinzu.</span></div>`;
  else if (env.ios && env.browserTab && ui.envHide !== today()) html += `<div class="notice warn"><span>📲 Du nutzt Monk Mode im Safari-Tab. Safari und die Home-Bildschirm-App haben <b>getrennte Speicher</b>. Nutze immer die App vom Home-Bildschirm und melde dich an.</span><button class="x" data-n="envhide">×</button></div>`;
  el.innerHTML = html;
  el.querySelectorAll('[data-n]').forEach(b => b.onclick = () => {
    const n = b.dataset.n;
    if (n === 'reload') { flush(); location.reload(); }
    if (n === 'restoredok') { ui.restoredSeen = true; saveUi(); }
    if (n === 'envhide') { ui.envHide = today(); saveUi(); }
    renderNotice();
  });
}

/* ===== Sperre ===== */
function renderLock() {
  const t = today(); let o = document.getElementById('lock');
  const show = isBlocked(t) && !S.lockAck[t] && tab === 'today';
  if (!show) { if (o) o.remove(); return; }
  if (!o) { o = document.createElement('div'); o.id = 'lock'; document.body.appendChild(o); }
  o.innerHTML = `<div class="lock-inner"><div class="lock-icon">⛔</div><h2>Limit überschritten –<br>alles gesperrt</h2>
    <p>Du warst heute <b>${socialMin(t)} Min</b> auf Social Media (Limit ${limit()} Min).</p>
    <p class="small">Der Tag zählt als <b>nicht bestanden</b> – 0 Punkte im Wochenscore. Morgen ist ein neuer Tag.</p>
    <div class="btns col"><button class="btn lockbtn" id="lockOk">Verstanden</button><button class="btn ghost" id="lockFix">Eingabe korrigieren</button></div></div>`;
  o.querySelector('#lockOk').onclick = () => { S.lockAck[t] = true; save(); render(); };
  o.querySelector('#lockFix').onclick = () => socialForm();
}

/* ===== Heute ===== */
function goalMeta(g, d) {
  const c = val(g, d), t = target(g);
  if (g.type === 'check') return isDone(g, d) ? 'Erledigt' : 'Offen';
  if (g.type === 'sleep') { const e = S.sleep[d] && S.sleep[d][g.id]; return e && e.bed ? `Bett ${e.bed} · auf ${e.wake} ${sleepOk(g, e) ? '✓' : '✗'}` : `Ziel: Bett ${g.bed || '22:00'}, auf ${g.wake || '05:00'}`; }
  if (g.type === 'minutes') { const live = S.focus && S.focus.goalId === g.id && S.focus.day === d ? focusElapsed() / 60 : 0; return `<span data-livegoal="${g.id}">${fmtMin(c + live)}</span> / ${fmtMin(t)}`; }
  return `${c} / ${t} ${esc(unitOf(g))}`;
}
function goalRow(g, d, locked) {
  const c = val(g, d), t = target(g), done = c >= t, st = goalStreak(g);
  const streak = st.cur ? ` · 🔥 ${st.cur}` : '';
  let ctl;
  if (locked) ctl = `<span class="locked-tag">🔒</span>`;
  else if (g.type === 'check') ctl = `<button class="check ${done ? 'done' : ''}" data-act="toggle" data-id="${g.id}" aria-label="Abhaken">${CHECK}</button>`;
  else if (g.type === 'sleep') ctl = `<div class="counter"><button class="mini" data-act="sleep" data-id="${g.id}" aria-label="Zeiten eintragen">🕒</button><button class="check ${done ? 'done' : ''}" data-act="toggle" data-id="${g.id}" aria-label="Abhaken">${CHECK}</button></div>`;
  else if (g.type === 'minutes') {
    const run = S.focus && S.focus.goalId === g.id;
    ctl = `<div class="counter"><button class="mini ${run ? 'run' : ''}" data-act="${run ? 'focusstop' : 'gtimer'}" data-id="${g.id}" aria-label="${run ? 'Stopp' : 'Timer starten'}">${run ? '■' : '▶'}</button><button class="mini wide" data-act="add" data-id="${g.id}" data-n="15">+15</button><button class="check ${done ? 'done' : c ? 'partial' : ''}" data-act="amount" data-id="${g.id}" aria-label="Minuten eingeben">${done ? CHECK : Math.round(c / t * 100) + '%'}</button></div>`;
  } else {
    ctl = `<div class="counter"><button class="mini" data-act="add" data-id="${g.id}" data-n="-1" aria-label="Weniger">−</button><button class="mini" data-act="add" data-id="${g.id}" data-n="1" aria-label="Mehr">+</button><button class="check ${done ? 'done' : c ? 'partial' : ''}" data-act="amount" data-id="${g.id}" aria-label="Menge eingeben">${done ? (c > t ? c : CHECK) : `${c}/${t}`}</button></div>`;
  }
  const pct = Math.min(1, c / t);
  return `<div class="item ${done ? 'is-done' : ''} ${locked ? 'is-locked' : ''}"><div class="emoji">${esc(g.emoji || '•')}</div><div class="grow"><div class="name">${esc(g.name)}</div><div class="meta">${goalMeta(g, d)}${streak}</div>${g.type !== 'check' && g.type !== 'sleep' ? `<div class="bar thin"><i style="width:${pct * 100}%"></i></div>` : ''}</div>${ctl}</div>`;
}
function focusCard() {
  const f = S.focus; if (!f) return '';
  const a = f.altId && ALTS.find(x => x.k === f.altId), g = f.goalId && goalById(f.goalId);
  const title = a ? `${a.e} ${a.t}` : g ? `${g.emoji} ${g.name}` : '⏱ Fokus';
  return `<div class="card focus"><div class="row between"><div><div class="eyebrow">Läuft gerade</div><div class="focus-title">${esc(title)}</div>${g && a ? `<div class="muted small">Minuten zählen für „${esc(g.name)}“</div>` : ''}${f.plan ? `<div class="muted small">Plan: ${f.plan} Min</div>` : ''}</div>
    <div class="focus-time" data-tick="focus">0:00</div></div>
    ${f.plan ? `<div class="bar"><i data-tick="focusbar" style="width:0%"></i></div>` : ''}
    ${a && a.href ? `<p class="small" style="margin:10px 0 0">Öffne jetzt <b>English Daily</b> (Home-Bildschirm oder <a href="${a.href}">hier</a>). Wenn du zurückkommst, tipp auf „Fertig“.</p>` : ''}
    <div class="btns"><button class="btn" data-act="focuscancel">Abbrechen</button><button class="btn primary" data-act="focusstop">Fertig ✓</button></div></div>`;
}
function socialCard(t) {
  const m = socialMin(t), L = limit(), over = m > L, sun = isSunday(t), pct = Math.min(100, m / L * 100);
  return `<div class="card ${over && !sun ? 'card-red' : ''}"><div class="row between"><h2 class="h">📵 Social Media</h2><span class="small ${over ? 'red' : 'muted'}">${fmtMin(m)} / ${fmtMin(L)}</span></div>
    <div class="bar ${over ? 'bar-red' : m > L * .75 ? 'bar-warn' : ''}"><i style="width:${pct}%"></i></div>
    <div class="muted small" style="margin-top:6px">${over ? (sun ? 'Über dem Limit – heute ist Freier Tag, zählt nicht.' : '⛔ Limit überschritten – heute ist alles gesperrt.') : `Noch ${fmtMin(L - m)} bis zur Sperre.`}</div>
    <div class="btns"><button class="btn" data-act="social" data-n="15">+15</button><button class="btn" data-act="social" data-n="30">+30</button><button class="btn" data-act="socialedit">Eingeben</button></div></div>`;
}
function weekCard(full) {
  const t = today(), ws = weekStart(t), w = weekScore(ws, t);
  const cells = w.days.map((x, i) => `<div class="wd ${x.future ? 'future' : x.blocked ? 'blocked' : ''} ${x.d === t ? 'today' : ''}" style="${!x.future && !x.blocked && x.max ? heat(x.pts / x.max) : ''}"><span>${DOW[(i + 1) % 7]}</span><b>${x.future || x.none ? '–' : x.blocked ? '⛔' : x.pts}</b></div>`).join('');
  return `<div class="card"><div class="row between"><h2 class="h">Wochenscore ${fmtDM(ws)}–${fmtDM(iso(addDays(parse(ws), 5)))}</h2><span class="muted small">${isSunday(t) ? 'Endergebnis' : 'live'}</span></div>
    <div class="row" style="margin-top:10px">${ring(w.pct / 100, 'sm', 10, `<div class="big">${w.pct}%</div>`)}
    <div class="grow"><div class="grade">${w.grade.e} Note ${w.grade.n} <span class="muted">${w.grade.t}</span></div>
    <div class="muted small">${w.pts} / ${w.max} Punkte${isSunday(t) ? '' : ' bisher'}${w.blocked ? ` · ${w.blocked}× gesperrt` : ''}</div><div class="muted small">Mo–Sa zählen · Sonntag frei</div></div></div>
    <div class="weekgrid">${cells}</div>${full ? `<p class="muted small" style="margin:10px 0 0">Pro Tag: 1 Punkt je erreichtem Ziel + 1 Punkt fürs eingehaltene Social-Media-Limit. Gesperrter Tag = 0 Punkte.</p>` : ''}</div>`;
}
const SUN_IDEAS = ['Ausschlafen', 'Wandern', 'Freunde treffen', 'Familie', 'Natur', 'Kochen', 'Kino', 'Zocken', 'Lesen', 'Sport nach Lust', 'Ausflug', 'Nichts tun'];
function sundayCard(t) {
  const plan = S.sunday[t] || { picks: [], text: '' };
  const lastWs = weekStart(iso(addDays(parse(t), -1))), lw = S.weekScores[lastWs] || weekScore(lastWs);
  return `<div class="card sunday"><div class="sun-icon">☀️</div><h2 class="sun-title">Freier Tag</h2>
    <p class="muted center" style="margin:0 0 14px">Sonntag zählt nicht. Keine Pflicht – mach, worauf du Lust hast.</p>
    <label style="margin-top:0">Was willst du heute machen?</label>
    <div class="chips" id="sunPicks">${SUN_IDEAS.map(s => `<button class="chip ${(plan.picks || []).includes(s) ? 'on' : ''}" data-act="sunpick" data-v="${esc(s)}">${esc(s)}</button>`).join('')}</div>
    <textarea id="sunText" rows="3" placeholder="Eigene Pläne …" style="margin-top:10px">${esc(plan.text)}</textarea>
    <div class="btns"><button class="btn primary" data-act="sunsave">Plan speichern</button></div>
    ${S.sunday[t] ? `<p class="small center okc" style="margin:10px 0 0">✓ Gespeichert – genieß deinen Tag!</p>` : ''}</div>
    ${lw && lw.max ? `<div class="card"><h2 class="h">Deine Woche (Mo–Sa)</h2><div class="row"><div class="bignum">${lw.pct}%</div><div><div style="font-weight:600">${grade(lw.pct).e} Note ${grade(lw.pct).n} – ${grade(lw.pct).t}</div><div class="muted small">${lw.pts} / ${lw.max} Punkte${lw.blocked ? ` · ${lw.blocked}× gesperrt` : ''}</div></div></div></div>` : ''}`;
}
function viewToday() {
  const t = today(), sun = isSunday(t), locked = isBlocked(t), gs = S.goals;
  const done = gs.filter(g => isDone(g, t)).length, n = gs.length;
  const learned = gs.filter(g => g.type === 'minutes').reduce((a, g) => a + val(g, t), 0);
  const pages = gs.filter(g => g.type === 'pages').reduce((a, g) => a + val(g, t), 0);
  const streak = dayStreak(), alts = altsToday().length, bw = bedWake();
  let html = '';
  if (locked) html += `<div class="banner-red" data-act="showlock">⛔ Limit überschritten – heute ist alles gesperrt</div>`;
  html += `<div class="card hero"><div class="row between"><div><div class="eyebrow" data-tick="phase">Bis Schlafenszeit</div><div class="clock" data-tick="tobed">–</div></div>
      <div class="right"><div class="eyebrow">Bis Mitternacht</div><div class="clock sm" data-tick="tomid">–</div></div></div>
    <div class="daybar"><i data-tick="daybar"></i></div><div class="row between tiny muted"><span>☀️ ${bw.wake}</span><span>🌙 ${bw.bed}</span></div>
    <div class="small daytext" data-tick="daytext"></div></div>`;
  if (sun) html += sundayCard(t);
  const msg = locked ? 'Heute gesperrt. Morgen zählt wieder – bleib dran.' : !n ? 'Lege unter „Monk Mode“ deine Ziele an.' : done === n ? 'Alle Ziele erreicht. Stark! 🏆' : done === 0 ? 'Fang mit dem leichtesten Ziel an.' : `Noch ${plural(n - done, 'Ziel', 'Ziele')} – du schaffst das.`;
  html += `<div class="card progress"><div class="row">${ring(n ? done / n : 0, 'md', 10, `<div class="big">${done}<small>/${n}</small></div><div class="muted tiny">Ziele</div>`)}
    <div class="grow"><div class="headline">${msg}</div>
    <div class="stats4"><div><b>${fmtMin(learned)}</b><span>gelernt</span></div><div><b>${pages}</b><span>${pages === 1 ? 'Seite' : 'Seiten'} gelesen</span></div><div><b>🔥 ${streak}</b><span>${streak === 1 ? 'Tag' : 'Tage'} Serie</span></div><div><b>${alts}×</b><span>Scrollen ersetzt</span></div></div></div></div></div>`;
  html += `<div class="quote" data-act="nextquote" id="quote">${quoteHtml()}</div>`;
  html += focusCard();
  if (!n) html += `<div class="card empty"><div class="big">🧘</div>Noch keine Monk-Mode-Ziele.<div class="btns"><button class="btn primary" data-act="addgoal">Ziel anlegen</button></div></div>`;
  else html += `<div class="card ${locked ? 'locked-card' : ''}"><div class="row between"><h2 class="h">${sun ? 'Ziele (heute optional)' : 'Monk Mode heute'}</h2><button class="link" data-act="gomonk">Bearbeiten</button></div>
      <div class="list">${gs.map(g => goalRow(g, t, locked)).join('')}</div></div>`;
  const sug = suggestions();
  html += `<div class="card" id="alts"><div class="row between"><h2 class="h">📵 Statt Scrollen</h2><button class="link" data-act="shuffle">🔀 Andere Ideen</button></div>
    <p class="muted small" style="margin:0 0 6px">Lust aufs Handy? Mach stattdessen eins davon – ein Tipp genügt.</p>
    ${sug.map(({ a, tied }) => `<button class="alt ${tied ? 'tied' : ''}" data-act="alt" data-k="${a.k}"><span class="ae">${a.e}</span><span class="grow"><b>${esc(a.t)}</b><small>${esc(a.d)}${tied ? ' · für dein offenes Ziel' : ''}</small></span><span class="go">${a.focus ? '▶' : a.add ? '+' + a.add : '✓'}</span></button>`).join('')}
    ${alts ? `<div class="muted small" style="margin-top:8px">Heute schon: ${altsToday().map(x => (ALTS.find(a => a.k === x.a) || {}).e || '✓').join(' ')}</div>` : ''}</div>`;
  html += socialCard(t);
  if (!sun) html += weekCard(false);
  return html;
}

/* ===== Monk Mode (Ziele verwalten) ===== */
function heat(r) {
  if (r == null) return ''; if (r < 0) return 'background:rgba(229,83,75,.55);color:#fff'; if (r <= 0) return '';
  const a = [0.25, 0.45, 0.7, 1][Math.min(3, Math.floor(r * 4 - 1e-9))];
  return `background:rgba(214,178,106,${a});color:${a > 0.6 ? '#17130b' : 'var(--text)'}`;
}
function goalDesc(g) {
  if (g.type === 'sleep') return `Im Bett bis ${g.bed || '22:00'}, auf um ${g.wake || '05:00'}`;
  if (g.type === 'minutes') return `Mind. ${fmtMin(target(g))} pro Tag`;
  if (g.type === 'pages') return `Mind. ${target(g)} ${target(g) === 1 ? 'Seite' : 'Seiten'} pro Tag`;
  if (g.type === 'count') return `Mind. ${target(g)} ${esc(g.unit || '')} pro Tag`;
  return 'Täglich abhaken';
}
function weekStrip(g) {
  const t = today(); let head = '', cells = '';
  for (let i = 6; i >= 0; i--) {
    const d = iso(addDays(parse(t), -i)), c = val(g, d), tg = target(g), bl = isBlocked(d);
    head += `<span>${DOW[parse(d).getDay()]}</span>`;
    cells += `<button class="${bl ? 'blk' : c >= tg ? 'on' : c ? 'part' : ''} ${isSunday(d) ? 'sun' : ''} ${d === t ? 'today' : ''}" ${bl ? 'disabled' : ''} data-act="daytoggle" data-id="${g.id}" data-day="${d}">${bl ? '🔒' : parse(d).getDate()}</button>`;
  }
  return `<div class="weekhead">${head}</div><div class="week">${cells}</div>`;
}
const PRESETS = [
  { name: 'Meditieren', emoji: '🧘', type: 'minutes', target: 10 }, { name: 'Kein Zucker', emoji: '🍬', type: 'check' },
  { name: 'Kalt duschen', emoji: '🧊', type: 'check' }, { name: 'Wasser trinken', emoji: '💧', type: 'count', target: 8, unit: 'Gläser' },
  { name: 'Tagebuch', emoji: '✍️', type: 'check' }, { name: 'Englisch üben', emoji: '🇬🇧', type: 'minutes', target: 15 },
  { name: 'Kein Social Media vor 12 Uhr', emoji: '📵', type: 'check' }, { name: 'Spazieren', emoji: '🚶', type: 'minutes', target: 30 },
  { name: 'Keine Pornos', emoji: '🚫', type: 'check' }, { name: '10.000 Schritte', emoji: '👟', type: 'check' }
];
function viewMonk() {
  const ci = challengeInfo(); let html = '';
  if (ci) {
    const c = ci.c;
    const inner = !ci.started ? `<div class="muted tiny">Start in</div><div class="big">${1 - ci.n}</div><div class="muted tiny">${1 - ci.n === 1 ? 'Tag' : 'Tagen'}</div>`
      : ci.finished ? `<div class="big">🏆</div><div class="muted tiny">${c.days} Tage</div>` : `<div class="muted tiny">Tag</div><div class="big">${ci.cur}</div><div class="muted tiny">von ${c.days}</div>`;
    html += `<div class="card challenge"><div class="row">${ring(ci.pct, 'md', 9, inner)}<div class="grow"><div class="eyebrow">Challenge</div><div class="headline">${esc(c.name)}</div>
      <div class="muted small">${fmtShort(c.start)} – ${fmtShort(iso(addDays(ci.end, -1)))}</div>${!ci.finished && ci.started ? `<div class="small accent" data-tick="chend"></div>` : ''}
      <div class="btns tight"><button class="btn small" data-act="editch">Bearbeiten</button><button class="btn small" data-act="endch">Beenden</button></div></div></div></div>`;
  } else {
    html += `<div class="card"><div class="row between"><div><div class="headline">Challenge-Zeitraum</div><div class="muted small">Optional: 30, 60 oder 90 Tage Monk Mode mit Countdown.</div></div><button class="btn primary small" data-act="newch">Starten</button></div></div>`;
  }
  html += `<div class="sect"><h2 class="h">Meine Ziele <span class="muted">(${S.goals.length})</span></h2><div class="row" style="gap:12px">${S.goals.length > 1 ? `<button class="link" data-act="sort">${sortMode ? 'Fertig' : '↕ Sortieren'}</button>` : ''}<button class="btn primary small" data-act="addgoal">+ Ziel</button></div></div>`;
  if (!S.goals.length) html += `<div class="card empty"><div class="big">🌱</div>Lege dein erstes Monk-Mode-Ziel an.</div>`;
  html += S.goals.map((g, i) => {
    const st = goalStreak(g);
    return `<div class="card goal"><div class="row"><div class="emoji">${esc(g.emoji || '•')}</div><div class="grow" style="min-width:0"><div class="gname">${esc(g.name)}</div>
      <div class="muted small">${goalDesc(g)}</div><div class="muted small">🔥 ${st.cur} · Rekord ${st.best} · ${completion(g, 30)} % (30 T)</div></div>
      ${sortMode ? `<div class="sortbtns"><button class="mini" data-act="up" data-id="${g.id}" ${i === 0 ? 'disabled' : ''} aria-label="Nach oben">↑</button><button class="mini" data-act="down" data-id="${g.id}" ${i === S.goals.length - 1 ? 'disabled' : ''} aria-label="Nach unten">↓</button></div>`
        : `<button class="link" data-act="editgoal" data-id="${g.id}">Bearbeiten</button>`}</div>
      ${sortMode ? '' : `<div style="margin-top:10px">${weekStrip(g)}</div>`}</div>`;
  }).join('');
  const pre = PRESETS.map((p, i) => [p, i]).filter(([p]) => !S.goals.some(g => g.name.toLowerCase() === p.name.toLowerCase()));
  if (pre.length) html += `<div class="card"><h2 class="h">Ideen für neue Ziele</h2><div class="chips">${pre.map(([p, i]) => `<button class="chip" data-act="preset" data-i="${i}">${p.emoji} ${esc(p.name)}</button>`).join('')}</div></div>`;
  html += `<p class="muted small center">Tippe auf einen Tag, um ihn nachzutragen. Sonntage sind frei und unterbrechen keine Serie.</p>`;
  if (S.challengeHistory.length) html += `<div class="card"><h2 class="h">Vergangene Challenges</h2>${S.challengeHistory.slice().reverse().map(h => `<div class="hist"><b>${esc(h.name)}</b> <span class="muted">· ${fmtShort(h.start)} · ${h.reached} / ${h.days} Tage ${h.reached >= h.days ? '🏆' : ''}</span></div>`).join('')}</div>`;
  return html;
}

/* ===== Statistik ===== */
let statMonth = null, statGoal = 'all';
function viewStats() {
  const t = today(); if (!statMonth) statMonth = t.slice(0, 7);
  let html = weekCard(true);
  const past = Object.keys(S.weekScores).sort().reverse();
  html += `<div class="card"><h2 class="h">Vergangene Wochen</h2>${past.length ? past.map(ws => { const w = S.weekScores[ws], g = grade(w.pct); return `<div class="hist row between"><div><b>${fmtDM(ws)}–${fmtShort(iso(addDays(parse(ws), 5)))}</b><div class="muted small">${w.pts} / ${w.max} Punkte${w.blocked ? ` · ${w.blocked}× gesperrt` : ''}</div></div><div style="text-align:right"><b style="font-size:18px">${w.pct}%</b><div class="small">${g.e} Note ${g.n}</div></div></div>`; }).join('') : '<div class="muted small">Noch keine abgeschlossene Woche. Der Score wird nach jedem Samstag festgeschrieben.</div>'}</div>`;
  if (!S.goals.length) return html;
  if (statGoal !== 'all' && !goalById(statGoal)) statGoal = 'all';
  const gs = statGoal === 'all' ? S.goals : S.goals.filter(g => g.id === statGoal);
  const avg = n => { const v = gs.map(g => completion(g, n)); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0; };
  let totMin = 0, totPages = 0, totDone = 0;
  for (const d in S.log) for (const g of gs) { const c = S.log[d][g.id] || 0; if (g.type === 'minutes') totMin += c; if (g.type === 'pages') totPages += c; if (doneEff(g, d)) totDone++; }
  const best = Math.max(0, ...gs.map(g => goalStreak(g).best));
  const altTotal = Object.values(S.alts).reduce((a, x) => a + x.length, 0);
  html += `<select id="goalSel" style="margin-bottom:14px"><option value="all">Alle Ziele</option>${S.goals.map(g => `<option value="${g.id}" ${statGoal === g.id ? 'selected' : ''}>${esc(g.emoji || '')} ${esc(g.name)}</option>`).join('')}</select>
  <div class="card"><div class="stats">
    <div class="stat"><b>${avg(7)} %</b><span>Letzte 7 Tage</span></div><div class="stat"><b>${avg(30)} %</b><span>Letzte 30 Tage</span></div>
    <div class="stat"><b>🔥 ${statGoal === 'all' ? dayStreak() : goalStreak(gs[0]).cur}</b><span>Aktuelle Serie</span></div><div class="stat"><b>🏆 ${best}</b><span>Beste Serie</span></div>
    <div class="stat"><b>${fmtMin(totMin)}</b><span>Gelernt insgesamt</span></div><div class="stat"><b>${totPages}</b><span>Seiten insgesamt</span></div>
    <div class="stat"><b>${totDone}</b><span>Ziele erreicht</span></div><div class="stat"><b>${altTotal}×</b><span>Scrollen ersetzt</span></div>
  </div></div>`;
  const [y, m] = statMonth.split('-').map(Number);
  const first = new Date(y, m - 1, 1), daysIn = new Date(y, m, 0).getDate(), offset = (first.getDay() + 6) % 7;
  html += `<div class="card"><div class="row between" style="margin-bottom:10px"><button class="mini" data-act="mprev" aria-label="Voriger Monat">‹</button><b>${MONTHS[m - 1]} ${y}</b><button class="mini" data-act="mnext" aria-label="Nächster Monat">›</button></div><div class="cal">`;
  html += ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => `<div class="dow">${d}</div>`).join('');
  for (let i = 0; i < offset; i++) html += '<div></div>';
  let mDone = 0, mTot = 0;
  for (let d = 1; d <= daysIn; d++) {
    const ds = `${y}-${pad(m)}-${pad(d)}`, fut = ds > t, r = fut ? null : dayRatio(ds, gs);
    if (r != null) { mTot++; mDone += Math.max(0, r); }
    html += `<div class="d ${ds === t ? 'today' : ''} ${fut ? 'future' : ''} ${isSunday(ds) ? 'sun' : ''}" style="${heat(r)}">${d}</div>`;
  }
  html += `</div><div class="row between" style="margin-top:10px"><span class="muted small">Monat: ${mTot ? Math.round(mDone / mTot * 100) : 0} % erfüllt</span><div class="legend">weniger <i style="background:var(--card2)"></i><i style="${heat(.25)}"></i><i style="${heat(.5)}"></i><i style="${heat(.75)}"></i><i style="${heat(1)}"></i> mehr</div></div>
  <div class="legend" style="justify-content:flex-start;margin-top:6px"><i style="${heat(-1)}"></i> gesperrt &nbsp; <i class="sunlg"></i> Sonntag (frei)</div></div>`;
  if (statGoal === 'all') html += `<div class="card"><h2 class="h">Pro Ziel (30 Tage, ohne Sonntage)</h2>${S.goals.map(g => { const p = completion(g, 30); return `<div style="padding:8px 0"><div class="row between small"><span>${esc(g.emoji || '')} ${esc(g.name)}</span><span class="muted">${p} %</span></div><div class="bar"><i style="width:${p}%"></i></div></div>`; }).join('')}</div>`;
  const suns = Object.keys(S.sunday).sort().reverse();
  if (suns.length) html += `<div class="card"><h2 class="h">Sonntage</h2>${suns.slice(0, 20).map(d => `<div class="hist"><b>${fmtShort(d)}</b><div class="muted">${esc([...(S.sunday[d].picks || []), S.sunday[d].text].filter(Boolean).join(' · ') || '–')}</div></div>`).join('')}</div>`;
  return html;
}

/* ===== Mehr ===== */
let snapList = null, deferredPrompt = null;
function storageCard() {
  const env = storageEnv(), ok = s => s ? '✅' : s === false ? '⚠️' : '…';
  const t = Persist.lastSaved ? new Date(Persist.lastSaved).toLocaleTimeString('de-DE') : '–';
  const snapName = k => { const n = k.replace('snap:', ''); return /^\d{4}-\d\d-\d\d$/.test(n) ? 'Tagessicherung ' + fmtShort(n) : n === 'vor-v4' ? 'Stand vor dem Update (v3)' : n.replace(/-(\d{10,})$/, (m, ts) => ' ' + new Date(+ts).toLocaleString('de-DE')).replace(/^vor-/, 'vor ').replace('cloud', 'Cloud-Übernahme').replace('loeschen', 'Löschen'); };
  return `<div class="card"><h2 class="h">Datenspeicher</h2>
    <div class="kv"><span>${ok(Persist.lsOk)} Auf diesem Gerät gespeichert</span><b>${t}</b></div>
    <div class="kv"><span>${ok(Persist.idbOk)} Zweite Sicherung (IndexedDB)</span><b>${Persist.idbOk ? 'aktiv' : Persist.idbOk === false ? 'nicht verfügbar' : '…'}</b></div>
    <div class="kv"><span>${Persist.persisted ? '✅' : 'ℹ️'} Dauerhafter Speicher</span><b>${Persist.persisted ? 'erlaubt' : 'vom Browser verwaltet'}</b></div>
    <div class="kv"><span>${env.standalone ? '✅' : '⚠️'} Geöffnet als</span><b>${env.standalone ? 'Home-Bildschirm-App' : env.inApp ? 'In-App-Browser' : 'Browser-Tab'}</b></div>
    <div class="kv"><span>${window.sbUser ? '✅' : 'ℹ️'} Cloud-Sicherung</span><b>${window.sbUser ? 'an' : 'aus – oben anmelden'}</b></div>
    <p class="muted small">Jede Eingabe wird sofort gespeichert – auch wenn du die App direkt danach schließt. Zusätzlich gibt es jeden Tag eine automatische Sicherung (letzte 21 Tage).</p>
    <button class="btn block" data-act="snaps">${snapList ? 'Sicherungen aktualisieren' : 'Automatische Sicherungen anzeigen'}</button>
    ${snapList ? `<div class="snaps">${snapList.length ? snapList.map(k => `<button class="snap" data-act="restore" data-k="${esc(k)}"><span>${esc(snapName(k))}</span><span class="accent">wiederherstellen</span></button>`).join('') : '<div class="muted small">Noch keine Sicherungen.</div>'}</div>` : ''}</div>`;
}
function viewSettings() {
  const env = storageEnv();
  return `${window.accountCard ? window.accountCard() : ''}${storageCard()}
  <div class="card"><h2 class="h">Social-Media-Limit</h2><p class="small" style="margin-top:0">Aktuell: <b>${fmtMin(limit())}</b> pro Tag. Darüber wird der Tag gesperrt (0 Punkte).</p>
    <div class="row" style="gap:8px"><input type="number" id="limitIn" min="15" max="600" step="15" inputmode="numeric" value="${limit()}"><button class="btn" data-act="savelimit">Speichern</button></div></div>
  <div class="card"><h2 class="h">Apps wirklich sperren</h2>
    <p class="small" style="margin-top:0">Diese App kann andere Apps nicht blockieren. Stell zusätzlich ein echtes Limit im System ein:</p>
    <p class="small"><b>iPhone:</b> Einstellungen → <b>Bildschirmzeit</b> → <b>App-Limits</b> → „Limit hinzufügen“ → <b>Soziale Netzwerke</b> → <b>2 Std.</b> → „Am Ende des Limits blockieren“. Tipp: Bildschirmzeit-Code von jemand anderem setzen lassen.</p>
    <p class="small" style="margin-bottom:0"><b>Android:</b> Einstellungen → <b>Digital Wellbeing</b> → App auswählen → <b>App-Timer</b> → <b>2 Std.</b></p></div>
  <div class="card"><h2 class="h">Backup-Datei</h2><p class="muted small" style="margin-top:0">Zusätzlich kannst du eine Datei exportieren, z. B. vor einem Handywechsel.</p>
    <div class="btns"><button class="btn primary" data-act="export">Exportieren</button><button class="btn" data-act="import">Importieren</button></div>
    <input type="file" id="importFile" accept="application/json,.json" hidden></div>
  ${!env.standalone ? `<div class="card"><h2 class="h">Zum Home-Bildschirm hinzufügen</h2><p class="small" style="margin:0 0 8px"><b>iPhone (Safari):</b> Teilen-Symbol → „Zum Home-Bildschirm“ → „Hinzufügen“.</p><p class="small" style="margin:0"><b>Android (Chrome):</b> Menü ⋮ → „App installieren“.</p>${deferredPrompt ? '<div class="btns"><button class="btn primary" data-act="install">Jetzt installieren</button></div>' : ''}</div>` : ''}
  <div class="card"><h2 class="h">Gefahrenzone</h2><button class="btn danger block" data-act="reset">Alle Daten löschen</button></div>
  <p class="muted small center">Monk Mode · v${APP_VERSION} · funktioniert offline</p>`;
}

/* ===== Formulare ===== */
const EMOJIS = ['🏋️', '😴', '📖', '🧠', '🧘', '💧', '🏃', '💪', '🥗', '🧊', '✍️', '🙏', '🚶', '📵', '🚫', '☀️', '🎯', '🍎', '🇬🇧', '💻', '🌿', '🦷', '💊', '💰'];
function goalForm(g, preset) {
  const isNew = !g; g = g || Object.assign({ name: '', emoji: '🎯', type: 'check', target: 1, unit: '' }, preset || {});
  let type = g.type || 'check';
  openSheet(`<h3>${isNew ? 'Neues Monk-Mode-Ziel' : 'Ziel bearbeiten'}</h3>
    <label>Name</label><input type="text" id="gName" maxlength="40" placeholder="z. B. Meditieren" value="${esc(g.name)}">
    <label>Symbol</label><div class="emojis">${EMOJIS.map(e => `<button type="button" class="${e === g.emoji ? 'on' : ''}" data-e="${e}">${e}</button>`).join('')}</div>
    <input type="text" id="gEmoji" maxlength="4" placeholder="oder eigenes Emoji" value="${EMOJIS.includes(g.emoji) ? '' : esc(g.emoji)}" style="margin-top:8px">
    <label>Wie misst du es?</label><div class="segment" id="gType">${Object.entries(GOAL_TYPES).map(([k, v]) => `<button type="button" data-t="${k}">${v}</button>`).join('')}</div>
    <div id="fAmt"><div class="row" style="gap:10px"><div style="flex:1"><label id="tLbl">Tagesziel</label><input type="number" id="gTarget" min="1" max="1440" inputmode="numeric" value="${target(g)}"></div>
    <div style="flex:1" id="fUnit"><label>Einheit</label><input type="text" id="gUnit" maxlength="12" placeholder="z. B. Gläser" value="${esc(g.unit || '')}"></div></div></div>
    <div id="fSleep"><div class="row" style="gap:10px"><div style="flex:1"><label>Im Bett bis</label><input type="time" id="gBed" value="${g.bed || '22:00'}"></div><div style="flex:1"><label>Aufstehen um</label><input type="time" id="gWake" value="${g.wake || '05:00'}"></div></div></div>
    <div class="btns"><button class="btn" data-x="cancel">Abbrechen</button><button class="btn primary" data-x="save">Speichern</button></div>
    ${!isNew ? '<div class="btns"><button class="btn danger block" data-x="del">Ziel löschen</button></div>' : ''}`, el => {
    let emoji = g.emoji;
    const q = s => el.querySelector(s);
    const syncType = () => {
      el.querySelectorAll('#gType button').forEach(b => b.classList.toggle('on', b.dataset.t === type));
      q('#fAmt').style.display = ['minutes', 'pages', 'count'].includes(type) ? '' : 'none';
      q('#fUnit').style.display = type === 'count' ? '' : 'none';
      q('#fSleep').style.display = type === 'sleep' ? '' : 'none';
      q('#tLbl').textContent = type === 'minutes' ? 'Minuten pro Tag' : type === 'pages' ? 'Seiten pro Tag' : 'Anzahl pro Tag';
    };
    el.querySelectorAll('#gType button').forEach(b => b.onclick = () => { type = b.dataset.t; if (type === 'minutes' && +q('#gTarget').value < 5) q('#gTarget').value = 30; syncType(); });
    syncType();
    el.querySelectorAll('.emojis button').forEach(b => b.onclick = () => { emoji = b.dataset.e; q('#gEmoji').value = ''; el.querySelectorAll('.emojis button').forEach(x => x.classList.toggle('on', x === b)); });
    q('[data-x=cancel]').onclick = closeSheet;
    q('[data-x=save]').onclick = () => {
      const name = q('#gName').value.trim();
      if (!name) { q('#gName').focus(); return toast('Bitte einen Namen eingeben'); }
      const data = { name, emoji: q('#gEmoji').value.trim() || emoji, type, target: ['minutes', 'pages', 'count'].includes(type) ? Math.max(1, parseInt(q('#gTarget').value) || 1) : 1 };
      data.unit = type === 'count' ? q('#gUnit').value.trim() : '';
      if (type === 'sleep') { data.bed = q('#gBed').value || '22:00'; data.wake = q('#gWake').value || '05:00'; }
      if (isNew) S.goals.push(Object.assign({ id: uid(), created: today() }, data)); else Object.assign(g, data);
      save(); closeSheet(); render(); toast(isNew ? 'Ziel angelegt 🎯' : 'Gespeichert ✓');
    };
    const del = q('[data-x=del]');
    if (del) del.onclick = () => {
      if (!confirm(`„${g.name}“ wirklich löschen? Der Verlauf dieses Ziels geht verloren.`)) return;
      snapshotNamed('vor-loeschen-' + Date.now());
      S.goals = S.goals.filter(x => x.id !== g.id); S.deleted[g.id] = Date.now();
      for (const d in S.log) { delete S.log[d][g.id]; if (!Object.keys(S.log[d]).length) delete S.log[d]; }
      if (S.focus && S.focus.goalId === g.id) S.focus = null;
      save(); closeSheet(); render(); toast('Gelöscht');
    };
    if (isNew && !preset) setTimeout(() => q('#gName').focus(), 250);
  });
}
function sleepForm(g, d) {
  d = d || today(); const e = (S.sleep[d] && S.sleep[d][g.id]) || {};
  openSheet(`<h3>😴 Schlaf eintragen</h3><p class="muted small" style="margin:0">Ziel: im Bett bis ${g.bed || '22:00'}, aufstehen um ${g.wake || '05:00'}.</p>
    <div class="row" style="gap:10px"><div style="flex:1"><label>Ins Bett (Vorabend)</label><input type="time" id="sBed" value="${e.bed || g.bed || '22:00'}"></div>
    <div style="flex:1"><label>Aufgestanden</label><input type="time" id="sWake" value="${e.wake || g.wake || '05:00'}"></div></div>
    <div class="btns"><button class="btn" data-x="cancel">Abbrechen</button><button class="btn primary" data-x="save">Speichern</button></div>`, el => {
    el.querySelector('[data-x=cancel]').onclick = closeSheet;
    el.querySelector('[data-x=save]').onclick = () => {
      const bed = el.querySelector('#sBed').value, wake = el.querySelector('#sWake').value;
      if (!bed || !wake) return toast('Bitte beide Zeiten eintragen');
      setSleep(g, d, bed, wake); closeSheet(); render(); toast(sleepOk(g, { bed, wake }) ? 'Ziel erreicht ✓' : 'Diesmal verpasst – morgen wieder');
    };
  });
}
function amountForm(g, d) {
  d = d || today(); const u = g.type === 'minutes' ? 'Minuten' : g.type === 'pages' ? 'Seiten' : (g.unit || 'Anzahl');
  const chips = g.type === 'minutes' ? [15, 30, 45, 60, 90, 120] : [1, 2, 5, 10, 20, 30];
  openSheet(`<h3>${esc(g.emoji)} ${esc(g.name)}</h3><p class="muted small" style="margin:0">${d === today() ? 'Heute' : fmtLong(d)} · Ziel ${target(g)} ${esc(u)}</p>
    <label>${esc(u)} gesamt</label><input type="number" id="aVal" min="0" max="2880" inputmode="numeric" value="${val(g, d)}">
    <div class="chips" style="margin-top:8px">${chips.map(n => `<button class="chip" data-n="${n}">${n}</button>`).join('')}</div>
    <div class="btns"><button class="btn" data-x="cancel">Abbrechen</button><button class="btn primary" data-x="save">Speichern</button></div>`, el => {
    el.querySelectorAll('[data-n]').forEach(b => b.onclick = () => el.querySelector('#aVal').value = b.dataset.n);
    el.querySelector('[data-x=cancel]').onclick = closeSheet;
    el.querySelector('[data-x=save]').onclick = () => { setVal(g, d, parseInt(el.querySelector('#aVal').value) || 0); closeSheet(); render(); toast('Gespeichert ✓'); };
  });
}
function socialForm() {
  const t = today();
  openSheet(`<h3>📵 Social Media heute</h3><p class="muted small" style="margin:0">Gesamtzeit eintragen (z. B. aus der Bildschirmzeit). Limit: ${fmtMin(limit())}.</p>
    <label>Minuten heute</label><input type="number" id="soMin" min="0" max="1440" inputmode="numeric" value="${socialMin(t)}">
    <div class="btns"><button class="btn" data-x="cancel">Abbrechen</button><button class="btn primary" data-x="save">Speichern</button></div>`, el => {
    el.querySelector('[data-x=cancel]').onclick = closeSheet;
    el.querySelector('[data-x=save]').onclick = () => {
      const was = isBlocked(t); setSocial(t, parseInt(el.querySelector('#soMin').value) || 0);
      if (!isBlocked(t) || !was) delete S.lockAck[t];
      save(); closeSheet(); render();
    };
  });
}
function challengeForm(edit) {
  const c = edit ? S.challenge : { name: 'Monk Mode', start: today(), days: 30 };
  const presets = [30, 60, 90];
  openSheet(`<h3>${edit ? 'Challenge bearbeiten' : 'Challenge starten'}</h3>
    <label>Name</label><input type="text" id="cName" maxlength="40" value="${esc(c.name)}">
    <label>Startdatum</label><input type="date" id="cStart" value="${c.start}">
    <label>Dauer (Tage)</label><div class="chips" id="cPresets">${presets.map(p => `<button type="button" class="chip ${c.days === p ? 'on' : ''}" data-p="${p}">${p} Tage</button>`).join('')}</div>
    <input type="number" id="cDays" min="1" max="1000" inputmode="numeric" value="${c.days}" style="margin-top:8px">
    <p class="muted small">Deine Ziele gelten jeden Tag – die Challenge zeigt dir, wie weit du schon bist.</p>
    <div class="btns"><button class="btn" data-x="cancel">Abbrechen</button><button class="btn primary" data-x="save">${edit ? 'Speichern' : 'Los geht’s'}</button></div>`, el => {
    const dIn = el.querySelector('#cDays');
    el.querySelectorAll('#cPresets .chip').forEach(b => b.onclick = () => { dIn.value = b.dataset.p; el.querySelectorAll('#cPresets .chip').forEach(x => x.classList.toggle('on', x === b)); });
    el.querySelector('[data-x=cancel]').onclick = closeSheet;
    el.querySelector('[data-x=save]').onclick = () => {
      const d = parseInt(dIn.value); if (!d || d < 1) return toast('Bitte eine gültige Dauer angeben');
      const data = { name: el.querySelector('#cName').value.trim() || 'Monk Mode', start: el.querySelector('#cStart').value || today(), days: d };
      if (edit) Object.assign(S.challenge, data); else S.challenge = Object.assign({ id: uid() }, data);
      save(); closeSheet(); render(); toast(edit ? 'Gespeichert ✓' : 'Challenge gestartet 🧘');
    };
  });
}
function archiveChallenge() {
  const ci = challengeInfo(); if (!ci) return;
  S.challengeHistory.push({ name: ci.c.name, start: ci.c.start, days: ci.c.days, reached: ci.finished ? ci.c.days : Math.max(0, ci.cur), endedAt: today() });
}

/* ===== Events ===== */
function bind(v) {
  v.querySelectorAll('[data-act]').forEach(el => el.addEventListener('click', e => {
    e.stopPropagation();
    const a = el.dataset.act, id = el.dataset.id, g = id && goalById(id), t = today();
    if (isBlocked(t) && ['toggle', 'add', 'amount', 'sleep', 'gtimer'].includes(a)) { toast('🔒 Heute gesperrt – Social-Media-Limit überschritten'); return; }
    switch (a) {
      case 'toggle': setVal(g, t, isDone(g, t) ? 0 : target(g)); vibrate(); if (allDone(t)) { toast('Alle Ziele erreicht 🏆'); vibrate([40, 50, 40]); } render(); break;
      case 'add': setVal(g, t, val(g, t) + Number(el.dataset.n)); vibrate(); render(); break;
      case 'amount': amountForm(g); break;
      case 'sleep': sleepForm(g); break;
      case 'gtimer': startFocus({ kind: 'goal', goalId: id, plan: Math.max(5, target(g) - val(g, t)) }); toast('Timer läuft ▶'); render(); break;
      case 'focusstop': stopFocus(true); vibrate(); render(); break;
      case 'focuscancel': if (confirm('Timer abbrechen, ohne zu speichern?')) { stopFocus(false); render(); } break;
      case 'alt': doAlt(el.dataset.k); break;
      case 'shuffle': altSeed++; render(); break;
      case 'nextquote': { quoteIdx++; const q = $('#quote'); if (q) q.innerHTML = quoteHtml(); break; }
      case 'daytoggle': {
        const d = el.dataset.day; if (isBlocked(d)) return toast('🔒 Dieser Tag ist gesperrt');
        if (g.type === 'check') { setVal(g, d, isDone(g, d) ? 0 : 1); vibrate(); render(); } else if (g.type === 'sleep') sleepForm(g, d); else amountForm(g, d);
        break;
      }
      case 'social': { const was = isBlocked(t); setSocial(t, socialMin(t) + Number(el.dataset.n)); if (!was && isBlocked(t)) { delete S.lockAck[t]; save(); vibrate([80, 60, 80]); } render(); break; }
      case 'socialedit': socialForm(); break;
      case 'showlock': delete S.lockAck[t]; save(); render(); break;
      case 'sunpick': el.classList.toggle('on'); break;
      case 'sunsave': {
        const picks = [...v.querySelectorAll('#sunPicks .chip.on')].map(c => c.dataset.v), text = v.querySelector('#sunText').value.trim();
        stamp('u|' + t);
        if (!picks.length && !text) { delete S.sunday[t]; save(); render(); return toast('Plan geleert'); }
        S.sunday[t] = { picks, text }; save(); render(); toast('Sonntagsplan gespeichert ☀️'); break;
      }
      case 'gomonk': go('monk'); break;
      case 'addgoal': goalForm(); break;
      case 'editgoal': goalForm(g); break;
      case 'preset': goalForm(null, PRESETS[+el.dataset.i]); break;
      case 'sort': sortMode = !sortMode; render(); break;
      case 'up': case 'down': { const i = S.goals.indexOf(g), j = i + (a === 'up' ? -1 : 1); if (j < 0 || j >= S.goals.length) return; [S.goals[i], S.goals[j]] = [S.goals[j], S.goals[i]]; save(); render(); break; }
      case 'newch': challengeForm(false); break;
      case 'editch': challengeForm(true); break;
      case 'endch': if (confirm('Challenge beenden? Deine Ziele bleiben.')) { archiveChallenge(); S.challenge = null; save(); render(); toast('Challenge beendet'); } break;
      case 'mprev': case 'mnext': { const [y, m] = statMonth.split('-').map(Number); statMonth = iso(new Date(y, m - 1 + (a === 'mnext' ? 1 : -1), 1)).slice(0, 7); render(); break; }
      case 'savelimit': { const n = parseInt(v.querySelector('#limitIn').value); if (!n || n < 1) return toast('Ungültiger Wert'); S.settings.socialLimit = n; save(); render(); toast('Limit gespeichert'); break; }
      case 'snaps': IDB.keys().then(ks => { snapList = ks.filter(k => String(k).startsWith('snap:')).sort().reverse(); render(); }).catch(() => { snapList = []; render(); }); break;
      case 'restore': {
        const k = el.dataset.k; if (!confirm('Diese Sicherung wiederherstellen? Der aktuelle Stand wird vorher selbst gesichert.')) return;
        IDB.get(k).then(async j => {
          if (!j) return toast('Sicherung leer');
          await snapshotNamed('vor-wiederherstellen-' + Date.now());
          const old = migrateState(JSON.parse(j)); old.ts = {}; // Sicherung soll gewinnen
          S = Object.assign(old, { deleted: {}, updatedAt: Date.now() }); save(); snapList = null; render(); toast('Wiederhergestellt ✓');
        });
        break;
      }
      case 'export': exportData(); break;
      case 'import': v.querySelector('#importFile').click(); break;
      case 'install': deferredPrompt && deferredPrompt.prompt(); break;
      case 'reset':
        if (confirm(window.sbUser ? 'Wirklich ALLE Daten löschen – auf diesem Gerät UND in der Cloud?' : 'Wirklich ALLE Daten löschen?')) {
          snapshotNamed('vor-reset-' + Date.now());
          const del = Object.assign({}, S.deleted); S.goals.forEach(x => { del[x.id] = Date.now(); });
          S = migrateState(null); S.deleted = del; save(); render(); toast('Alle Daten gelöscht');
        }
        break;
    }
  }));
  const sel = v.querySelector('#goalSel'); if (sel) sel.onchange = () => { statGoal = sel.value; render(); };
  const f = v.querySelector('#importFile'); if (f) f.onchange = () => importData(f.files[0]);
}

/* ===== Live-Anzeige (jede Sekunde) ===== */
let planAlerted = null;
function tick() {
  const set = (k, html) => document.querySelectorAll(`[data-tick="${k}"]`).forEach(e => { if (e.innerHTML !== html) e.innerHTML = html; });
  if (tab === 'today') {
    const c = dayClock();
    if (c.phase === 'day') { set('phase', `Bis Schlafenszeit ${c.bed}`); set('tobed', hms(c.toBed)); set('daytext', `Noch <b>${hm(c.toBed)}</b> wache Zeit heute. ${c.toBed < 3600 ? 'Fang an, runterzufahren 🌙' : c.dayPct < .5 ? 'Der Tag gehört dir.' : 'Nutze sie – nicht fürs Scrollen.'}`); }
    else if (c.phase === 'late') { set('phase', 'Schlafenszeit'); set('tobed', 'Jetzt 😴'); set('daytext', `Es ist nach ${c.bed}. Handy weg – morgen um ${c.wake} geht’s weiter.`); }
    else { set('phase', 'Nacht'); set('tobed', 'Schlafen 🌙'); set('daytext', `Aufstehen um ${c.wake}.`); }
    set('tomid', hms(c.toMid));
    document.querySelectorAll('[data-tick="daybar"]').forEach(e => e.style.width = (c.dayPct * 100) + '%');
  }
  if (S.focus) {
    const s = focusElapsed(); set('focus', s >= 3600 ? hms(s) : `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`);
    if (S.focus.plan) document.querySelectorAll('[data-tick="focusbar"]').forEach(e => e.style.width = Math.min(100, s / 60 / S.focus.plan * 100) + '%');
    if (S.focus.plan && s >= S.focus.plan * 60 && planAlerted !== S.focus.startedAt) { planAlerted = S.focus.startedAt; vibrate([100, 80, 100]); toast('⏰ Zeit erreicht – tippe auf „Fertig“'); }
    const g = S.focus.goalId && goalById(S.focus.goalId);
    if (g) document.querySelectorAll(`[data-livegoal="${g.id}"]`).forEach(e => e.textContent = fmtMin(val(g, S.focus.day) + s / 60));
  }
  const ci = tab === 'monk' && challengeInfo();
  if (ci) { const ms = Math.max(0, ci.end - new Date()); set('chend', `Noch ${Math.floor(ms / 864e5)} T ${pad(Math.floor(ms / 36e5) % 24)}:${pad(Math.floor(ms / 6e4) % 60)}:${pad(Math.floor(ms / 1e3) % 60)}`); }
}
setInterval(tick, 1000);
setInterval(() => {
  if (tab !== 'today' || document.hidden) return;
  const q = $('#quote'); if (!q) return;
  quoteIdx++; q.classList.add('fade'); setTimeout(() => { q.innerHTML = quoteHtml(); q.classList.remove('fade'); }, 300);
}, 12000);

/* ===== Export / Import ===== */
async function exportData() {
  const json = JSON.stringify(Object.assign({ exportedAt: new Date().toISOString(), app: 'monk-mode' }, S), null, 2);
  const name = `monk-mode-backup-${today()}.json`, file = new File([json], name, { type: 'application/json' });
  try { if (navigator.canShare && navigator.canShare({ files: [file] }) && /iPhone|iPad|Android/i.test(navigator.userAgent)) { await navigator.share({ files: [file], title: 'Monk Mode Backup' }); return; } }
  catch (e) { if (e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); toast('Backup exportiert');
}
function importData(file) {
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result);
      if (!d || typeof d !== 'object' || (!Array.isArray(d.goals) && !Array.isArray(d.habits))) throw new Error('format');
      if (!confirm('Backup mit deinen aktuellen Daten zusammenführen? Es geht nichts verloren.')) return;
      delete d.exportedAt; delete d.app;
      snapshotNamed('vor-import-' + Date.now());
      S = mergeStates(S, d); save(); render(); toast('Backup importiert ✓');
    } catch (e) { toast('Ungültige Backup-Datei'); }
  };
  r.readAsText(file);
}

/* ===== Speichern beim Verlassen + Tageswechsel ===== */
let lastDay = today();
document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); else { lastDay = today(); render(); } });
window.addEventListener('pagehide', flush);
window.addEventListener('beforeunload', flush);
document.addEventListener('freeze', flush);
// zweiter Tab/zweites Fenster hat gespeichert -> übernehmen statt überschreiben
window.addEventListener('storage', e => { if (e.key === KEY && e.newValue) { try { const st = JSON.parse(e.newValue); if ((st.updatedAt || 0) >= (S.updatedAt || 0)) { S = migrateState(st); render(); } } catch (x) {} } });
setInterval(() => { if (today() !== lastDay) { lastDay = today(); render(); } }, 30000);

/* ===== PWA / Updates ===== */
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; if (tab === 'settings') render(); });
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const hadCtl = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadCtl) return;
    flush();
    if (document.hidden) location.reload(); else { updateReady = true; renderNotice(); }
  });
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').then(reg => {
    const check = () => reg.update().catch(() => {});
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
    setInterval(check, 30 * 60 * 1000);
  }).catch(err => console.warn('SW', err)));
}

render();
requestPersist().then(() => { if (tab === 'settings') render(); });
reconcileWithIdb(() => render());
