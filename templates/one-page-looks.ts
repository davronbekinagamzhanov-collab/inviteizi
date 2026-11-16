/**
 * Палитра, шрифт и картина «Оддий»-дизайнов для одноэкранного макета (templates/blocks/OnePage.tsx), 17.11.2026.
 * Цвета сняты с прежней вёрстки каждого дизайна (цвет имён, акцент, бумага); картины — те же файлы из public/art.
 * photo — фото по умолчанию в медальоне (клиент может поставить своё); без него — картина сверху.
 */
export type OnePageLook = {
  paper: string;
  ink: string;
  accent: string;
  soft: string;
  line: string;
  font: "vollkorn" | "piazzolla" | "cormorant" | "unicase";
  art?: string;
  photo?: string;
  dark?: boolean;
};

export const ONE_PAGE_LOOKS: Record<string, OnePageLook> = {
  default: { paper: "#f8f3ea", ink: "#3b2a1e", accent: "#a8772a", soft: "#f1e2c3", line: "#d9c49c", font: "cormorant" },
  // Никоҳ
  "suzani-medalyon": {
    paper: "#efe4d4",
    ink: "#58332f",
    accent: "#9b6150",
    soft: "#e5d6c2",
    line: "#c8a98f",
    font: "vollkorn",
    photo: "/art/suzani-medalyon/1.webp",
  },
  "oq-maktub": {
    paper: "#ebe9df",
    ink: "#293c34",
    accent: "#657b65",
    soft: "#dfe3d6",
    line: "#b9c2ad",
    font: "vollkorn",
  },
  "ipak-albom": {
    paper: "#f4efe0",
    ink: "#2c2d22",
    accent: "#59603a",
    soft: "#e6e2cc",
    line: "#c4c19c",
    font: "piazzolla",
  },
  sapfir: {
    paper: "#132a4c",
    ink: "#f4ebd6",
    accent: "#c9a961",
    soft: "#1d3a63",
    line: "#4a6188",
    font: "cormorant",
    dark: true,
  },
  // Суннат
  "tulpor-quvonchi": {
    paper: "#f6eee2",
    ink: "#674d3b",
    accent: "#a07a4f",
    soft: "#ecdfcb",
    line: "#d2bb98",
    font: "cormorant",
    art: "/art/sunnat-collection/tulpor-quvonchi.webp",
  },
  "kashta-tilagi": {
    paper: "#f1f2f3",
    ink: "#354a69",
    accent: "#8c6d3f",
    soft: "#e2e6ec",
    line: "#b8c2d0",
    font: "cormorant",
    art: "/art/sunnat-collection/kashta-tilagi.webp",
  },
  "lola-medalyon": {
    paper: "#f3f1e4",
    ink: "#22281f",
    accent: "#4f6b3a",
    soft: "#e4e6d2",
    line: "#bfc6a7",
    font: "unicase",
  },
  doppicha: {
    paper: "#fff9ed",
    ink: "#3c4f43",
    accent: "#527565",
    soft: "#eef0e2",
    line: "#c3cdbd",
    font: "cormorant",
  },
  // Наҳорги ош
  "bog-nasimi": {
    paper: "#f1f0e3",
    ink: "#435e44",
    accent: "#8a7a4a",
    soft: "#e3e5d2",
    line: "#c2c7a9",
    font: "cormorant",
    art: "/art/nahorgi-collection/bog-nasimi.webp",
  },
  "tong-naqshi": {
    paper: "#eef2f3",
    ink: "#29485c",
    accent: "#a8834a",
    soft: "#dde6ea",
    line: "#b3c4cc",
    font: "cormorant",
    art: "/art/nahorgi-collection/tong-naqshi.webp",
  },
  "non-albom": {
    paper: "#f6eee0",
    ink: "#33261b",
    accent: "#6b4226",
    soft: "#ecdfc8",
    line: "#d0b892",
    font: "piazzolla",
    art: "/art/natural/nahorgi-chekich.webp",
  },
  "choy-maktub": {
    paper: "#f7f0e2",
    ink: "#33291f",
    accent: "#2c5a8c",
    soft: "#e7e9ec",
    line: "#b9c6d6",
    font: "vollkorn",
  },
  // Юбилей
  "qadr-surati": {
    paper: "#eef1f3",
    ink: "#354f63",
    accent: "#9a7b4f",
    soft: "#dfe5ea",
    line: "#b7c3cd",
    font: "cormorant",
    art: "/art/yubiley-collection/qadr-surati.webp",
  },
  "bordo-guldasta": {
    paper: "#f6ece6",
    ink: "#692939",
    accent: "#a8774a",
    soft: "#efdcd6",
    line: "#d4b2a8",
    font: "cormorant",
    art: "/art/yubiley-collection/bordo-guldasta.webp",
  },
  "hurmat-maktub": {
    paper: "#eef2f0",
    ink: "#1f2b2e",
    accent: "#b38b4a",
    soft: "#dce6e3",
    line: "#b4c6c2",
    font: "vollkorn",
  },
};
