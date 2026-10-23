// Создаёт пароль для роли сервера (inviteizi_server), пишет его в .env.local
// и печатает ТОЛЬКО SCRAM-хеш для CREATE ROLE (сам пароль на экран не выводится).
// Запуск: node scripts/make-db-role-secret.mjs
import { randomBytes, pbkdf2Sync, createHmac, createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");
let password = /^DB_SERVER_PASSWORD=(.+)$/m.exec(env)?.[1];
if (!password) {
  password = randomBytes(24).toString("base64url");
  writeFileSync(".env.local", env.trimEnd() + `\n# Пароль роли inviteizi_server в Supabase (создан скриптом)\nDB_SERVER_PASSWORD=${password}\n`);
}
const salt = randomBytes(16);
const iter = 4096;
const salted = pbkdf2Sync(password, salt, iter, 32, "sha256");
const clientKey = createHmac("sha256", salted).update("Client Key").digest();
const storedKey = createHash("sha256").update(clientKey).digest();
const serverKey = createHmac("sha256", salted).update("Server Key").digest();
console.log(`SCRAM-SHA-256$${iter}:${salt.toString("base64")}$${storedKey.toString("base64")}:${serverKey.toString("base64")}`);
