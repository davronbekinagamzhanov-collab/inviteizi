import type { InvitationData } from "./types";

/** Примерные данные для демо пяти пилотных дизайнов */
export const pilotSamples = {
  "oltin-monogramma": {
    occasion: "nikoh",
    groom: "Азиз",
    bride: "Мадина",
    hosts: "Каримовлар оиласи",
    textId: "royal",
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
        address: "Сайрам",
        location: { lat: 42.302, lng: 69.765 },
      },
    ],
  },

  sapfir: {
    occasion: "nikoh",
    groom: "Сардор",
    bride: "Дилноза",
    hosts: "Юсуповлар оиласи",
    textId: "short",
    events: [
      {
        kind: "nikohBazm",
        date: "2026-11-28",
        time: "17:00",
        venueName: "«Гулистон» тўйхонаси",
        address: "Шымкент",
        location: { lat: 42.3417, lng: 69.5901 },
      },
    ],
  },

  "oq-ot": {
    occasion: "sunnat",
    person: "Муҳаммадали",
    relation: "nabira",
    hosts: "Тошматовлар оиласи",
    events: [
      {
        kind: "nahorgi",
        date: "2026-12-12",
        time: "06:00",
        venueName: "«Ақ Ниет» тўйхонаси",
        address: "Сайрам",
        location: { lat: 42.299, lng: 69.758 },
      },
    ],
  },

  "tonggi-qozon": {
    occasion: "nahorgi",
    cause: "nikoh",
    person: "Жасурбек",
    relation: "ogil",
    hosts: "Раҳимовлар оиласи",
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

  "pion-guldasta": {
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
} satisfies Record<string, InvitationData>;
