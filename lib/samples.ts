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
    ],
  },
  sunnat: {
    ...samples.sunnat,
    person: "Абдураҳмонжон ва Абдуллоҳжон",
    relation: "nabira",
    hosts: "Абдураҳмоновлар ва Нуриддиновлар оилалари",
  },
  yubiley: samples.yubiley,
} satisfies Record<Occasion, InvitationData>;
