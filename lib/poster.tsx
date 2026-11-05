/**
 * Постер партнёра A4 (v2, часть 6): молочный фон, тонкое золото, логотип InviteIZI, крупный QR в бота
 * и маленький QR «Намуна» на демо. PNG 200 dpi (1654×2339) и PDF A4 из той же картинки (без потерь).
 * Шрифт — офлайн PT Serif (есть ў қ ғ ҳ); эмодзи и ₸ рисуются SVG, внешних сервисов нет.
 */
import { deflateSync } from "node:zlib";
import QRCode from "qrcode";
import sharp from "sharp";
import { ImageResponse } from "next/og";
import { reportFont, reportText } from "./chart";

export type PosterText = { title: string; sub: string; scan: string; pricePre: string; pricePost: string; sample: string };

/** A4 при 200 dpi */
export const POSTER = { width: 1654, height: 2339, dpi: 200 };
/** Крупный QR: 640 px при 200 dpi ≈ 8,1 см (с тихой зоной 4 модуля); маленький ≈ 3,2 см */
export const MAIN_QR_PX = 640;
const SMALL_QR_PX = 250;

const MILK = "#fbf6ec";
const INK = "#3b2a1e";
const SOFT = "#7a6450";
const GOLD = "#b8955a";

const qr = (url: string, width: number) =>
  QRCode.toDataURL(url, { width, margin: 4, errorCorrectionLevel: "M", color: { dark: "#2b1f16", light: "#ffffff" } });

/** ₸ — чертой, а не символом шрифта: в PT Serif его нет */
function Tenge({ size }: { size: number }) {
  const w = size * 0.62;
  const bar = Math.max(3, size * 0.075);
  return (
    <svg width={w} height={size * 0.78} viewBox={`0 0 ${w} ${size * 0.78}`} style={{ marginLeft: size * 0.12 }}>
      <rect x="0" y="0" width={w} height={bar} fill={GOLD} />
      <rect x="0" y={bar * 2.3} width={w} height={bar} fill={GOLD} />
      <rect x={w / 2 - bar / 2} y={bar * 2.3} width={bar} height={size * 0.78 - bar * 2.3} fill={GOLD} />
    </svg>
  );
}

/** «📱» — тонкий контур телефона */
function Phone({ size }: { size: number }) {
  return (
    <svg width={size * 0.6} height={size} viewBox="0 0 30 50" style={{ marginRight: size * 0.3 }}>
      <rect x="2" y="2" width="26" height="46" rx="5" fill="none" stroke={GOLD} strokeWidth="3" />
      <rect x="11" y="41" width="8" height="3" rx="1.5" fill={GOLD} />
    </svg>
  );
}

/** Тонкая золотая линия с ромбом посередине */
function Divider({ width }: { width: number }) {
  return (
    <svg width={width} height="24" viewBox={`0 0 ${width} 24`}>
      <line x1="0" y1="12" x2={width / 2 - 20} y2="12" stroke={GOLD} strokeWidth="2" />
      <rect x={width / 2 - 8} y="4" width="16" height="16" transform={`rotate(45 ${width / 2} 12)`} fill="none" stroke={GOLD} strokeWidth="2" />
      <line x1={width / 2 + 20} y1="12" x2={width} y2="12" stroke={GOLD} strokeWidth="2" />
    </svg>
  );
}

/** Не отрывать «—», число и короткий предлог от следующего слова: «— 5 дақиқада», «за 5 минут» */
export function titleChunks(title: string) {
  const words = reportText(title).split(" ").filter(Boolean);
  const out: string[] = [];
  let carry = "";
  for (const w of words) {
    const glue = w === "—" || /^\d+$/.test(w) || w.length <= 2;
    carry = carry ? `${carry} ${w}` : w;
    if (!glue) {
      out.push(carry);
      carry = "";
    }
  }
  if (carry) out.push(carry);
  return out;
}

const fmtAmount = (n: number) => n.toLocaleString("ru-RU").replace(/\s/g, " ");

