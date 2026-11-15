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
  // 15.11.2026 (владелец): сначала 9 VIP, затем прежние в прежнем порядке
  nikoh: [
    "vip-zarrin-ahd",
    "vip-marvarid",
    "vip-zarbof",
    "vip-bogi-visol",
    "vip-ipak-ziyosi",
    "vip-visol-nuri",
    "vip-tilla-muhr",
    "vip-osmon",
    "vip-suzana",
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
  sunnat: [
    "vip-oq-tulpor",
    "zarhal-duo",
    "moviy-ayvon",
    "tulpor-quvonchi",
    "kashta-tilagi",
    "ganch-darvoza",
    "bog",
    "lola-medalyon",
    "lola-bodom",
    "doppi-kitob",
    "doppicha",
  ],
  nahorgi: [
    "sahar-sabosi",
    "subhi-safo",
    "bog-nasimi",
    "tong-naqshi",
    "qozon-tongi",
    "tong-dasturxon",
    "non-albom",
    "tonggi-piyola",
    "tong-varaq",
    "choy-maktub",
  ],
  // 15.11.2026: новые первыми; дальше прежние (06.11 два последних подняты наверх)
  yubiley: [
    "vip-umr-ziyosi",
    "umr-durdonasi",
    "qadr-surati",
    "umr-daraxti",
    "bordo-guldasta",
    "zarhal-lavha",
    "umr-kitobi",
    "hurmat-maktub",
    "pion-guldasta",
  ],
};

/** Все id в продаже по порядку показа */
export const ON_SALE_IDS: readonly string[] = Object.values(ON_SALE).flat();
