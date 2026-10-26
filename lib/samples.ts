import type { InvitationData, Occasion } from "./types";

/**
 * Примерные данные для демо новых дизайнов (по тадбиру) и «трудный» образец для проверки вёрстки.
 * Пилоты пока берут свои данные из pilot-samples.ts.
 */
export const samples = {
  nikoh: {
    occasion: "nikoh",
    groom: "Азиз",
    bride: "Мадина",
    hosts: "Каримовлар оиласи",
    sides: { groom: "Каримовлар оиласи", bride: "Юсуповлар оиласи" },
    textId: "classic",
    events: [
      {
        kind: "nahorgi",
        date: "2026-11-14",
        time: "06:00",
        venueName: "Каримовлар хонадони",
        address: "Сайрам, Амир Темур кўчаси 45",
        location: { lat: 42.3005, lng: 69.7612 },
      },
      {
        kind: "nikohBazm",
        date: "2026-11-14",
        time: "18:00",
        venueName: "«Наврўз» тўйхонаси",
        address: "Сайрам, Ибрагимов кўчаси 12",
        location: { lat: 42.302, lng: 69.765 },
      },
    ],
  },

  nahorgi: {
    occasion: "nahorgi",
    cause: "nikoh",
    person: "Жасурбек",
    relation: "ogil",
    hosts: "Раҳимовлар оиласи",
    textId: "classic",
    events: [
      {
        kind: "nahorgi",
        date: "2026-11-21",
        time: "06:00",
        venueName: "Раҳимовлар хонадони",
        address: "Сайрам, Юсуф Сарёмий кўчаси 17",
        location: { lat: 42.3012, lng: 69.7595 },
      },
    ],
  },

  sunnat: {
    occasion: "sunnat",
    person: "Муҳаммадали",
    relation: "ogil",
    hosts: "Тошматовлар оиласи",
    textId: "classic",
    events: [
      {
        kind: "nahorgi",
        date: "2026-12-12",
        time: "06:00",
        venueName: "Тошматовлар хонадони",
        address: "Сайрам, Навоий кўчаси 8",
        location: { lat: 42.299, lng: 69.758 },
      },
      {
        kind: "sunnatBazm",
        date: "2026-12-12",
        time: "17:00",
        venueName: "«Ақ Ниет» тўйхонаси",
        address: "Сайрам",
        location: { lat: 42.3031, lng: 69.7622 },
      },
    ],
  },

  yubiley: {
    occasion: "yubiley",
    person: "Мукаррам опа",
    relation: "ona",
    age: 60,
    hosts: "Фарзандлари ва набиралари",
    events: [
      {
        kind: "yubileyBazm",
        date: "2026-12-05",
        time: "18:00",
        venueName: "«Ширин» ресторани",
        address: "Шымкент",
        location: { lat: 42.3155, lng: 69.5868 },
      },
    ],
  },
} satisfies Record<Occasion, InvitationData>;

/**
 * «Трудные» данные: длинные имена и три тадбира — проверка, что вёрстка не ломается.
 * Открывается в режиме разработки: /demo/<id>/long
 */
export const longSamples = {
  nikoh: {
    ...samples.nikoh,
    groom: "Муҳаммадали",
    bride: "Гулчеҳрахон",
    hosts: "Абдураҳмоновлар ва Нуриддиновлар оилалари",
    sides: { groom: "Абдураҳмоновлар оиласи", bride: "Нуриддиновлар оиласи" },
    events: [
      ...samples.nikoh.events,
      {
        kind: "kelinSalom",
        date: "2026-11-15",
        time: "10:00",
        venueName: "Абдураҳмоновлар хонадони",
        address: "Сайрам, Мустақиллик кўчаси 128-уй",
        location: { lat: 42.3011, lng: 69.7633 },
      },
    ],
  },
  nahorgi: {
    ...samples.nahorgi,
    person: "Абдурашидхон",
    hosts: "Абдураҳмоновлар ва Нуриддиновлар оилалари",
    events: [
      { ...samples.nahorgi.events[0], venueName: "«Сайрам Сарой» тўйхонасининг кичик зали" },
      {
        kind: "nikohBazm",
        date: "2026-11-21",
        time: "18:00",
        venueName: "«Наврўз» тўйхонаси",
        address: "Сайрам, Ибрагимов кўчаси 12",
        location: { lat: 42.302, lng: 69.765 },
      },
      {kind:"kelinSalom",date:"2026-11-22",time:"10:00",venueName:"Нуриддиновлар хонадони",address:"Сайрам, Мустақиллик кўчаси 128-уй",location:{lat:42.3011,lng:69.7633}},
    ],
  },
  sunnat: {
    ...samples.sunnat,
    person: "Абдураҳмонжон ва Абдуллоҳжон",
    relation: "nabira",
    hosts: "Абдураҳмоновлар ва Нуриддиновлар оилалари",
    events:[...samples.sunnat.events,{kind:"sunnatBazm",date:"2026-12-13",time:"12:00",venueName:"«Сайрам Сарой» тўйхонасининг кичик зали",address:"Сайрам, Мустақиллик кўчаси 128-уй",location:{lat:42.3011,lng:69.7633}}],
  },
  yubiley: {...samples.yubiley,person:"Муҳтарам Гулчеҳра Абдураҳмоновна",hosts:"Фарзандлари, набиралари ва Абдураҳмоновлар оиласи",events:[...samples.yubiley.events,{kind:"nahorgi",date:"2026-12-06",time:"07:00",venueName:"Абдураҳмоновлар хонадони",address:"Сайрам, Мустақиллик кўчаси 128-уй",location:{lat:42.3011,lng:69.7633}},{kind:"yubileyBazm",date:"2026-12-06",time:"18:00",venueName:"«Сайрам Сарой» тўйхонасининг кичик зали",address:"Сайрам, Ибрагимов кўчаси 12",location:{lat:42.302,lng:69.765}}]},
} satisfies Record<Occasion, InvitationData>;

