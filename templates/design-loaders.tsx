"use client";
// СГЕНЕРИРОВАНО scripts/gen-design-loaders.mjs из templates/design-modules.ts — не править руками.
// next/dynamic с буквальным import(): на странице приглашения — CSS и шрифты только открытого дизайна.
import dynamic from "next/dynamic";
import { useEffect } from "react";
import type { ComponentType } from "react";
import type { TemplateProps } from "./themes/types";
import { ONE_PAGE_LOOKS } from "./one-page-looks";

/** «Оддий» — один экран без прокрутки и открытия (17.11.2026): общий макет с палитрой дизайна */
const OnePageView = dynamic(() => import("./blocks/OnePage"));

const DESIGN_VIEWS: Record<string, ComponentType<TemplateProps>> = {
  "umr-durdonasi": dynamic(() => import("./themes/umr-durdonasi/Design")),
  "qadr-surati": dynamic(() => import("./themes/qadr-surati/Design")),
  "zarhal-duo": dynamic(() => import("./themes/zarhal-duo/Design")),
  "moviy-ayvon": dynamic(() => import("./themes/moviy-ayvon/Design")),
  "tulpor-quvonchi": dynamic(() => import("./themes/tulpor-quvonchi/Design")),
  "kashta-tilagi": dynamic(() => import("./themes/kashta-tilagi/Design")),
  "bog-nasimi": dynamic(() => import("./themes/bog-nasimi/Design")),
  "tong-naqshi": dynamic(() => import("./themes/tong-naqshi/Design")),
  "sahar-sabosi": dynamic(() => import("./themes/sahar-sabosi/Design")),
  "subhi-safo": dynamic(() => import("./themes/subhi-safo/Design")),
  "vip-ipak-ziyosi": dynamic(() => import("./themes/vip-ipak-ziyosi/Design")),
  "vip-zarbof": dynamic(() => import("./themes/vip-zarbof/Design")),
  "vip-visol-nuri": dynamic(() => import("./themes/vip-visol-nuri/Design")),
  "vip-zarrin-ahd": dynamic(() => import("./themes/vip-zarrin-ahd/Design")),
  "vip-marvarid": dynamic(() => import("./themes/vip-marvarid/Design")),
  "vip-bogi-visol": dynamic(() => import("./themes/vip-bogi-visol/Design")),
  "vip-oq-tulpor": dynamic(() => import("./themes/vip-oq-tulpor/Design")),
  "vip-umr-ziyosi": dynamic(() => import("./themes/vip-umr-ziyosi/Design")),
  "vip-suzana": dynamic(() => import("./themes/vip-suzana/Design")),
  "vip-osmon": dynamic(() => import("./themes/vip-osmon/Design")),
  "vip-tilla-muhr": dynamic(() => import("./themes/vip-tilla-muhr/Design")),
  "ganch-peshtoq": dynamic(() => import("./themes/ganch-peshtoq/Design")),
  "zarhal-eshik": dynamic(() => import("./themes/zarhal-eshik/Design")),
  "atlas-tolqin": dynamic(() => import("./themes/atlas-tolqin/Design")),
  "anor-bogi": dynamic(() => import("./themes/anor-bogi/Design")),
  "bodom-guli": dynamic(() => import("./themes/bodom-guli/Design")),
  "samarqand-kitob": dynamic(() => import("./themes/samarqand-kitob/Design")),
  "ipak-romol": dynamic(() => import("./themes/ipak-romol/Design")),
  "rishton-koshin": dynamic(() => import("./themes/rishton-koshin/Design")),
  atirgul: dynamic(() => import("./themes/atirgul/Design")),
  "shohona-baxmal": dynamic(() => import("./themes/shohona-baxmal/Design")),
  "tandir-nuri": dynamic(() => import("./themes/tandir-nuri/Design")),
  dasturxon: dynamic(() => import("./themes/dasturxon/Design")),
  "non-muhr": dynamic(() => import("./themes/non-muhr/Design")),
  "tonggi-choy": dynamic(() => import("./themes/tonggi-choy/Design")),
  "paxta-gul": dynamic(() => import("./themes/paxta-gul/Design")),
  "oltin-ot": dynamic(() => import("./themes/oltin-ot/Design")),
  "oq-chinni": dynamic(() => import("./themes/oq-chinni/Design")),
  doppicha: dynamic(() => import("./themes/doppicha/Design")),
  "sayram-hovli": dynamic(() => import("./themes/sayram-hovli/Design")),
  zarvaraq: dynamic(() => import("./themes/zarvaraq/Design")),
  "umr-daraxti": dynamic(() => import("./themes/umr-daraxti/Design")),
  "marvarid-satr": dynamic(() => import("./themes/marvarid-satr/Design")),
  "gulbog-sahifa": dynamic(() => import("./themes/gulbog-sahifa/Design")),
  "suzani-yol": dynamic(() => import("./themes/suzani-yol/Design")),
  "bugdoy-boshoq": dynamic(() => import("./themes/bugdoy-boshoq/Design")),
  "lola-ehtirom": dynamic(() => import("./themes/lola-ehtirom/Design")),
  "zarhal-lavha": dynamic(() => import("./themes/zarhal-lavha/Design")),
  "adras-nishon": dynamic(() => import("./themes/adras-nishon/Design")),
  "mis-kafgir": dynamic(() => import("./themes/mis-kafgir/Design")),
  "rayhon-sahari": dynamic(() => import("./themes/rayhon-sahari/Design")),
  "visol-rishta": dynamic(() => import("./themes/visol-rishta/Design")),
  "uzum-hovli": dynamic(() => import("./themes/uzum-hovli/Design")),
  "sopol-navo": dynamic(() => import("./themes/sopol-navo/Design")),
  "girih-nur": dynamic(() => import("./themes/girih-nur/Design")),
  "siyoh-duo": dynamic(() => import("./themes/siyoh-duo/Design")),
  "kabutar-salom": dynamic(() => import("./themes/kabutar-salom/Design")),
  "shirin-tilak": dynamic(() => import("./themes/shirin-tilak/Design")),
  "minor-satr": dynamic(() => import("./themes/minor-satr/Design")),
  "kumush-taroq": dynamic(() => import("./themes/kumush-taroq/Design")),
  "shabnam-visol": dynamic(() => import("./themes/shabnam-visol/Design")),
  "visol-soati": dynamic(() => import("./themes/visol-soati/Design")),
  "dutor-navosi": dynamic(() => import("./themes/dutor-navosi/Design")),
  "tut-qogozi": dynamic(() => import("./themes/tut-qogozi/Design")),
  "qosh-uzuk": dynamic(() => import("./themes/qosh-uzuk/Design")),
  "yelpigich-ziynat": dynamic(() => import("./themes/yelpigich-ziynat/Design")),
  "saodat-kaliti": dynamic(() => import("./themes/saodat-kaliti/Design")),
  "sunnat-muqova": dynamic(() => import("./themes/sunnat-muqova/Design")),
  "sunnat-nasab": dynamic(() => import("./themes/sunnat-nasab/Design")),
  "sahar-ipagi": dynamic(() => import("./themes/sahar-ipagi/Design")),
  "sahar-maktubi": dynamic(() => import("./themes/sahar-maktubi/Design")),
  "umr-sahifalari": dynamic(() => import("./themes/umr-sahifalari/Design")),
  "ehtirom-kartasi": dynamic(() => import("./themes/ehtirom-kartasi/Design")),
  muhr: dynamic(() => import("./themes/muhr/Design")),
  ipak: dynamic(() => import("./themes/ipak/Design")),
  bog: dynamic(() => import("./themes/bog/Design")),
  "tong-dasturxon": dynamic(() => import("./themes/tong-dasturxon/Design")),
  "gul-doira": dynamic(() => import("./themes/gul-doira/Design")),
  "girih-barg": dynamic(() => import("./themes/girih-barg/Design")),
  "muhrli-maktub": dynamic(() => import("./themes/muhrli-maktub/Design")),
  "tonggi-piyola": dynamic(() => import("./themes/tonggi-piyola/Design")),
  "lola-bodom": dynamic(() => import("./themes/lola-bodom/Design")),
  "bordo-guldasta": dynamic(() => import("./themes/bordo-guldasta/Design")),
  "choy-maktub": dynamic(() => import("./themes/choy-maktub/Design")),
  "oq-maktub": dynamic(() => import("./themes/oq-maktub/Design")),
  "hurmat-maktub": dynamic(() => import("./themes/hurmat-maktub/Design")),
  "tong-varaq": dynamic(() => import("./themes/tong-varaq/Design")),
  "nur-varaq": dynamic(() => import("./themes/nur-varaq/Design")),
  "islimi-varaq": dynamic(() => import("./themes/islimi-varaq/Design")),
  "non-albom": dynamic(() => import("./themes/non-albom/Design")),
  "ipak-albom": dynamic(() => import("./themes/ipak-albom/Design")),
  "xotira-albom": dynamic(() => import("./themes/xotira-albom/Design")),
  "qozon-tongi": dynamic(() => import("./themes/qozon-tongi/Design")),
  "visol-hikoya": dynamic(() => import("./themes/visol-hikoya/Design")),
  "ganch-darvoza": dynamic(() => import("./themes/ganch-darvoza/Design")),
  "doppi-kitob": dynamic(() => import("./themes/doppi-kitob/Design")),
  "umr-kitobi": dynamic(() => import("./themes/umr-kitobi/Design")),
  "suzani-medalyon": dynamic(() => import("./themes/suzani-medalyon/Design")),
  "lola-medalyon": dynamic(() => import("./themes/lola-medalyon/Design")),
  "suvbuyoq-tuman": dynamic(() => import("./themes/suvbuyoq-tuman/Design")),
  "suvbuyoq-zumrad": dynamic(() => import("./themes/suvbuyoq-zumrad/Design")),
  "suvbuyoq-upa": dynamic(() => import("./themes/suvbuyoq-upa/Design")),
  "oltin-monogramma": dynamic(() => import("./themes/oltin-monogramma/OltinMonogramma")),
  sapfir: dynamic(() => import("./themes/sapfir/Sapfir")),
  "oq-ot": dynamic(() => import("./themes/oq-ot/OqOt")),
  "tonggi-qozon": dynamic(() => import("./themes/tonggi-qozon/TonggiQozon")),
  "pion-guldasta": dynamic(() => import("./themes/pion-guldasta/PionGuldasta")),
};

