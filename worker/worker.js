/* DotCom by Arshees — doctor helper (Cloudflare Worker), Standard package.
 *
 * Keeps the doctor's Cal.com and Daily keys secret and powers doctor.html:
 *   POST /login         {pin}            -> {token}
 *   GET  /bookings      (auth)           -> {pending:[], upcoming:[]}
 *   POST /confirm       (auth) {uid}
 *   POST /decline       (auth) {uid, reason}
 *   POST /host-token    (auth)           -> {token, roomUrl}
 *   GET  /vapid                          -> {key}
 *   POST /subscribe     (auth) {subscription}
 *   POST /cal-webhook   (Cal.com, signed)
 *   GET  /last-event                     -> {type, at}   (no patient details)
 *   GET  /health
 *
 * Secrets (Cloudflare → Worker → Settings → Variables and Secrets):
 *   CAL_API_KEY, DAILY_API_KEY, PIN_HASH, SESSION_SECRET, CAL_WEBHOOK_SECRET,
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_JWK
 * Plain variables:
 *   DAILY_ROOM_URL  e.g. https://drsample.daily.co/consult
 *   ALLOWED_ORIGINS e.g. https://drsample.com,https://www.drsample.com
 *   DOCTOR_NAME, VAPID_SUBJECT (mailto:support@arshees.com)
 * KV binding: PUSH
 *
 * No patient data is stored. Bookings are read live from Cal.com and passed through.
 * The only stored items are the doctor's push subscriptions and the type/time of the last event.
 */

const CAL = "https://api.cal.com/v2";
const CAL_VERSION = "2024-08-13";
const enc = new TextEncoder();

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = corsHeaders(req, env);
    if (req.method === "OPTIONS") return new Response(null, { status: cors ? 204 : 403, headers: cors || {} });
    try {
      const r = await route(req, env, url, !!cors);
      if (cors) for (const [k, v] of Object.entries(cors)) r.headers.set(k, v);
      return r;
    } catch (e) {
      const r = json({ error: e.publicMessage || "Something went wrong. Please try again." }, e.status || 500);
      if (cors) for (const [k, v] of Object.entries(cors)) r.headers.set(k, v);
      return r;
    }
  }
};

