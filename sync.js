'use strict';
/* ===== Cloud-Sync (Supabase) – optional, App funktioniert auch ohne Konto ===== */
const SB_URL = 'https://dlrnygtprbhfrnabmvwv.supabase.co';
const SB_KEY = 'sb_publishable_H8mGOsg6zg2duGvYvjNdZw_xq7CdFhi'; // öffentlicher Publishable Key (RLS schützt die Daten)
const SITE_URL = location.hostname.endsWith('github.io') ? 'https://mouad-1998.github.io/Monkmode/' : location.origin + location.pathname.replace(/[^/]*$/, '');
const META_KEY = 'monkmode.sync';
let sb = null;
window.sbUser = null;
let meta = loadMeta();
let syncTimer = null, syncing = false, syncAgain = false, status = { s: 'idle', msg: '' };

function loadMeta() { try { return Object.assign({ uid: null, lastRemote: null, lastSync: null, dirty: false }, JSON.parse(localStorage.getItem(META_KEY)) || {}); } catch (e) { return { uid: null, lastRemote: null, lastSync: null, dirty: false }; } }
function saveMeta() { localStorage.setItem(META_KEY, JSON.stringify(meta)); }

try {
  if (window.supabase && window.supabase.createClient) {
    sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'monkmode-auth' } });
  }
} catch (e) { console.warn('Supabase init', e); sb = null; }

/* ---------- Status ---------- */
function fmtSync(ts) {
  if (!ts) return 'noch nie';
  const d = new Date(ts), now = new Date();
  const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return `heute, ${time} Uhr`;
  const y = new Date(now); y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return `gestern, ${time} Uhr`;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) + `, ${time} Uhr`;
}
function statusText() {
  if (!navigator.onLine) return `⚪ Offline – Änderungen werden hochgeladen, sobald du online bist. Zuletzt synchronisiert: ${fmtSync(meta.lastSync)}`;
  if (status.s === 'syncing') return '🔄 Synchronisiere …';
  if (status.s === 'error') return `⚠️ Sync fehlgeschlagen (${esc(status.msg)}) – neuer Versuch folgt. Zuletzt synchronisiert: ${fmtSync(meta.lastSync)}`;
  return `✅ Zuletzt synchronisiert: ${fmtSync(meta.lastSync)}${meta.dirty ? ' · Änderungen ausstehend' : ''}`;
}
function setStatus(s, msg) {
  status = { s, msg: msg || '' };
  const el = document.getElementById('syncStatus'); if (el) el.innerHTML = statusText();
  const dot = document.getElementById('syncDot');
  if (dot) { dot.className = 'syncdot ' + (!window.sbUser ? '' : !navigator.onLine ? 'off' : s === 'error' ? 'err' : s === 'syncing' ? 'busy' : 'ok'); }
}

/* ---------- Übernahme ---------- */
// mergeStates/hasRealData/migrateState kommen aus store.js
function applyState(st) {
  snapshotNamed('vor-cloud-' + Date.now()); // lokaler Stand bleibt als Sicherung erhalten
  S = migrateState(st);
  writeLocal();
  render();
}
let localRev = 0; // zählt jede lokale Änderung (gegen verlorene Änderungen während eines Uploads)

