// Подключение бота к сайту: webhook и профиль бота на ўзбекском (по умолчанию) и русском.
// Запуск: node --env-file=.env.local scripts/telegram-setup.mjs [--check]
//   --check — только показать состояние webhook (без изменений).
//   --menu — только кнопка меню «✨ Очиш» (Mini App) для всех чатов.
// Токен и секрет берутся из .env.local и на экран не выводятся.
import "./ts-hooks.mjs";

const { uz } = await import("../texts/bot-uz.ts");
const { ru } = await import("../texts/bot-ru.ts");
const { kk } = await import("../texts/bot-kk.ts");
// Казахский профиль и команды — только при KAZAKH_ENABLED=true
const KK = (process.env.KAZAKH_ENABLED ?? "").toLowerCase() === "true" ? [["kk", kk]] : [];

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

// --menu — только кнопка меню у поля ввода для всех чатов (v2): «✨ Очиш» открывает приложение /app.
//          При MINI_APP_ENABLED=false — обычная кнопка «Меню» (команды). Webhook и профиль не меняются.
if (process.argv.includes("--menu")) {
  const on = (process.env.MINI_APP_ENABLED ?? "").toLowerCase() !== "false";
  await api("setChatMenuButton", on ? { menu_button: { type: "web_app", text: uz.menuButton, web_app: { url: `${BASE}/app` } } } : { menu_button: { type: "commands" } });
  console.log(on ? `Кнопка меню: «${uz.menuButton}» → ${BASE}/app` : "Кнопка меню: команды (приложение выключено)");
  process.exit(0);
}

// --commands — только меню команд: у всех клиентов и у ADMIN_IDS (webhook и профиль не меняются)
// --admin-commands — то же только для ADMIN_IDS
const allCommands = process.argv.includes("--commands");
if (allCommands) {
  for (const [lang, tx] of [["uz", uz], ["ru", ru], ...KK, ["", uz]]) {
    await api("setMyCommands", {
      commands: Object.entries(tx.profile.commands).map(([command, description]) => ({ command, description })),
      ...(lang ? { language_code: lang } : {}),
    });
  }
  console.log("Меню команд клиентов обновлено");
}
if (allCommands || process.argv.includes("--admin-commands")) {
  const ids = (process.env.ADMIN_IDS ?? "").split(",").map((s) => Number(s.trim())).filter((n) => Number.isSafeInteger(n) && n > 0);
  for (const chat_id of ids) {
    for (const [lang, tx] of [["uz", uz], ["ru", ru], ["", uz]]) {
      await api("setMyCommands", {
        commands: Object.entries({ ...tx.profile.commands, ...tx.profile.adminCommands }).map(([command, description]) => ({ command, description })),
        scope: { type: "chat", chat_id },
        ...(lang ? { language_code: lang } : {}),
      });
    }
  }
  console.log(`Меню команд обновлено у админов: ${ids.length}`);
  process.exit(0);
}

if (!process.argv.includes("--check")) {
  // max_connections: 1 — обновления одного чата приходят по очереди (порядок ответов клиента сохраняется)
  await api("setWebhook", {
    url: `${BASE}/api/bot`,
    secret_token: SECRET,
    max_connections: 1,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });

  for (const [lang, tx] of [["", uz], ["uz", uz], ["ru", ru], ...KK]) {
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
