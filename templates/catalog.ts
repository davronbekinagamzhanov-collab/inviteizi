import type { Occasion } from "@/lib/types";

/**
 * ВИТРИНА — единственное место, где дизайн включается в продажу и задаётся порядок показа.
 *
 * - Дизайн продаётся (бот, Mini App, /catalog, проверка выбора на сервере), только если его id есть здесь.
 * - Порядок внутри тадбира = порядок в каталоге: первые строки клиент видит первыми.
 * - Цена не задаётся здесь: она всегда берётся из формата дизайна (PRICES в registry.ts).
 *   Отдельной VIP-цены нет — VIP продаются по цене своего формата.
 * - Убрать дизайн из продажи = удалить строку. Код, демо и уже созданные/оплаченные заказы при этом работают.
 * - После изменения списка запустить `npm run db:seed-templates`, чтобы таблица templates совпала с кодом.
 *
 * Список включаемых дизайнов и порядок задаёт владелец. Таблица всех дизайнов: docs/reviews/catalog-designs.md.
 */
export const ON_SALE: Record<Occasion, readonly string[]> = {
  // Никоҳ: 113, 114 и сильнейший 8 000 первыми, места 5–7 — «Пятна» (139–141)
  nikoh: [
    "muhr",
    "ipak",
    "gul-doira",
    "suzani-medalyon",
    "suvbuyoq-tuman",
    "suvbuyoq-zumrad",
    "suvbuyoq-upa",
    "nur-varaq",
    "girih-barg",
    "oq-maktub",
    "xotira-albom",
    "muhrli-maktub",
    "ipak-albom",
    "oltin-monogramma",
    "sapfir",
  ],
  sunnat: ["ganch-darvoza", "bog", "lola-medalyon", "lola-bodom", "doppi-kitob", "doppicha"],
  nahorgi: ["qozon-tongi", "tong-dasturxon", "non-albom", "tonggi-piyola", "tong-varaq", "choy-maktub"],
  // 06.11: два последних подняты наверх по просьбе владельца
  yubiley: ["umr-daraxti", "bordo-guldasta", "zarhal-lavha", "umr-kitobi", "hurmat-maktub", "pion-guldasta"],
};

/** Все id в продаже по порядку показа */
export const ON_SALE_IDS: readonly string[] = Object.values(ON_SALE).flat();
