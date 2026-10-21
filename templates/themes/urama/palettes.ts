import type { Palette } from "../types";

/** «Ўрама»: пергамент, лазурит, киноварь и золото — краски восточной миниатюры */
export const uramaPalettes = {
  lojuvard: {
    primary: "#1f3a7a",
    primaryDark: "#0e1d45",
    gold: "#c99a3c",
    goldLight: "#f0d58e",
    paper: "#f2e4c4",
    ink: "#3a2a18",
    muted: "#86694a",
    accent: "#a8402a",
  },
  firuza: {
    primary: "#11717b",
    primaryDark: "#073a40",
    gold: "#c99a3c",
    goldLight: "#f0d58e",
    paper: "#f3e8cc",
    ink: "#33291a",
    muted: "#7f6a4e",
    accent: "#b0452e",
  },
} satisfies Record<string, Palette>;

export type UramaColor = keyof typeof uramaPalettes;
