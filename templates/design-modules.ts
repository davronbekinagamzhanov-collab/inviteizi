import type { Design, DesignModule } from "./registry";
import type { InvitationData } from "@/lib/types";
import { usesLegacyDesign } from "./design-version";

/**
 * Код дизайнов — отдельно от реестра: templates/registry.ts содержит только данные, поэтому серверные
 * модули (бот, отчёты, страницы) не тянут за собой CSS и шрифты всех дизайнов.
 * Здесь — для тестов, превью в Mini App и скриптов. Страницы приглашений берут DesignView из design-loaders.tsx
 * (генерируется отсюда: node scripts/gen-design-loaders.mjs).
 */
type Loader = () => Promise<DesignModule>;

export const DESIGN_MODULES: Record<string, Loader> = {
  "umr-durdonasi": () => import("./themes/umr-durdonasi/Design"),
  "qadr-surati": () => import("./themes/qadr-surati/Design"),
  "zarhal-duo": () => import("./themes/zarhal-duo/Design"),
  "moviy-ayvon": () => import("./themes/moviy-ayvon/Design"),
  "tulpor-quvonchi": () => import("./themes/tulpor-quvonchi/Design"),
  "kashta-tilagi": () => import("./themes/kashta-tilagi/Design"),
  "bog-nasimi": () => import("./themes/bog-nasimi/Design"),
  "tong-naqshi": () => import("./themes/tong-naqshi/Design"),
  "sahar-sabosi": () => import("./themes/sahar-sabosi/Design"),
  "subhi-safo": () => import("./themes/subhi-safo/Design"),
  "vip-ipak-ziyosi": () => import("./themes/vip-ipak-ziyosi/Design"),
  "vip-zarbof": () => import("./themes/vip-zarbof/Design"),
  "vip-visol-nuri": () => import("./themes/vip-visol-nuri/Design"),
  "vip-zarrin-ahd": () => import("./themes/vip-zarrin-ahd/Design"),
  "vip-marvarid": () => import("./themes/vip-marvarid/Design"),
  "vip-bogi-visol": () => import("./themes/vip-bogi-visol/Design"),
  "vip-oq-tulpor": () => import("./themes/vip-oq-tulpor/Design"),
  "vip-umr-ziyosi": () => import("./themes/vip-umr-ziyosi/Design"),
  "vip-suzana": () => import("./themes/vip-suzana/Design"),
  "vip-osmon": () => import("./themes/vip-osmon/Design"),
  "vip-tilla-muhr": () => import("./themes/vip-tilla-muhr/Design"),
  "ganch-peshtoq": () => import("./themes/ganch-peshtoq/Design"),
  "zarhal-eshik": () => import("./themes/zarhal-eshik/Design"),
  "atlas-tolqin": () => import("./themes/atlas-tolqin/Design"),
  "anor-bogi": () => import("./themes/anor-bogi/Design"),
  "bodom-guli": () => import("./themes/bodom-guli/Design"),
  "samarqand-kitob": () => import("./themes/samarqand-kitob/Design"),
  "ipak-romol": () => import("./themes/ipak-romol/Design"),
  "rishton-koshin": () => import("./themes/rishton-koshin/Design"),
  atirgul: () => import("./themes/atirgul/Design"),
  "shohona-baxmal": () => import("./themes/shohona-baxmal/Design"),
  "tandir-nuri": () => import("./themes/tandir-nuri/Design"),
  dasturxon: () => import("./themes/dasturxon/Design"),
  "non-muhr": () => import("./themes/non-muhr/Design"),
  "tonggi-choy": () => import("./themes/tonggi-choy/Design"),
  "paxta-gul": () => import("./themes/paxta-gul/Design"),
  "oltin-ot": () => import("./themes/oltin-ot/Design"),
  "oq-chinni": () => import("./themes/oq-chinni/Design"),
  doppicha: () => import("./themes/doppicha/Design"),
  "sayram-hovli": () => import("./themes/sayram-hovli/Design"),
  zarvaraq: () => import("./themes/zarvaraq/Design"),
  "umr-daraxti": () => import("./themes/umr-daraxti/Design"),
  "marvarid-satr": () => import("./themes/marvarid-satr/Design"),
  "gulbog-sahifa": () => import("./themes/gulbog-sahifa/Design"),
  "suzani-yol": () => import("./themes/suzani-yol/Design"),
  "bugdoy-boshoq": () => import("./themes/bugdoy-boshoq/Design"),
  "lola-ehtirom": () => import("./themes/lola-ehtirom/Design"),
  "zarhal-lavha": () => import("./themes/zarhal-lavha/Design"),
  "adras-nishon": () => import("./themes/adras-nishon/Design"),
  "mis-kafgir": () => import("./themes/mis-kafgir/Design"),
  "rayhon-sahari": () => import("./themes/rayhon-sahari/Design"),
  "visol-rishta": () => import("./themes/visol-rishta/Design"),
  "uzum-hovli": () => import("./themes/uzum-hovli/Design"),
  "sopol-navo": () => import("./themes/sopol-navo/Design"),
  "girih-nur": () => import("./themes/girih-nur/Design"),
  "siyoh-duo": () => import("./themes/siyoh-duo/Design"),
  "kabutar-salom": () => import("./themes/kabutar-salom/Design"),
  "shirin-tilak": () => import("./themes/shirin-tilak/Design"),
  "minor-satr": () => import("./themes/minor-satr/Design"),
  "kumush-taroq": () => import("./themes/kumush-taroq/Design"),
  "shabnam-visol": () => import("./themes/shabnam-visol/Design"),
  "visol-soati": () => import("./themes/visol-soati/Design"),
  "dutor-navosi": () => import("./themes/dutor-navosi/Design"),
  "tut-qogozi": () => import("./themes/tut-qogozi/Design"),
  "qosh-uzuk": () => import("./themes/qosh-uzuk/Design"),
  "yelpigich-ziynat": () => import("./themes/yelpigich-ziynat/Design"),
  "saodat-kaliti": () => import("./themes/saodat-kaliti/Design"),
  "sunnat-muqova": () => import("./themes/sunnat-muqova/Design"),
  "sunnat-nasab": () => import("./themes/sunnat-nasab/Design"),
  "sahar-ipagi": () => import("./themes/sahar-ipagi/Design"),
  "sahar-maktubi": () => import("./themes/sahar-maktubi/Design"),
  "umr-sahifalari": () => import("./themes/umr-sahifalari/Design"),
  "ehtirom-kartasi": () => import("./themes/ehtirom-kartasi/Design"),
  muhr: () => import("./themes/muhr/Design"),
  ipak: () => import("./themes/ipak/Design"),
  bog: () => import("./themes/bog/Design"),
  "tong-dasturxon": () => import("./themes/tong-dasturxon/Design"),
  "gul-doira": () => import("./themes/gul-doira/Design"),
  "girih-barg": () => import("./themes/girih-barg/Design"),
  "muhrli-maktub": () => import("./themes/muhrli-maktub/Design"),
  "tonggi-piyola": () => import("./themes/tonggi-piyola/Design"),
  "lola-bodom": () => import("./themes/lola-bodom/Design"),
  "bordo-guldasta": () => import("./themes/bordo-guldasta/Design"),
  "choy-maktub": () => import("./themes/choy-maktub/Design"),
  "oq-maktub": () => import("./themes/oq-maktub/Design"),
  "hurmat-maktub": () => import("./themes/hurmat-maktub/Design"),
  "tong-varaq": () => import("./themes/tong-varaq/Design"),
  "nur-varaq": () => import("./themes/nur-varaq/Design"),
  "islimi-varaq": () => import("./themes/islimi-varaq/Design"),
  "non-albom": () => import("./themes/non-albom/Design"),
  "ipak-albom": () => import("./themes/ipak-albom/Design"),
  "xotira-albom": () => import("./themes/xotira-albom/Design"),
  "qozon-tongi": () => import("./themes/qozon-tongi/Design"),
  "visol-hikoya": () => import("./themes/visol-hikoya/Design"),
  "ganch-darvoza": () => import("./themes/ganch-darvoza/Design"),
  "doppi-kitob": () => import("./themes/doppi-kitob/Design"),
  "umr-kitobi": () => import("./themes/umr-kitobi/Design"),
  "suzani-medalyon": () => import("./themes/suzani-medalyon/Design"),
  "lola-medalyon": () => import("./themes/lola-medalyon/Design"),
  "suvbuyoq-tuman": () => import("./themes/suvbuyoq-tuman/Design"),
  "suvbuyoq-zumrad": () => import("./themes/suvbuyoq-zumrad/Design"),
  "suvbuyoq-upa": () => import("./themes/suvbuyoq-upa/Design"),
  "oltin-monogramma": () => import("./themes/oltin-monogramma/OltinMonogramma"),
  sapfir: () => import("./themes/sapfir/Sapfir"),
  "oq-ot": () => import("./themes/oq-ot/OqOt"),
  "tonggi-qozon": () => import("./themes/tonggi-qozon/TonggiQozon"),
  "pion-guldasta": () => import("./themes/pion-guldasta/PionGuldasta"),
};

