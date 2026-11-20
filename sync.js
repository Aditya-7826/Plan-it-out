// Plan it out: sync across devices with a Supabase account (email sign-in, no password).
// Talks to Supabase Auth and the REST API with plain fetch, so no library or build step is needed.
// Runs after app.js and uses its globals: data, save listeners, replaceData, validateBackup, icon, $.
(() => {
  const cfg = window.PLAN_IT_OUT_CONFIG || {};
  const BASE = (cfg.supabaseUrl || "").replace(/\/+$/, "");
  const KEY = cfg.supabaseAnonKey || "";
  // a hosted Supabase project, or a local one (supabase CLI) while developing
  const ENABLED = /^(https:\/\/[a-z0-9-]+\.supabase\.co|http:\/\/(localhost|127\.0\.0\.1):\d+)$/i.test(BASE) && KEY.length > 20;

  const AUTH_KEY = "planItOut.auth"; // { access_token, refresh_token, expires_at, user: { id, email } }
  const META_KEY = "planItOut.sync"; // { userId, version, dirty, lastSyncAt }
  const TABLE = "planner_data";
  const PUSH_DELAY = 1500;
  const POLL_EVERY = 60 * 1000;

  const readJSON = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  const writeJSON = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  let session = readJSON(AUTH_KEY);
  let meta = readJSON(META_KEY) || {};
  let changeCounter = 0; // bumps on every local edit, so edits made during an upload aren't lost
  let syncing = false;
  let again = false;
  let pushTimer = null;
  let pendingEmail = "";
  let state = "idle"; // idle | syncing | ok | offline | error
  let lastError = "";

  // ---------------- small helpers ----------------
  const show = (id, on) => { $(id).hidden = !on; };
  function setStatus(msg, kind) {
    const el = $("syncStatus");
    el.textContent = msg || "";
    el.className = `backup-status ${kind || ""}`;
  }
  function saveMeta() { writeJSON(META_KEY, meta); }
  function ago(ts) {
    if (!ts) return "never";
    const s = Math.round((Date.now() - ts) / 1000);
    if (s < 10) return "just now";
    if (s < 60) return `${s} seconds ago`;
    const m = Math.round(s / 60);
    if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
    const h = Math.round(m / 60);
    return `${h} hour${h === 1 ? "" : "s"} ago`;
  }

  class HttpError extends Error {
    constructor(status, body) {
      super((body && (body.msg || body.message || body.error_description || body.error)) || `HTTP ${status}`);
      this.status = status;
    }
  }

  async function request(path, { method = "GET", body, token, headers = {}, timeout = 10000 } = {}) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    let res;
    try {
      res = await fetch(BASE + path, {
        method,
        signal: ctrl.signal,
        cache: "no-store",
        headers: {
          apikey: KEY,
          Authorization: `Bearer ${token || KEY}`,
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
          ...headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } finally {
      clearTimeout(timer);
    }
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch {}
    if (!res.ok) throw new HttpError(res.status, json);
    return json;
  }

  // ---------------- auth ----------------
  function storeSession(s) {
    if (!s || !s.access_token || !s.refresh_token) return false;
    session = {
      access_token: s.access_token,
      refresh_token: s.refresh_token,
      expires_at: s.expires_at || Math.floor(Date.now() / 1000) + (Number(s.expires_in) || 3600),
      user: s.user ? { id: s.user.id, email: s.user.email } : (session && session.user) || null,
    };
    writeJSON(AUTH_KEY, session);
    return true;
  }

  function clearSession() {
    session = null;
    writeJSON(AUTH_KEY, null);
    meta = {};
    saveMeta();
  }

  async function validToken() {
    if (!session) return null;
    if (session.expires_at - 60 > Date.now() / 1000) return session.access_token;
    try {
      const s = await request("/auth/v1/token?grant_type=refresh_token", { method: "POST", body: { refresh_token: session.refresh_token } });
      storeSession(s);
      return session.access_token;
    } catch (e) {
      if (e instanceof HttpError && e.status >= 400 && e.status < 500) {
        clearSession();
        renderUI();
        setStatus("You were signed out. Please sign in again.", "error");
      }
      throw e;
    }
  }

  async function sendLink(email) {
    const redirect = location.origin + location.pathname;
    await request(`/auth/v1/otp?redirect_to=${encodeURIComponent(redirect)}`, {
      method: "POST",
      body: { email, create_user: true },
    });
  }

  async function verifyCode(email, token) {
    const s = await request("/auth/v1/verify", { method: "POST", body: { type: "email", email, token } });
    if (!storeSession(s)) throw new Error("Sign-in failed.");
  }

  // The email link brings you back with the session in the URL fragment (#access_token=...).
  async function handleRedirect() {
    if (!location.hash || location.hash.length < 2) return;
    const p = new URLSearchParams(location.hash.slice(1));
    const clean = () => history.replaceState(null, "", location.pathname + location.search);
    if (p.get("error") || p.get("error_description")) {
      clean();
      setStatus(`Sign-in link didn't work: ${p.get("error_description") || p.get("error")}. Request a new one.`, "error");
      return;
    }
    if (!p.get("access_token")) return;
    clean(); // remove tokens from the address bar and history right away
    const ok = storeSession({
      access_token: p.get("access_token"),
      refresh_token: p.get("refresh_token"),
      expires_in: p.get("expires_in"),
      expires_at: Number(p.get("expires_at")) || undefined,
    });
    if (!ok) return;
    try {
      const user = await request("/auth/v1/user", { token: session.access_token });
      session.user = { id: user.id, email: user.email };
      writeJSON(AUTH_KEY, session);
    } catch {
      clearSession();
      setStatus("Couldn't finish signing in. Request a new link.", "error");
    }
  }

  async function signOut() {
    const token = session && session.access_token;
    clearSession();
    renderUI();
    setStatus("Signed out. Your plans stay on this device.", "");
    if (token) { try { await request("/auth/v1/logout", { method: "POST", token }); } catch {} }
  }

  // ---------------- merge ----------------
  // Used when both devices changed since the last sync. Combines both instead of dropping either.
  // (Something deleted on one device while the other edited it can come back.)
  function mergeById(local = [], remote = []) {
    const out = [...local];
    const seen = new Set(local.map((x) => x && x.id));
    for (const item of remote) if (!seen.has(item && item.id)) out.push(item);
    return out;
  }
  function mergeNotes(a = "", b = "") {
    if (a === b || !b) return a;
    if (!a) return b;
    if (a.includes(b)) return a;
    if (b.includes(a)) return b;
    return `${a}\n\n${b}`;
  }
  function mergeData(local, remote) {
    const days = {};
    const keys = new Set([...Object.keys(local.days || {}), ...Object.keys(remote.days || {})]);
    for (const k of keys) {
      const a = local.days && local.days[k];
      const b = remote.days && remote.days[k];
      if (!a || !b) { days[k] = a || b; continue; }
      days[k] = { tasks: mergeById(a.tasks, b.tasks), notes: mergeNotes(a.notes, b.notes) };
    }
    const records = { ...(remote.records || {}) };
    for (const [k, v] of Object.entries(local.records || {})) records[k] = Math.max(v || 0, records[k] || 0);
    return { days, hobbies: mergeById(local.hobbies, remote.hobbies), records };
  }

  // ---------------- database (one row per account, protected by row-level security) ----------------
  async function pull(token) {
    const rows = await request(`/rest/v1/${TABLE}?select=data,version&limit=1`, { token });
    return rows && rows[0] ? rows[0] : null;
  }
  async function insert(token, payload) {
    const rows = await request(`/rest/v1/${TABLE}`, {
      method: "POST", token, body: { data: payload },
      headers: { Prefer: "return=representation" },
    });
    return rows[0].version;
  }
  // Only updates if nobody else saved since `version` (returns null on conflict).
  async function update(token, payload, version) {
    const rows = await request(`/rest/v1/${TABLE}?user_id=eq.${encodeURIComponent(session.user.id)}&version=eq.${version}`, {
      method: "PATCH", token, body: { data: payload },
      headers: { Prefer: "return=representation" },
    });
    return rows && rows[0] ? rows[0].version : null;
  }

  // ---------------- sync loop ----------------
  async function syncNow() {
    if (!ENABLED || !session || !session.user) return;
    if (syncing) { again = true; return; }
    syncing = true;
    state = "syncing";
    renderPill();
    try {
      for (let attempt = 0; attempt < 4; attempt++) {
        const token = await validToken();
        if (!token) return;
        if (meta.userId !== session.user.id) meta = { userId: session.user.id }; // new account on this device

        const remote = await pull(token);
        const startCounter = changeCounter;

        if (remote) {
          const problem = validateBackup(remote.data);
          if (problem) throw new Error(`The synced copy looks damaged (${problem}). Nothing was changed.`);
        }

        let toUpload = null;
        let baseVersion = null;

        if (!remote) {
          toUpload = data; // first device: upload what's here
        } else if (meta.version === remote.version) {
          if (!meta.dirty) break; // already in sync
          toUpload = data; baseVersion = remote.version; // only we changed
        } else if (meta.version != null && !meta.dirty) {
          replaceData(remote.data); // only the other device changed
          meta.version = remote.version;
          break;
        } else {
          // both changed, or this device's first sync with an existing account: merge
          const merged = mergeData(data, remote.data);
          replaceData(merged);
          if (JSON.stringify(merged) === JSON.stringify(remote.data)) { meta.version = remote.version; meta.dirty = false; break; }
          toUpload = merged; baseVersion = remote.version;
        }

        const payload = JSON.parse(JSON.stringify(toUpload));
        let newVersion;
        try {
          newVersion = baseVersion == null ? await insert(token, payload) : await update(token, payload, baseVersion);
        } catch (e) {
          if (e instanceof HttpError && e.status === 409) continue; // another device created the row first
          throw e;
        }
        if (newVersion == null) continue; // another device saved first: pull again and merge
        meta.version = newVersion;
        if (changeCounter === startCounter) { meta.dirty = false; break; }
        // edited during the upload: go round again
      }
      meta.lastSyncAt = Date.now();
      saveMeta();
      state = "ok";
      lastError = "";
    } catch (e) {
      saveMeta();
      if (!navigator.onLine || e.name === "AbortError" || e instanceof TypeError) {
        state = "offline";
        lastError = "";
      } else {
        state = "error";
        lastError = e.message || "Sync failed.";
      }
    } finally {
      syncing = false;
      renderUI();
      if (again) { again = false; schedulePush(200); }
    }
  }

  function schedulePush(delay = PUSH_DELAY) {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(syncNow, delay);
  }

  // ---------------- UI ----------------
  function renderPill() {
    const pill = $("syncPill");
    let iconName = "cloud", text = "Synced", kind = "ok";
    if (!session) { iconName = "cloud-off"; text = "Sign in to sync"; kind = ""; }
    else if (state === "syncing") { iconName = "refresh"; text = "Syncing…"; kind = "busy"; }
    else if (state === "offline") { iconName = "cloud-off"; text = meta.dirty ? "Offline · will sync" : "Offline"; kind = "warn"; }
    else if (state === "error") { iconName = "cloud-off"; text = "Sync problem"; kind = "error"; }
    else if (meta.dirty) { iconName = "cloud"; text = "Not synced yet"; kind = "warn"; }
    pill.className = `text-btn sync-pill sync-only ${kind}`;
    $("syncPillIcon").innerHTML = icon(iconName); // static icon markup only
    $("syncPillText").textContent = text;
  }

  function renderUI() {
    document.querySelectorAll(".sync-only").forEach((el) => { el.hidden = !ENABLED; });
    show("syncNotConfigured", !ENABLED);
    show("syncSignedOut", ENABLED && !session);
    show("syncSignedIn", ENABLED && !!session);
    if (!ENABLED) return;
    if (session) {
      $("syncEmail").textContent = (session.user && session.user.email) || "your account";
      let detail = `Last synced ${ago(meta.lastSyncAt)}.`;
      if (state === "offline") detail = "You're offline. Changes are saved on this device and will sync when you're back online.";
      $("syncDetail").textContent = detail;
      if (state === "error") setStatus(lastError, "error");
      else if (state === "ok") setStatus("", "");
    }
    renderPill();
  }

  // ---------------- wire up ----------------
  if (!ENABLED) { renderUI(); return; }

  saveListeners.push(() => {
    if (!session) return;
    changeCounter++;
    meta.dirty = true;
    saveMeta();
    renderPill();
    schedulePush();
  });

  $("syncPill").addEventListener("click", () => {
    $("syncCard").scrollIntoView({ behavior: "smooth", block: "center" });
    if (session) syncNow();
  });

  $("emailForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("emailInput").value.trim();
    if (!email) return;
    const btn = $("emailBtn");
    btn.disabled = true;
    setStatus("Sending…", "");
    try {
      await sendLink(email);
      pendingEmail = email;
      show("emailForm", false);
      show("codeForm", true);
      $("codeInput").focus();
      setStatus(`Check ${email}. Tap the link in the email, or type the code from it here.`, "ok");
    } catch (err) {
      setStatus(err.status === 429
        ? "Too many emails sent. Wait a little and try again."
        : `Couldn't send the email: ${err.message || "network error"}.`, "error");
    } finally {
      btn.disabled = false;
    }
  });

  $("codeForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = $("codeInput").value.replace(/\s+/g, "");
    if (!code || !pendingEmail) return;
    setStatus("Signing in…", "");
    try {
      await verifyCode(pendingEmail, code);
      $("codeInput").value = "";
      show("codeForm", false);
      show("emailForm", true);
      setStatus("Signed in. Syncing your plans…", "ok");
      renderUI();
      syncNow();
    } catch (err) {
      setStatus("That code didn't work. It may have expired, so request a new email.", "error");
    }
  });

  $("codeBack").addEventListener("click", () => {
    pendingEmail = "";
    show("codeForm", false);
    show("emailForm", true);
    setStatus("", "");
  });

  $("syncNowBtn").addEventListener("click", () => syncNow());
  $("signOutBtn").addEventListener("click", () => {
    if (confirm("Sign out on this device? Your plans stay here, but stop syncing until you sign in again.")) signOut();
  });

  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") syncNow(); });
  window.addEventListener("online", () => syncNow());
  window.addEventListener("offline", () => { state = "offline"; renderUI(); });
  setInterval(() => {
    if (document.visibilityState === "visible") syncNow();
    else renderUI();
  }, POLL_EVERY);

  (async () => {
    await handleRedirect();
    renderUI();
    if (session) syncNow();
  })();
})();
