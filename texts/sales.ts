/**
 * Тексты акций, промокода и оптовой цены (17.11.2026) — бот, Mini App, каталог. Узбекский (кириллица), русский, казахский.
 * Даты — «20.11», суммы приходят уже отформатированными («4 000 ₸»).
 */
export type SalesLang = "uz" | "ru" | "kk";

/** Зачёркнутая цена для чата Telegram (бот пишет без разметки): каждый символ с U+0336 */
export const strike = (s: string) => [...s].map((ch) => (ch === " " ? " " : ch + "̶")).join("");

const uz = {
  // Рассылка об акции (17.11.2026)
  bcLast: "⏰ Охирги кун!",
  bcLeft: (d: number, h: number) =>
    d > 0 ? `Акция тугашига ${d} кун ${h} соат қолди` : `Акция тугашига ${h} соат қолди`,
  bcFormats: { animated: "Анимацияли", scroll: "Варақланадиган", simple: "Оддий" } as Record<string, string>,
  bcChoose: "🎉 Танлаш",
  bcOff: "🔕 Хабарларни ўчириш",
  bcOffDone: "Хабарлар ўчирилди. Акциялар ҳақида бошқа ёзмаймиз.",
  free: "БЕПУЛ",
  off: (p: number) => `−${p} %`,
  saving: (x: string) => `Тежайсиз ${x}`,
  timer: (d: number, h: number, m: number) =>
    d > 0
      ? `Акция тугашига ${d} кун ${h} соат`
      : h > 0
        ? `Акция тугашига ${h} соат ${m} дақиқа`
        : `Акция тугашига ${m} дақиқа`,
  promotionLine: (name: string, p: number, date: string) =>
    `🎉 «${name}» акцияси: ${p >= 100 ? "бепул" : `−${p} %`} · ${date} гача`,
  promoLine: (code: string, p: number) => `🎟 Промокод ${code}: −${p} %`,
  wholesaleLine: (p: number) => `🏷 Улгуржи нарх: −${p} %`,
  priceLine: (now: string, before: string) => `💳 ${now}  ${strike(before)}`,
  priceChanged: (x: string) => `ℹ️ Акция тугади — нарх янгиланди: ${x}. Текшириб, қайта тасдиқланг.`,
  freeIssued: "🎉 Акция бўйича бепул — таклифномангиз тайёр!",
  freeAction: "🎁 Бепул олиш",
  promoButton: "🎟 Промокод",
  promoHave: "Промокод борми?",
  promoAsk: "Промокодни ёзинг (масалан, TOY10):",
  promoApply: "Қўллаш",
  promoPlaceholder: "Промокод",
  promoApplied: (code: string, p: number, x: string) => `✅ Промокод ${code}: −${p} %. Янги нарх: ${x}`,
  promoErrors: {
    promo_unavailable: "Бундай промокод йўқ ёки муддати тугаган.",
    promo_exhausted: "Бу промокод тугаган — лимит тўлган.",
    promo_already_reserved: "Бу буюртмада бошқа промокод бор.",
    notForYou: "Промокод сизнинг ҳисобингиз учун эмас (ҳамкор, менежер ёки улгуржи харидор).",
    better: "Ҳозирги акция чегирмаси катта — промокод керак эмас.",
    disabled: "Промокодлар ҳозирча ёқилмаган.",
    order_locked: "Бу буюртмага промокод қўллаб бўлмайди.",
    rateLimit: "Жуда тез. Бир дақиқадан кейин уриниб кўринг.",
  },
  startLine: (name: string, p: number, date: string) =>
    `🎉 Акция «${name}»: ${p >= 100 ? "таклифнома бепул" : `барча дизайнларга −${p} %`} · ${date} гача`,
};