/** Прежние версии переработанных дизайнов для старых оплаченных заказов */
const LEGACY_VIEWS: Record<string, ComponentType<TemplateProps>> = {
  "ipak-romol": dynamic(() => import("./themes/ipak-romol/Legacy")),
  "rishton-koshin": dynamic(() => import("./themes/rishton-koshin/Legacy")),
  "marvarid-satr": dynamic(() => import("./themes/marvarid-satr/Legacy")),
  "dutor-navosi": dynamic(() => import("./themes/dutor-navosi/Legacy")),
  "kumush-taroq": dynamic(() => import("./themes/kumush-taroq/Legacy")),
  "kabutar-salom": dynamic(() => import("./themes/kabutar-salom/Legacy")),
  "yelpigich-ziynat": dynamic(() => import("./themes/yelpigich-ziynat/Legacy")),
  "samarqand-kitob": dynamic(() => import("./themes/samarqand-kitob/Legacy")),
  "qosh-uzuk": dynamic(() => import("./themes/qosh-uzuk/Legacy")),
  "saodat-kaliti": dynamic(() => import("./themes/saodat-kaliti/Legacy")),
};

/** Дизайн по id; legacy — прежняя версия для старого оплаченного заказа */
export function DesignView({ id, legacy = false, ...props }: TemplateProps & { id: string; legacy?: boolean }) {
  // Дизайн — для журнала ошибок звука (reportAudio), без данных клиента
  useEffect(() => {
    (window as { __inviteDesign?: string }).__inviteDesign = id;
  }, [id]);
  if (!legacy && id !== "default" && ONE_PAGE_LOOKS[id]) return <OnePageView id={id} {...props} />;
  const View = (legacy ? LEGACY_VIEWS[id] : undefined) ?? DESIGN_VIEWS[id];
  return <View {...props} />;
}
