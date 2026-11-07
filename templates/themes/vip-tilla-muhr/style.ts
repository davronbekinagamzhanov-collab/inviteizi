import localFont from "next/font/local";
import { designVars } from "../types";

const display = localFont({ preload: false, src: [{ path: "../../../assets/fonts/google/cormorantgaramond/CormorantGaramond[wght].woff2", weight: "300 700" }], variable: "--vip-display", display: "swap" });
const body = localFont({ preload: false, src: "../../../assets/fonts/google/ptserif/PT_Serif-Web-Regular.woff2", variable: "--vip-body", display: "swap" });
const script = localFont({ preload: false, src: "../../../assets/fonts/google/badscript/BadScript-Regular.woff2", variable: "--vip-script", display: "swap" });
export const fontClasses = `${display.variable} ${body.variable} ${script.variable}`;
export const palette = { paper: "#F6F0E6", ink: "#37342E", accent: "#B8924A", soft: "#EAE0D0" };
export type VipPalette = typeof palette;
export function vipVars(p: VipPalette) {
  return designVars({ primary: p.accent, primaryDark: p.ink, gold: p.accent, goldLight: p.soft, paper: p.paper, ink: p.ink, muted: p.ink }, { display: "var(--vip-display)", accent: "var(--vip-script)", body: "var(--vip-body)" });
}