const ru: typeof uz = {
  bcLast: "⏰ Последний день!",
  bcLeft: (d, h) => (d > 0 ? `До конца акции ${d} дн ${h} ч` : `До конца акции ${h} ч`),
  bcFormats: { animated: "Анимация", scroll: "Листаемое", simple: "Простое" },
  bcChoose: "🎉 Выбрать",
  bcOff: "🔕 Отключить сообщения",
  bcOffDone: "Сообщения отключены. Больше не пишем об акциях.",
  free: "БЕСПЛАТНО",
  off: (p) => `−${p} %`,
  saving: (x) => `Экономия ${x}`,
  timer: (d, h, m) =>
    d > 0 ? `До конца акции ${d} дн ${h} ч` : h > 0 ? `До конца акции ${h} ч ${m} мин` : `До конца акции ${m} мин`,
  promotionLine: (name, p, date) => `🎉 Акция «${name}»: ${p >= 100 ? "бесплатно" : `−${p} %`} до ${date}`,
  promoLine: (code, p) => `🎟 Промокод ${code}: −${p} %`,
  wholesaleLine: (p) => `🏷 Оптовая цена: −${p} %`,
  priceLine: (now, before) => `💳 ${now}  ${strike(before)}`,
  priceChanged: (x) => `ℹ️ Акция закончилась — цена обновилась: ${x}. Проверьте и подтвердите снова.`,
  freeIssued: "🎉 Бесплатно по акции — приглашение готово!",
  freeAction: "🎁 Получить бесплатно",
  promoButton: "🎟 Промокод",
  promoHave: "Есть промокод?",
  promoAsk: "Напишите промокод (например, TOY10):",
  promoApply: "Применить",
  promoPlaceholder: "Промокод",
  promoApplied: (code, p, x) => `✅ Промокод ${code}: −${p} %. Новая цена: ${x}`,
  promoErrors: {
    promo_unavailable: "Такого промокода нет или срок истёк.",
    promo_exhausted: "Промокод закончился — лимит исчерпан.",
    promo_already_reserved: "К этому заказу уже применён другой промокод.",
    notForYou: "Промокод не для вашего аккаунта (партнёр, менеджер или оптовик).",
    better: "Скидка по акции больше — промокод не нужен.",
    disabled: "Промокоды пока не включены.",
    order_locked: "К этому заказу промокод применить нельзя.",
    rateLimit: "Слишком часто. Попробуйте через минуту.",
  },
  startLine: (name, p, date) =>
    `🎉 Акция «${name}»: ${p >= 100 ? "приглашение бесплатно" : `−${p} % на все дизайны`} до ${date}`,
};

const kk: typeof uz = {
  ...ru,
  bcLast: "⏰ Соңғы күн!",
  bcLeft: (d, h) => (d > 0 ? `Акция аяқталуына ${d} күн ${h} сағ қалды` : `Акция аяқталуына ${h} сағ қалды`),
  bcFormats: { animated: "Анимациялы", scroll: "Парақталатын", simple: "Қарапайым" },
  bcChoose: "🎉 Таңдау",
  bcOff: "🔕 Хабарламаларды өшіру",
  bcOffDone: "Хабарламалар өшірілді. Акциялар туралы бұдан былай жазбаймыз.",
  free: "ТЕГІН",
  saving: (x) => `Үнемдеу ${x}`,
  timer: (d, h, m) =>
    d > 0
      ? `Акция аяқталуына ${d} күн ${h} сағ`
      : h > 0
        ? `Акция аяқталуына ${h} сағ ${m} мин`
        : `Акция аяқталуына ${m} мин`,
  promotionLine: (name, p, date) => `🎉 «${name}» акциясы: ${p >= 100 ? "тегін" : `−${p} %`} · ${date} дейін`,
  freeIssued: "🎉 Акция бойынша тегін — шақыру дайын!",
  freeAction: "🎁 Тегін алу",
  promoHave: "Промокод бар ма?",
  promoAsk: "Промокодты жазыңыз (мысалы, TOY10):",
  promoApply: "Қолдану",
  promoApplied: (code, p, x) => `✅ Промокод ${code}: −${p} %. Жаңа баға: ${x}`,
  priceChanged: (x) => `ℹ️ Акция аяқталды — баға жаңартылды: ${x}. Тексеріп, қайта растаңыз.`,
};

export const salesTexts = { uz, ru, kk };
export const salesCopy = (lang: string | null | undefined) =>
  salesTexts[lang === "ru" ? "ru" : lang === "kk" ? "kk" : "uz"];

/** «20.11» по Алматы (UTC+5) */
export const shortDate = (iso: string) => {
  const d = new Date(+new Date(iso) + 5 * 3_600_000).toISOString();
  return `${d.slice(8, 10)}.${d.slice(5, 7)}`;
};
