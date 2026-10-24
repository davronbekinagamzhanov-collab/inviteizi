// Подключение бота к сайту: webhook и профиль бота на ўзбекском (по умолчанию) и русском.
// Запуск: node --env-file=.env.local scripts/telegram-setup.mjs [--check]
//   --check — только показать состояние webhook (без изменений).
// Токен и секрет берутся из .env.local и на экран не выводятся.
import "./ts-hooks.mjs";

const { uz } = await import("../texts/bot-uz.ts");
const { ru } = await import("../texts/bot-ru.ts");

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const BASE = (process.env.PUBLIC_BASE_URL ?? "https://inviteizi.vercel.app").replace(/\/+$/, "");
if (!TOKEN || !SECRET) throw new Error("Нет TELEGRAM_BOT_TOKEN или TELEGRAM_WEBHOOK_SECRET в .env.local");

async function api(method, body = {}) {
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!j.ok) throw new Error(`${method}: ${j.description}`);
  return j.result;
}

const me = await api("getMe");
console.log(`Бот: @${me.username}`);

if (!process.argv.includes("--check")) {
  // max_connections: 1 — обновления одного чата приходят по очереди (порядок ответов клиента сохраняется)
  await api("setWebhook", {
    url: `${BASE}/api/bot`,
    secret_token: SECRET,
    max_connections: 1,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });

  for (const [lang, tx] of [["", uz], ["uz", uz], ["ru", ru]]) {
    const language_code = lang || undefined;
    await api("setMyName", { name: tx.profile.name, language_code });
    await api("setMyShortDescription", { short_description: tx.profile.short, language_code });
    await api("setMyDescription", { description: tx.profile.description, language_code });
    await api("setMyCommands", {
      commands: Object.entries(tx.profile.commands).map(([command, description]) => ({ command, description })),
      ...(language_code ? { language_code } : {}),
    });
  }
  console.log("Профиль бота: uz (по умолчанию) и ru — готово");
}

const info = await api("getWebhookInfo");
console.log(
  `Webhook: ${info.url || "не задан"} · ожидают: ${info.pending_update_count} · соединений: ${info.max_connections ?? "-"}` +
    (info.last_error_message ? ` · последняя ошибка: ${info.last_error_message}` : ""),
);
