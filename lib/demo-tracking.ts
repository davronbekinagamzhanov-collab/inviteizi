import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "./env";
import { almatyDay } from "./analytics";

/** Opaque authenticated encryption: URLs contain no readable Telegram identifiers. */
function key() {
  const secret = env.analyticsSecret();
  return secret && secret.length >= 32 ? createHash("sha256").update(secret).digest() : null;
}
export function demoToken(userId: number, template: string, now: Date): string | undefined {
  const k = key();
  if (!k) return;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", k, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify({ u: userId, t: template, exp: +now + 86_400_000 }), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}
export function verifyDemoToken(token: string, now: Date): { userId: number; template: string; key: string } | null {
  const k = key();
  if (!k || token.length > 500) return null;
  try {
    const bytes = Buffer.from(token, "base64url");
    if (bytes.length < 29) return null;
    const cipher = createDecipheriv("aes-256-gcm", k, bytes.subarray(0, 12));
    cipher.setAuthTag(bytes.subarray(12, 28));
    const v = JSON.parse(Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString("utf8"));
    if (!Number.isSafeInteger(v.u) || v.u <= 0 || typeof v.t !== "string" || !/^[a-z0-9-]{1,60}$/.test(v.t) || !Number.isFinite(v.exp) || v.exp <= +now || v.exp > +now + 86_400_000) return null;
    return { userId: v.u, template: v.t, key: `${v.t}:${almatyDay(now)}` };
  } catch { return null; }
}