/* ---------- Sync ---------- */
async function fetchRemote() {
  const { data, error } = await sb.from('user_data').select('data, updated_at').eq('user_id', window.sbUser.id).maybeSingle();
  if (error) throw error;
  return data;
}
async function pushRemote() {
  const rev = localRev;
  const { data, error } = await sb.from('user_data').upsert({ user_id: window.sbUser.id, data: S }, { onConflict: 'user_id' }).select('updated_at').single();
  if (error) throw error;
  meta.lastRemote = data.updated_at; meta.lastSync = Date.now();
  meta.dirty = rev !== localRev; // während des Uploads geändert? -> bleibt "ausstehend" und wird gleich nochmal hochgeladen
  saveMeta();
  if (meta.dirty) syncAgain = true;
}
function askChoice() {
  return new Promise(resolve => {
    openSheet(`<h3>☁️ Daten zusammenführen?</h3>
      <p class="muted small" style="margin-top:4px">Auf diesem Gerät und in deinem Konto sind schon Einträge gespeichert. Was soll passieren?</p>
      <div class="btns" style="flex-direction:column"><button class="btn primary" data-c="merge">Zusammenführen (empfohlen)</button>
      <button class="btn" data-c="cloud">Nur Cloud-Daten behalten</button><button class="btn" data-c="local">Nur Daten dieses Geräts behalten</button></div>
      <p class="muted small">Beim Zusammenführen bleiben alle abgehakten Tage beider Seiten erhalten; bei Einstellungen gewinnt die neuere Version.</p>`, el => {
      el.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { closeSheet(); resolve(b.dataset.c); });
    });
    // Hintergrund-Tippen = zusammenführen
    document.querySelector('#sheet .sheet-backdrop').addEventListener('click', () => resolve('merge'), { once: true });
  });
}
async function syncNow() {
  if (!sb || !window.sbUser) return;
  if (!navigator.onLine) { setStatus('idle'); return; }
  if (syncing) { syncAgain = true; return; }
  syncing = true; setStatus('syncing');
  try {
    const remote = await fetchRemote();
    const firstTime = meta.uid !== window.sbUser.id;
    if (firstTime) { meta = { uid: window.sbUser.id, lastRemote: null, lastSync: null, dirty: true }; saveMeta(); }
    if (!remote) {
      await pushRemote();
    } else if (remote.updated_at === meta.lastRemote) {
      if (meta.dirty) await pushRemote(); else { meta.lastSync = Date.now(); saveMeta(); }
    } else if (firstTime) {
      if (!hasRealData(S)) { applyState(remote.data); meta.lastRemote = remote.updated_at; meta.dirty = false; meta.lastSync = Date.now(); saveMeta(); toast('Daten aus der Cloud geladen ☁️'); }
      else if (!hasRealData(remote.data)) { await pushRemote(); }
      else {
        const c = await askChoice();
        if (c === 'cloud') { applyState(remote.data); meta.lastRemote = remote.updated_at; meta.dirty = false; meta.lastSync = Date.now(); saveMeta(); }
        else { if (c === 'merge') { snapshotNamed('vor-cloud-' + Date.now()); S = mergeStates(S, remote.data); render(); } S.updatedAt = Date.now(); writeLocal(); await pushRemote(); }
        toast('Synchronisiert ✓');
      }
    } else if (!meta.dirty) {
      // anderes Gerät hat etwas geändert, hier nichts Neues
      if (hasRealData(S) && !hasRealData(remote.data)) { await pushRemote(); }            // nie leere Cloud über echte Daten
      else { applyState(remote.data); meta.lastRemote = remote.updated_at; meta.lastSync = Date.now(); saveMeta(); }
    } else {
      // beide Seiten geändert -> zusammenführen (pro Eintrag gewinnt die neueste Änderung)
      S = mergeStates(S, remote.data); writeLocal(); render(); await pushRemote();
    }
    setStatus('ok');
  } catch (e) {
    console.warn('Sync', e);
    setStatus('error', navigator.onLine ? (e.message || 'Fehler') : 'offline');
    clearTimeout(syncTimer); syncTimer = setTimeout(syncNow, 30000);
  } finally {
    syncing = false;
    if (syncAgain) { syncAgain = false; scheduleSync(300); }
  }
}
function scheduleSync(ms) { clearTimeout(syncTimer); syncTimer = setTimeout(syncNow, ms == null ? 1500 : ms); }
window.onLocalSave = () => { localRev++; if (!window.sbUser) return; meta.dirty = true; saveMeta(); setStatus(status.s === 'error' ? 'error' : 'idle', status.msg); scheduleSync(); };
window.addEventListener('online', () => { setStatus('idle'); scheduleSync(200); });
window.addEventListener('offline', () => setStatus('idle'));
document.addEventListener('visibilitychange', () => { if (!document.hidden) scheduleSync(300); else if (meta.dirty && window.sbUser) syncNow(); });
window.addEventListener('pagehide', () => { if (meta.dirty && window.sbUser) syncNow(); });