/**
 * Демо из каталога: у каждого шаблона свои примерные имена, хозяева и дата
 * (не везде «Азиз ва Мадина»). Реальные местные имена, даты в будущем.
 */
type DemoOverride = Pick<InvitationData, "groom" | "bride" | "person" | "hosts" | "sides" | "relation" | "age"> & {
  /** Дата главного тадбира; остальные тадбиры сдвигаются вместе с ней */
  date: string;
};

const demo: Record<string, DemoOverride> = {
  "oq-chinni": {person:"Отабек",hosts:"Ҳамроевлар оиласи",date:"2026-12-19"},
  doppicha: {person:"Мустафо",hosts:"Нурматовлар оиласи",date:"2026-12-26"},
  "sayram-hovli": {person:"Абдуллоҳ",hosts:"Ғаниевлар оиласи",date:"2027-01-09"},
  zarvaraq: {person:"Ҳалима ая",hosts:"Фарзандлари ва набиралари",age:65,date:"2026-12-20"},
  "umr-daraxti": {person:"Ҳамид ота",relation:"ota",hosts:"Фарзандлари ва набиралари",age:70,date:"2027-01-10"},
  // никоҳ
  "ganch-peshtoq": { groom: "Жаҳонгир", bride: "Мафтуна", hosts: "Ҳамидовлар оиласи", sides: { groom: "Ҳамидовлар оиласи", bride: "Раҳмоновлар оиласи" }, date: "2026-11-21" },
  "zarhal-eshik": { groom: "Бобур", bride: "Шаҳзода", hosts: "Каримовлар оиласи", sides: { groom: "Каримовлар оиласи", bride: "Мирзаевлар оиласи" }, date: "2026-11-28" },
  "atlas-tolqin": { groom: "Санжар", bride: "Малика", hosts: "Турсуновлар оиласи", date: "2026-12-05" },
  "anor-bogi": { groom: "Улуғбек", bride: "Нигора", hosts: "Юсуповлар оиласи", sides: { groom: "Юсуповлар оиласи", bride: "Азимовлар оиласи" }, date: "2026-12-12" },
  "bodom-guli": { groom: "Отабек", bride: "Зарина", hosts: "Абдуллаевлар оиласи", date: "2027-04-10" },
  "samarqand-kitob": { groom: "Шерзод", bride: "Гулноза", hosts: "Норматовлар оиласи", sides: { groom: "Норматовлар оиласи", bride: "Қодировлар оиласи" }, date: "2027-05-15" },
  "ipak-romol": { groom: "Фаррух", bride: "Сабина", hosts: "Саидовлар оиласи", sides: { groom: "Саидовлар оиласи", bride: "Холматовлар оиласи" }, date: "2026-12-19" },
  "rishton-koshin": { groom: "Дилшод", bride: "Камола", hosts: "Эргашевлар оиласи", date: "2027-01-16" },
  atirgul: { groom: "Жасур", bride: "Нилуфар", hosts: "Раҳимовлар оиласи", date: "2027-02-13" },
  "shohona-baxmal": { groom: "Шоҳрух", bride: "Феруза", hosts: "Исмоиловлар оиласи", sides: { groom: "Исмоиловлар оиласи", bride: "Убайдуллаевлар оиласи" }, date: "2026-12-26" },
  // наҳорги ош
  "tandir-nuri": { person: "Санжарбек", relation: "ogil", hosts: "Ҳакимовлар оиласи", date: "2026-11-29" },
  dasturxon: { person: "Даврон", relation: "ogil", hosts: "Қурбоновлар оиласи", date: "2026-12-06" },
  "non-muhr": { person: "Шерзодбек", relation: "uka", hosts: "Мўминовлар оиласи", date: "2027-01-10" },
  "tonggi-choy": { person: "Беҳзод", relation: "nabira", hosts: "Тўрахоновлар оиласи", date: "2026-12-20" },
  "paxta-gul": { person: "Илҳомжон", relation: "ogil", hosts: "Зокировлар оиласи", date: "2027-02-07" },
  // суннат
  "oltin-ot": { person: "Абдулазиз", relation: "ogil", hosts: "Ғофуровлар оиласи", date: "2027-04-24" },
};

const DAY_MS = 24 * 60 * 60 * 1000;
const shift = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

/** Данные демо шаблона: образец тадбира + свои имена и дата этого шаблона */
export function sampleFor(id: string, occasion: Occasion): InvitationData {
  const base = samples[occasion] as InvitationData;
  const o = demo[id];
  if (!o) return base;
  const { date, ...names } = o;
  // насколько сдвинуть все тадбиры, чтобы главный пришёлся на дату шаблона
  const delta = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${base.events[0].date}T00:00:00Z`)) / DAY_MS);
  return { ...base, ...names, events: base.events.map((e) => ({ ...e, date: shift(e.date, delta) })) };
}
