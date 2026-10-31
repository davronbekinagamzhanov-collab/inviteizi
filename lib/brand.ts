/** Публичное имя бота для ссылок со страниц приглашений (не секрет) */
export const BOT_USERNAME = "inviteizi_uz_bot";
export const botLink = (start: "badge" | "footer") => `https://t.me/${BOT_USERNAME}?start=${start}`;