/* ---------- Auth ---------- */
const AUTH_ERR = [
  [/invalid login credentials/i, 'E-Mail oder Passwort ist falsch.'],
  [/email not confirmed/i, 'Bitte bestätige zuerst deine E-Mail-Adresse (Link im Postfach, auch im Spam-Ordner schauen).'],
  [/already registered|already been registered|user_already_exists/i, 'Diese E-Mail ist schon registriert – melde dich einfach an.'],
  [/password should be at least|weak.?password/i, 'Das Passwort ist zu kurz oder zu schwach (mind. 6 Zeichen).'],
  [/rate limit|too many|security purposes/i, 'Zu viele Versuche – bitte warte kurz und versuche es erneut.'],
  [/invalid.*email|unable to validate email|email address .* is invalid/i, 'Bitte gib eine gültige E-Mail-Adresse ein.'],
  [/failed to fetch|network|load failed/i, 'Keine Internetverbindung.']
];
const deErr = e => { const m = (e && (e.message || e.msg)) || String(e); const hit = AUTH_ERR.find(([r]) => r.test(m)); return hit ? hit[1] : m; };
function authMsg(text, ok) { const el = document.getElementById('authMsg'); if (el) { el.textContent = text; el.className = 'small ' + (ok ? 'okmsg' : 'errmsg'); } }
const authVals = () => ({ email: (document.getElementById('authEmail') || {}).value?.trim() || '', password: (document.getElementById('authPw') || {}).value || '' });

window.accountCard = function () {
  if (!sb) return `<div class="card"><h2>Konto & Cloud-Sync</h2><p class="muted small" style="margin:0">Cloud-Sync ist gerade nicht verfügbar. Deine Daten bleiben lokal gespeichert.</p></div>`;
  if (window.sbUser) {
    return `<div class="card"><h2>Konto & Cloud-Sync</h2>
      <div class="row"><div class="emoji">☁️</div><div class="grow" style="min-width:0"><div style="font-weight:600;overflow:hidden;text-overflow:ellipsis">${esc(window.sbUser.email)}</div><div class="muted small">Angemeldet · Sync automatisch</div></div></div>
      <p class="small" id="syncStatus" style="margin:12px 0 0">${statusText()}</p>
      <div class="btns"><button class="btn" data-acc="sync">Jetzt synchronisieren</button><button class="btn" data-acc="logout">Abmelden</button></div></div>`;
  }
  return `<div class="card"><h2>Konto & Cloud-Sync</h2>
    <p class="small" style="margin-top:0">Melde dich an, damit deine Einträge automatisch in der Cloud gesichert werden und auf einem neuen Handy zurückkommen. Ohne Konto funktioniert alles weiter – nur lokal.</p>
    <form id="authForm" onsubmit="return false">
    <label>E-Mail</label><input type="email" id="authEmail" autocomplete="username" inputmode="email" autocapitalize="off" placeholder="name@beispiel.de">
    <label>Passwort</label><input type="password" id="authPw" autocomplete="current-password" placeholder="mind. 6 Zeichen">
    <div class="btns"><button class="btn primary" data-acc="login" type="submit">Anmelden</button><button class="btn" data-acc="signup" type="button">Registrieren</button></div>
    </form>
    <p id="authMsg" class="small"></p>
    <button class="btn ghost block small" data-acc="reset" style="margin-top:4px">Passwort vergessen?</button>
    <p class="muted small" style="margin-bottom:0">Nach dem Registrieren bekommst du eine E-Mail. <b>Bitte bestätige deine E-Mail-Adresse</b> über den Link. Wichtig auf dem iPhone: Der Link öffnet Safari – öffne danach Monk Mode <b>vom Home-Bildschirm</b> und melde dich dort mit E-Mail und Passwort an.</p></div>`;
};

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-acc]'); if (!b || !sb) return;
  e.preventDefault();
  const act = b.dataset.acc, { email, password } = authVals();
  try {
    if (act === 'login' || act === 'signup') {
      if (!email || !password) return authMsg('Bitte E-Mail und Passwort eingeben.');
      b.disabled = true;
      if (act === 'login') {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast('Angemeldet ✓');
      } else {
        const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: SITE_URL } });
        if (error) throw error;
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) throw new Error('already registered');
        if (!data.session) authMsg('Fast geschafft! Wir haben dir eine E-Mail geschickt. Bitte bestätige deine Adresse über den Link und melde dich dann hier an.', true);
      }
    } else if (act === 'reset') {
      if (!email) return authMsg('Gib oben deine E-Mail ein und tippe dann auf „Passwort vergessen?“.');
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: SITE_URL });
      if (error) throw error;
      authMsg('Falls ein Konto existiert, haben wir dir einen Link zum Zurücksetzen geschickt.', true);
    } else if (act === 'logout') {
      flush(); if (meta.dirty && navigator.onLine) await syncNow();
      if (!confirm('Abmelden? Deine Daten bleiben auf diesem Gerät gespeichert, werden aber nicht mehr synchronisiert.')) return;
      await sb.auth.signOut();
      meta = { uid: null, lastRemote: null, lastSync: null, dirty: false }; saveMeta();
      toast('Abgemeldet');
    } else if (act === 'sync') {
      await syncNow(); if (status.s === 'ok') toast('Synchronisiert ✓');
    }
  } catch (err) { authMsg(deErr(err)); }
  finally { b.disabled = false; }
});