/** PNG постера */
export async function renderPosterPng(o: { text: PosterText; botUrl: string; demoUrl: string; partner: string; minPrice: number }): Promise<Uint8Array> {
  const t = o.text;
  const [main, small] = await Promise.all([qr(o.botUrl, MAIN_QR_PX), qr(o.demoUrl, SMALL_QR_PX)]);
  const fontData = await reportFont();
  const response = new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", background: MILK, color: INK, fontFamily: "Poster", padding: 56 }}>
      <div style={{ flex: 1, display: "flex", border: `2px solid ${GOLD}`, padding: 14 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", border: `1px solid ${GOLD}`, padding: "90px 80px 70px" }}>
          <div style={{ display: "flex", fontSize: 64, letterSpacing: 10, color: INK }}>InviteIZI</div>
          <div style={{ display: "flex", marginTop: 26 }}>
            <Divider width={420} />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", marginTop: 90, fontSize: 92, lineHeight: 1.15, maxWidth: 1300, columnGap: 26 }}>
            {titleChunks(t.title).map((w) => (
              <div key={w} style={{ display: "flex" }}>{w}</div>
            ))}
          </div>
          <div style={{ display: "flex", marginTop: 36, fontSize: 52, color: SOFT, textAlign: "center" }}>{reportText(t.sub)}</div>
          <div style={{ display: "flex", marginTop: 90, padding: 26, background: "#ffffff", border: `2px solid ${GOLD}`, borderRadius: 28 }}>
            {/* ImageResponse рисует только обычный img */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={main} width={MAIN_QR_PX} height={MAIN_QR_PX} alt="" />
          </div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 54, fontSize: 64 }}>
            <Phone size={64} />
            {reportText(t.scan)}
          </div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 44, padding: "16px 54px", border: `2px solid ${GOLD}`, borderRadius: 999, fontSize: 56, color: INK }}>
            {t.pricePre.trim() ? <div style={{ display: "flex", marginRight: 16 }}>{reportText(t.pricePre)}</div> : null}
            {fmtAmount(o.minPrice)}
            <Tenge size={56} />
            {t.pricePost.trim() ? <div style={{ display: "flex", marginLeft: 16 }}>{reportText(t.pricePost)}</div> : null}
          </div>
          <div style={{ display: "flex", flex: 1 }} />
          <div style={{ display: "flex", width: "100%", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div style={{ display: "flex", width: SMALL_QR_PX }} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 6 }}>
              <Divider width={260} />
              <div style={{ display: "flex", marginTop: 16, fontSize: 34, color: SOFT }}>{reportText(o.partner).slice(0, 60)}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ display: "flex", fontSize: 34, color: SOFT, marginBottom: 10 }}>{reportText(t.sample)}</div>
              <div style={{ display: "flex", padding: 8, background: "#ffffff", border: `1px solid ${GOLD}`, borderRadius: 14 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={small} width={SMALL_QR_PX} height={SMALL_QR_PX} alt="" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    { width: POSTER.width, height: POSTER.height, fonts: [{ name: "Poster", data: fontData, weight: 400, style: "normal" }] },
  );
  return new Uint8Array(await response.arrayBuffer());
}

/** PDF A4 из PNG: одна страница, картинка без сжатия с потерями (QR остаётся чётким при печати) */
export async function posterPdf(png: Uint8Array): Promise<Uint8Array> {
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const image = deflateSync(data, { level: 9 });
  const W = 595.28;
  const H = 841.89;
  const content = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
    null, // картинка — бинарный поток, собирается отдельно
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  const parts: Buffer[] = [Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "latin1")];
  const offsets: number[] = [];
  let size = parts[0].length;
  const push = (b: Buffer) => {
    parts.push(b);
    size += b.length;
  };
  objects.forEach((body, i) => {
    offsets.push(size);
    if (body === null) {
      push(Buffer.from(`${i + 1} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${info.width} /Height ${info.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${image.length} >>\nstream\n`, "latin1"));
      push(image);
      push(Buffer.from("\nendstream\nendobj\n", "latin1"));
    } else push(Buffer.from(`${i + 1} 0 obj\n${body}\nendobj\n`, "latin1"));
  });
  const xref = size;
  const table = offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  push(Buffer.from(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${table}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`, "latin1"));
  return new Uint8Array(Buffer.concat(parts));
}
