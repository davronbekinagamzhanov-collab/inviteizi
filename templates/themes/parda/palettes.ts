import type { Palette } from "../types";

/** «Парда»: тёмная сцена, бархат и золото. paper — тёмный фон, ink — светлый текст */
export const pardaPalettes = {
  qirmizi: {
    primary: "#8e1129",
    primaryDark: "#3d0510",
    gold: "#d4af5a",
    goldLight: "#f6e2a8",
    paper: "#140a0d",
    ink: "#f4eadc",
    muted: "#b9a28c",
  },
  binafsha: {
    primary: "#53206a",
    primaryDark: "#22082d",
    gold: "#d4af5a",
    goldLight: "#f6e2a8",
    paper: "#100a15",
    ink: "#f1e9e0",
    muted: "#b3a2b5",
  },
} satisfies Record<string, Palette>;

export type PardaColor = keyof typeof pardaPalettes;
