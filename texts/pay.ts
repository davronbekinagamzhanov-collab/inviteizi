/**
 * Оплата без чека (17.11.2026): «✅ Тўладим» + имя в Kaspi — основной способ; чек — по желанию.
 * Тексты бота и Mini App на узбекском (кириллица), русском и казахском.
 */
const uz = {
  title: "💳 Тўлов",
  amount: "Тўланадиган сумма",
  kaspi: "Kaspi рақам",
  how: "Kaspi → Ўтказмалар → Телефон рақами бўйича",
  note: (n: number) => `Изоҳга: №${n}`,
  info: (amount: string, phone: string, name: string, n: number) =>
    `💳 Тўланадиган сумма: ${amount}\n📱 Kaspi: ${phone} (${name})\n\nKaspi → Ўтказмалар → Телефон рақами бўйича\nИзоҳга: №${n}\n\nТўлагач, «✅ Тўладим» тугмасини босинг.`,
  copyPhone: "📋 Рақамни нусхалаш",
  copyAmount: "📋 Суммани нусхалаш",
  paid: "✅ Тўладим",
  receiptOptional: "📎 Чек юбориш (ихтиёрий)",
  receiptHint: "Чекни юбориш: Kaspi → чек → Улашиш → Telegram → InviteIZI бот",
  askName: "Kaspi'да кўринган исмингизни ёзинг (масалан: Давронбек И.)",
  namePlaceholder: "Давронбек И.",
  send: "Юбориш",
  nameBad: "Исмни 2–40 та белги билан ёзинг (масалан: Давронбек И.)",
  checking: "⏳ Тўловингиз текширилмоқда, ҳавола тез орада келади.",
  checkingNight: "⏳ Тўловингиз текширилмоқда. Ҳавола эрталаб келади.",
  tooOften: "Жуда кўп уриниш. Бир соатдан кейин қайта босинг.",
  receiptAttached: "📎 Чек қабул қилинди, раҳмат!",
  adminLine: (n: number, amount: string, name: string, time: string) => `💳 №${n} · ${amount} · ${name} · ${time}`,
  adminReceipt: (n: number) => `📎 №${n} учун чек (ихтиёрий)`,
};

const ru: typeof uz = {
  title: "💳 Оплата",
  amount: "Сумма к оплате",
  kaspi: "Номер Kaspi",
  how: "Kaspi → Переводы → По номеру телефона",
  note: (n) => `В комментарий: №${n}`,
  info: (amount, phone, name, n) =>
    `💳 Сумма к оплате: ${amount}\n📱 Kaspi: ${phone} (${name})\n\nKaspi → Переводы → По номеру телефона\nВ комментарий: №${n}\n\nПосле оплаты нажмите «✅ Оплатил».`,
  copyPhone: "📋 Копировать номер",
  copyAmount: "📋 Копировать сумму",
  paid: "✅ Оплатил",
  receiptOptional: "📎 Отправить чек (по желанию)",
  receiptHint: "Отправить чек: Kaspi → чек → Поделиться → Telegram → бот InviteIZI",
  askName: "Напишите имя, как оно видно в Kaspi (например: Давронбек И.)",
  namePlaceholder: "Давронбек И.",
  send: "Отправить",
  nameBad: "Имя — от 2 до 40 символов (например: Давронбек И.)",
  checking: "⏳ Оплата проверяется, ссылка скоро придёт.",
  checkingNight: "⏳ Оплата проверяется. Ссылка придёт утром.",
  tooOften: "Слишком много попыток. Нажмите снова через час.",
  receiptAttached: "📎 Чек принят, спасибо!",
  adminLine: (n, amount, name, time) => `💳 №${n} · ${amount} · от ${name} · ${time}`,
  adminReceipt: (n) => `📎 Чек к №${n} (по желанию)`,
};

const kk: typeof uz = {
  ...ru,
  title: "💳 Төлем",
  amount: "Төленетін сома",
  kaspi: "Kaspi нөмірі",
  how: "Kaspi → Аударымдар → Телефон нөмірі бойынша",
  note: (n) => `Түсініктемеге: №${n}`,
  info: (amount, phone, name, n) =>
    `💳 Төленетін сома: ${amount}\n📱 Kaspi: ${phone} (${name})\n\nKaspi → Аударымдар → Телефон нөмірі бойынша\nТүсініктемеге: №${n}\n\nТөлегеннен кейін «✅ Төледім» басыңыз.`,
  copyPhone: "📋 Нөмірді көшіру",
  copyAmount: "📋 Соманы көшіру",
  paid: "✅ Төледім",
  receiptOptional: "📎 Чек жіберу (қаласаңыз)",
  receiptHint: "Чекті жіберу: Kaspi → чек → Бөлісу → Telegram → InviteIZI бот",
  askName: "Kaspi-де көрінетін атыңызды жазыңыз (мысалы: Давронбек И.)",
  send: "Жіберу",
  nameBad: "Аты 2–40 таңбадан тұрсын (мысалы: Давронбек И.)",
  checking: "⏳ Төлеміңіз тексерілуде, сілтеме жақында келеді.",
  checkingNight: "⏳ Төлеміңіз тексерілуде. Сілтеме таңертең келеді.",
  tooOften: "Тым көп әрекет. Бір сағаттан кейін қайта басыңыз.",
  receiptAttached: "📎 Чек қабылданды, рақмет!",
};

export const payTexts = { uz, ru, kk };
export const payCopy = (lang: string | null | undefined) =>
  payTexts[lang === "ru" ? "ru" : lang === "kk" ? "kk" : "uz"];

/** Имя плательщика: 2–40 символов после обрезки пробелов, без переносов строк */
export function cleanPayerName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.replace(/\s+/g, " ").trim();
  return v.length >= 2 && v.length <= 40 ? v : null;
}