async function route(req, env, url, fromSite) {
  const p = url.pathname.replace(/\/+$/, "") || "/";
  const M = req.method;

  if (p === "/health") return json({ ok: true });
  if (p === "/cal-webhook" && M === "POST") return calWebhook(req, env);
  if (p === "/vapid" && M === "GET") return json({ key: env.VAPID_PUBLIC_KEY || "" });
  if (p === "/last-event" && M === "GET") return json((await env.PUSH.get("lastEvent", "json")) || {});

  // everything below is for the doctor's own website only
  if (!fromSite) throw err(403, "Not allowed.");
  if (p === "/login" && M === "POST") return login(req, env);

  await requireSession(req, env);
  if (p === "/bookings" && M === "GET") return bookings(env);
  if (p === "/confirm" && M === "POST") {
    const { uid } = await body(req);
    await cal(env, `/bookings/${encodeURIComponent(needUid(uid))}/confirm`, { method: "POST" });
    return json({ ok: true });
  }
  if (p === "/decline" && M === "POST") {
    const { uid, reason } = await body(req);
    await cal(env, `/bookings/${encodeURIComponent(needUid(uid))}/decline`, {
      method: "POST", body: JSON.stringify({ reason: String(reason || "The doctor is not available at this time.").slice(0, 300) })
    });
    return json({ ok: true });
  }
  if (p === "/host-token" && M === "POST") return hostToken(env);
  if (p === "/subscribe" && M === "POST") {
    const { subscription } = await body(req);
    if (!subscription || !/^https:\/\//.test(subscription.endpoint || "")) throw err(400, "Invalid subscription.");
    const subs = ((await env.PUSH.get("subs", "json")) || []).filter(s => s.endpoint !== subscription.endpoint);
    subs.push({ endpoint: subscription.endpoint, at: Date.now() });
    await env.PUSH.put("subs", JSON.stringify(subs.slice(-10)));
    return json({ ok: true });
  }
  throw err(404, "Not found.");
}

/* ---------- auth ---------- */
async function login(req, env) {
  const ip = req.headers.get("cf-connecting-ip") || "x";
  const key = "fail:" + ip;
  const fails = +((await env.PUSH.get(key)) || 0);
  if (fails >= 8) throw err(429, "Too many wrong attempts. Try again in 15 minutes.");
  const { pin } = await body(req);
  const ok = /^\d{4,8}$/.test(String(pin || "")) && safeEq(await sha256hex("dotcom-pin:" + pin), String(env.PIN_HASH || "").toLowerCase());
  if (!ok) {
    await env.PUSH.put(key, String(fails + 1), { expirationTtl: 900 });
    throw err(401, "Wrong PIN.");
  }
  const exp = Date.now() + 30 * 24 * 3600 * 1000;
  const payload = b64url(enc.encode(JSON.stringify({ exp })));
  return json({ token: payload + "." + await hmacB64(env.SESSION_SECRET, payload), exp });
}
async function requireSession(req, env) {
  const t = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const [payload, sig] = t.split(".");
  if (!payload || !sig || !safeEq(sig, await hmacB64(env.SESSION_SECRET, payload))) throw err(401, "Please log in again.");
  let exp = 0; try { exp = JSON.parse(new TextDecoder().decode(unb64url(payload))).exp; } catch (e) {}
  if (!(exp > Date.now())) throw err(401, "Please log in again.");
}

/* ---------- Cal.com ---------- */
async function cal(env, path, init = {}) {
  const r = await fetch(CAL + path, {
    ...init,
    headers: { "Authorization": `Bearer ${env.CAL_API_KEY}`, "cal-api-version": CAL_VERSION, "Content-Type": "application/json" }
  });
  const data = await r.json().catch(() => ({}));
  if (r.status === 401 || r.status === 403) throw err(502, "Your booking calendar is not connected. Please contact DotCom support (support@arshees.com).");
  if (!r.ok) throw err(502, (data && data.error && data.error.message) || "Cal.com did not accept the request. Please try again.");
  return data;
}
async function bookings(env) {
  const [pend, up] = await Promise.all([
    cal(env, "/bookings?status=unconfirmed&sortStart=asc&take=50"),
    cal(env, "/bookings?status=upcoming&sortStart=asc&take=50")
  ]);
  const list = d => (Array.isArray(d.data) ? d.data : []).map(slim);
  const pending = list(pend);
  const pendingUids = new Set(pending.map(b => b.uid));
  return json({ pending, upcoming: list(up).filter(b => !pendingUids.has(b.uid) && b.status !== "pending") });
}
function slim(b) {
  const a = (b.attendees && b.attendees[0]) || {};
  const f = b.bookingFieldsResponses || b.responses || {};
  const phone = f.whatsapp || f.WhatsApp || f.phone || f.attendeePhoneNumber || a.phoneNumber || "";
  const notes = typeof f.notes === "string" ? f.notes : (b.description || "");
  return {
    uid: b.uid,
    status: String(b.status || "").toLowerCase(),
    title: (b.eventType && (b.eventType.title || b.eventType.slug)) || b.title || "Consultation",
    start: b.start || b.startTime, end: b.end || b.endTime,
    name: a.name || f.name || "Patient",
    email: a.email || f.email || "",
    phone: String(typeof phone === "object" ? (phone.value || "") : phone),
    notes: String(notes || "").slice(0, 500)
  };
}

/* ---------- Daily host token ---------- */
async function hostToken(env) {
  const roomUrl = env.DAILY_ROOM_URL || "";
  const room = roomUrl.split("/").filter(Boolean).pop();
  if (!room) throw err(500, "Video room is not set up yet.");
  const r = await fetch("https://api.daily.co/v1/meeting-tokens", {
    method: "POST",
    headers: { "Authorization": `Bearer ${env.DAILY_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ properties: { room_name: room, is_owner: true, user_name: env.DOCTOR_NAME || "Doctor", exp: Math.floor(Date.now() / 1000) + 6 * 3600 } })
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.token) throw err(502, "Could not open the video room. Please try again.");
  return json({ token: d.token, roomUrl });
}

/* ---------- Cal.com webhook -> phone notification ---------- */
async function calWebhook(req, env) {
  const raw = await req.text();
  const sig = (req.headers.get("x-cal-signature-256") || "").toLowerCase();
  const expect = await hmacHex(env.CAL_WEBHOOK_SECRET, raw);
  if (!env.CAL_WEBHOOK_SECRET || !safeEq(sig, expect)) return json({ error: "bad signature" }, 401);
  let ev = {}; try { ev = JSON.parse(raw); } catch (e) {}
  const type = String(ev.triggerEvent || "");
  if (type === "PING") return json({ ok: true });
  const known = { BOOKING_REQUESTED: "request", BOOKING_CREATED: "created", BOOKING_CANCELLED: "cancelled", BOOKING_RESCHEDULED: "rescheduled" };
  if (!known[type]) return json({ ok: true, ignored: type });
  await env.PUSH.put("lastEvent", JSON.stringify({ type: known[type], at: Date.now() }));
  const sent = await pushAll(env);
  return json({ ok: true, sent });
}
async function pushAll(env) {
  const subs = (await env.PUSH.get("subs", "json")) || [];
  if (!subs.length || !env.VAPID_PRIVATE_JWK) return 0;
  const keep = []; let sent = 0;
  for (const s of subs) {
    try {
      const r = await sendPush(env, s.endpoint);
      if (r.status === 404 || r.status === 410) continue;   // phone unsubscribed
      if (r.ok) sent++;
      keep.push(s);
    } catch (e) { keep.push(s); }
  }
  await env.PUSH.put("subs", JSON.stringify(keep));
  return sent;
}
/* Web Push with no payload (no encryption needed). The service worker shows the message. */
async function sendPush(env, endpoint) {
  const aud = new URL(endpoint).origin;
  const jwt = await vapidJWT(env, aud);
  return fetch(endpoint, {
    method: "POST",
    headers: { "TTL": "86400", "Urgency": "high", "Content-Length": "0", "Authorization": `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}` }
  });
}
async function vapidJWT(env, aud) {
  const jwk = JSON.parse(env.VAPID_PRIVATE_JWK);
  const key = await crypto.subtle.importKey("jwk", { ...jwk, ext: true }, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const h = b64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const p = b64url(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT || "mailto:support@arshees.com" })));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(h + "." + p));
  return h + "." + p + "." + b64url(new Uint8Array(sig));
}

/* ---------- helpers ---------- */
function corsHeaders(req, env) {
  const o = req.headers.get("origin") || "";
  const allowed = String(env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  if (!o || !allowed.includes(o)) return null;
  return { "Access-Control-Allow-Origin": o, "Vary": "Origin", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type,Authorization", "Access-Control-Max-Age": "86400" };
}
function json(o, status = 200) { return new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }); }
function err(status, msg) { const e = new Error(msg); e.status = status; e.publicMessage = msg; return e; }
async function body(req) { try { return await req.json(); } catch (e) { throw err(400, "Bad request."); } }
function needUid(u) { if (!/^[A-Za-z0-9_-]{6,80}$/.test(String(u || ""))) throw err(400, "Bad booking id."); return u; }
function safeEq(a, b) { a = String(a); b = String(b); if (a.length !== b.length || !a.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }
function b64url(u8) { let s = ""; for (const c of u8) s += String.fromCharCode(c); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function unb64url(s) { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); }
async function sha256hex(s) { return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s)))); }
function hex(u8) { return [...u8].map(b => b.toString(16).padStart(2, "0")).join(""); }
async function hmacKey(secret) { return crypto.subtle.importKey("raw", enc.encode(String(secret || "")), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); }
async function hmacB64(secret, msg) { return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(msg)))); }
async function hmacHex(secret, msg) { return hex(new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(msg)))); }