/** Прежние версии переработанных дизайнов: старые оплаченные заказы открываются как были */
export const LEGACY_MODULES: Record<string, Loader> = {
  "ipak-romol": () => import("./themes/ipak-romol/Legacy"),
  "rishton-koshin": () => import("./themes/rishton-koshin/Legacy"),
  "marvarid-satr": () => import("./themes/marvarid-satr/Legacy"),
  "dutor-navosi": () => import("./themes/dutor-navosi/Legacy"),
  "kumush-taroq": () => import("./themes/kumush-taroq/Legacy"),
  "kabutar-salom": () => import("./themes/kabutar-salom/Legacy"),
  "yelpigich-ziynat": () => import("./themes/yelpigich-ziynat/Legacy"),
  "samarqand-kitob": () => import("./themes/samarqand-kitob/Legacy"),
  "qosh-uzuk": () => import("./themes/qosh-uzuk/Legacy"),
  "saodat-kaliti": () => import("./themes/saodat-kaliti/Legacy"),
};

/** Код дизайна (загружается только когда нужен) */
export function loadDesign(design: Pick<Design, "id">): Promise<DesignModule> {
  const load = DESIGN_MODULES[design.id];
  if (!load) throw new Error(`Нет кода дизайна ${design.id}`);
  return load();
}

/** Версия дизайна, сохранённая в заказе: прежняя (legacy) или текущая */
export function loadOrderDesign(design: Pick<Design, "id">, version?: InvitationData["designVersion"]) {
  if (usesLegacyDesign(design.id, version) && LEGACY_MODULES[design.id]) return LEGACY_MODULES[design.id]();
  return loadDesign(design);
}
