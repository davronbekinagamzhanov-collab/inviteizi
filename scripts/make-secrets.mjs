// Создаёт секреты, которых ещё нет в .env.local: STORAGE_GATE_SECRET, TELEGRAM_WEBHOOK_SECRET.
// Сами секреты на экран НЕ выводятся. Печатается только SHA-256 от STORAGE_GATE_SECRET —
// его вставляют в supabase/functions/storage-gate/index.ts (GATE_SECRET_SHA256).
// Те же значения нужно добавить в настройки Vercel (Environment Variables).
// Запуск: node scripts/make-secrets.mjs
import { createHash, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const FILE = ".env.local";
let env = readFileSync(FILE, "utf8");
const get = (name) => new RegExp(`^${name}=(.+)$`, "m").exec(env)?.[1]?.trim();

const added = [];
function ensure(name, comment, make) {
  if (get(name)) return;
  env = env.trimEnd() + `\n# ${comment}\n${name}=${make()}\n`;
  added.push(name);
}

ensure("STORAGE_GATE_SECRET", "Ключ к edge-функции storage-gate (создан scripts/make-secrets.mjs)", () =>
  randomBytes(32).toString("base64url"),
);
// Telegram: 1–256 символов A-Z a-z 0-9 _ -
ensure("TELEGRAM_WEBHOOK_SECRET", "Секрет вебхука Telegram (создан scripts/make-secrets.mjs)", () =>
  randomBytes(32).toString("base64url"),
);

if (added.length) writeFileSync(FILE, env);
console.log(added.length ? `Добавлены в ${FILE}: ${added.join(", ")}` : "Все секреты уже есть");
console.log(`GATE_SECRET_SHA256 = ${createHash("sha256").update(get("STORAGE_GATE_SECRET")).digest("hex")}`);
