// storage-gate: подписанные ссылки на загрузку и чтение файлов хранилища для сервера InviteIZI.
// Ключа service_role у сервера нет: он есть только здесь, внутри Supabase.
// Вызов: POST JSON {action: "signUpload" | "signRead", bucket, path, expiresIn?} + заголовок x-gate-secret.
// Сам секрет в коде не хранится — только его SHA-256 (печатает scripts/make-secrets.mjs).
// Деплой: verify_jwt = false (проверка по x-gate-secret).
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const GATE_SECRET_SHA256 = "b867d2fbfca497853eccacaed4c4f6461bf1a0b1b8fe8d581774d5ed7e41f40c";
const BUCKETS = new Set(["art", "previews", "music", "receipts", "deploy"]);
const PATH_RE = /^[A-Za-z0-9][A-Za-z0-9._\-/]{0,511}$/;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

async function sha256hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Сравнение без утечки по времени */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function serviceKey(): string {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
  return keys.default;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const secret = req.headers.get("x-gate-secret") ?? "";
  if (!secret || !safeEqual(await sha256hex(secret), GATE_SECRET_SHA256)) {
    return json(401, { error: "unauthorized" });
  }

  let body: { action?: string; bucket?: string; path?: string; expiresIn?: number };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "bad_json" });
  }
  const { action, bucket, path } = body;
  if (!bucket || !BUCKETS.has(bucket)) return json(400, { error: "bad_bucket" });
  if (typeof path !== "string" || !PATH_RE.test(path) || path.includes("..") || path.includes("//")) {
    return json(400, { error: "bad_path" });
  }

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (action === "signUpload") {
    const { data, error } = await sb.storage.from(bucket).createSignedUploadUrl(path, { upsert: true });
    if (error || !data) return json(502, { error: "storage", message: error?.message });
    return json(200, { signedUrl: data.signedUrl, token: data.token, path: data.path });
  }

  if (action === "signRead") {
    const seconds = Math.min(Math.max(Math.floor(Number(body.expiresIn) || 3600), 60), 7 * 24 * 3600);
    const { data, error } = await sb.storage.from(bucket).createSignedUrl(path, seconds);
    if (error || !data) return json(502, { error: "storage", message: error?.message });
    return json(200, { signedUrl: data.signedUrl });
  }

  return json(400, { error: "bad_action" });
});
