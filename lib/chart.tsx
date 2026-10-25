import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import codepoints from "@/assets/fonts/PTSerif-codepoints.json";

export type ChartPoint = { label: string; value: number };
let font: Promise<Buffer> | undefined;
/** Offline font, OFL license included; covers ў қ ғ ҳ. */
export async function reportFont() {
  font ??= readFile(path.join(process.cwd(), "assets/fonts/PTSerif-Regular.ttf"));
  const bytes = await font;
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
const supported = new Set(codepoints);
/** Never trigger ImageResponse's remote emoji / missing-glyph fallback service. */
export function reportText(text: string): string {
  return Array.from(text.replace(/₸/g, "тг").replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, "").replace(/\s/g, " "))
    .map(c => supported.has(c.codePointAt(0)!) ? c : "?").join("").trim();
}
const short = (s: string, n = 28) => {
  const chars = Array.from(reportText(s));
  return chars.slice(0, n).join("") + (chars.length > n ? "…" : "");
};

/** No network service, no image endpoint exposing admin data. Sent directly as Telegram bytes. */
export async function renderChart(title: string, points: ChartPoint[], empty: string, kind: "bars" | "line" = "bars"): Promise<Uint8Array> {
  const rows = points.slice(0, kind === "line" ? 30 : 10);
  const max = Math.max(1, ...rows.map(p => p.value));
  const hasData = rows.some(p => p.value > 0);
  const width = 720;
  const height = kind === "line" ? 560 : Math.max(360, 190 + rows.length * 66);
  const fontData = await reportFont();
  const response = new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: 32, background: "#fffaf2", color: "#3b2a1e", fontFamily: "Report" }}>
      <div style={{ display: "flex", fontSize: 34, marginBottom: 30 }}>{short(title, 36)}</div>
      {!hasData ? <div style={{ display: "flex", fontSize: 30, marginTop: 60 }}>{reportText(empty)}</div> : kind === "line" ? (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 26, marginBottom: 14 }}>{`0 — ${max.toLocaleString("ru-RU")} KZT`}</div>
          <svg width="640" height="300" viewBox="0 0 640 300">
            <path d="M 10 10 V 280 H 630" fill="none" stroke="#ddcdb4" strokeWidth="2" />
            <polyline points={rows.map((p, i) => `${10 + i * 620 / Math.max(1, rows.length - 1)},${280 - p.value / max * 260}`).join(" ")} fill="none" stroke="#a87a28" strokeWidth="5" />
            {rows.map((p, i) => <circle key={i} cx={10 + i * 620 / Math.max(1, rows.length - 1)} cy={280 - p.value / max * 260} r="5" fill="#a87a28" />)}
          </svg>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26 }}><span>{short(rows[0]?.label ?? "",12)}</span><span>{short(rows.at(-1)?.label ?? "",12)}</span></div>
        </div>
      ) : rows.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", height: 66, fontSize: 28 }}>
          <div style={{ display: "flex", width: 270 }}>{short(p.label, 18)}</div>
          <div style={{ display: "flex", width: 250, height: 26, background: "#efe6d6", borderRadius: 5 }}>
            <div style={{ display: "flex", width: `${Math.max(0, p.value) / max * 100}%`, background: "#b8892f", borderRadius: 5 }} />
          </div>
          <div style={{ display: "flex", width: 110, justifyContent: "flex-end", fontSize: 28 }}>{reportText(p.value.toLocaleString("ru-RU", p.value > 999999 ? { notation: "compact", maximumFractionDigits: 1 } : undefined))}</div>
        </div>
      ))}
      <div style={{ display: "flex", marginTop: "auto", paddingTop: 18, fontSize: 18, color: "#9a835f" }}>InviteIZI</div>
    </div>,
    { width, height, fonts: [{ name: "Report", data: fontData, weight: 400, style: "normal" }] },
  );
  return new Uint8Array(await response.arrayBuffer());
}