function newPasswordSheet() {
  openSheet(`<h3>Neues Passwort festlegen</h3><label>Neues Passwort</label><input type="password" id="npw" autocomplete="new-password" placeholder="mind. 6 Zeichen">
    <p id="npwMsg" class="small errmsg"></p><div class="btns"><button class="btn primary" id="npwSave">Speichern</button></div>`, el => {
    el.querySelector('#npwSave').onclick = async () => {
      const pw = el.querySelector('#npw').value; if (pw.length < 6) { el.querySelector('#npwMsg').textContent = 'Mindestens 6 Zeichen.'; return; }
      const { error } = await sb.auth.updateUser({ password: pw });
      if (error) { el.querySelector('#npwMsg').textContent = deErr(error); return; }
      closeSheet(); toast('Passwort geändert ✓');
    };
  });
}

if (sb) {
  sb.auth.onAuthStateChange((event, session) => {
    const prev = window.sbUser && window.sbUser.id;
    window.sbUser = session ? session.user : null;
    if (event === 'PASSWORD_RECOVERY') setTimeout(newPasswordSheet, 300);
    if ((window.sbUser && window.sbUser.id) !== prev) {
      // Bestätigungs-/Reset-Links hinterlassen Token im URL-Hash – aufräumen
      if (location.hash && /access_token|error/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
      setTimeout(() => { if (tab === 'settings') render(); setStatus(status.s); if (window.sbUser) scheduleSync(100); }, 0);
    }
  });
  if (/error_description=/.test(location.hash)) {
    const p = new URLSearchParams(location.hash.slice(1));
    setTimeout(() => toast(/expired/i.test(p.get('error_description') || '') ? 'Link abgelaufen – bitte erneut anfordern' : 'Link ungültig'), 600);
  }
}
// Status-Punkt in der Kopfzeile
(function () { const h = document.getElementById('topright') || document.querySelector('.topbar'); if (h && !document.getElementById('syncDot')) { const d = document.createElement('i'); d.id = 'syncDot'; d.className = 'syncdot'; d.title = 'Cloud-Sync'; h.appendChild(d); d.onclick = () => go('settings'); } })();
