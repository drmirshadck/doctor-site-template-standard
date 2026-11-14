// Makes the per-doctor secrets for the Cloudflare helper.
// Usage: node make-secrets.mjs <PIN>        (PIN = 4–8 digits chosen for the doctor)
// Prints values to paste into Cloudflare → Worker → Settings → Variables and Secrets (type: Secret).
// Nothing is saved to disk. CAL_API_KEY and DAILY_API_KEY come from the doctor's own accounts.
import { webcrypto as c } from "node:crypto";
const pin = process.argv[2] || "";
if (!/^\d{4,8}$/.test(pin)) { console.error("Give a 4–8 digit PIN: node make-secrets.mjs 482915"); process.exit(1); }
const hex = u => Buffer.from(u).toString("hex");
const b64u = u => Buffer.from(u).toString("base64url");
const rand = n => b64u(c.getRandomValues(new Uint8Array(n)));
const kp = await c.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const pub = new Uint8Array(await c.subtle.exportKey("raw", kp.publicKey));
const jwk = await c.subtle.exportKey("jwk", kp.privateKey);
const out = {
  PIN_HASH: hex(await c.subtle.digest("SHA-256", new TextEncoder().encode("dotcom-pin:" + pin))),
  SESSION_SECRET: rand(32),
  CAL_WEBHOOK_SECRET: rand(24),
  VAPID_PUBLIC_KEY: b64u(pub),
  VAPID_PRIVATE_JWK: JSON.stringify({ kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, d: jwk.d })
};
if (process.argv.includes("--json")) console.log(JSON.stringify(out));
else for (const [k, v] of Object.entries(out)) console.log(`${k}\n${v}\n`);
