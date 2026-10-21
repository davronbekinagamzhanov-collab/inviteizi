import type { Palette } from "../types";

/** Цвета темы «Олтин муҳр». Один дизайн × 3 цвета = 3 шаблона в каталоге */
export const oltinMuhrPalettes = {
  bordo: {
    primary: "#7a1730",
    primaryDark: "#3a0914",
    gold: "#c9a24a",
    goldLight: "#f3e0a6",
    paper: "#fbf6ec",
    ink: "#3b2a22",
    muted: "#8b7563",
  },
  zumrad: {
    primary: "#0f5a4a",
    primaryDark: "#052a23",
    gold: "#c9a24a",
    goldLight: "#f3e0a6",
    paper: "#f7f6ee",
    ink: "#1f2e29",
    muted: "#6b7c75",
  },
  tun: {
    primary: "#1f2d5c",
    primaryDark: "#0a1230",
    gold: "#c9a24a",
    goldLight: "#f3e0a6",
    paper: "#f8f6f0",
    ink: "#232a3d",
    muted: "#737a8f",
  },
} satisfies Record<string, Palette>;

export type OltinMuhrColor = keyof typeof oltinMuhrPalettes;
