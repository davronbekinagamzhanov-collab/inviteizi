/* eslint-disable @next/next/no-img-element -- Satori requires img; catalogue uses existing optimized local covers. */
/**
 * Картинка для статуса 1080×1920 (17.11.2026): это приглашение семьи, а не реклама.
 * Крупно «Тўйимизга таклиф қиламиз» на языке приглашения, имена, дата, место; QR и короткая ссылка на /<slug>.
 * Фон — обложка дизайна, сильно размытая (имена-примеры на ней не читаются), сверху — картина дизайна, если есть.
 * Палитра: своя тема → «Оддий»-палитра → цвет, снятый с обложки. InviteIZI — маленькая пометка в углу.
 */
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import QRCode from "qrcode";
import sharp from "sharp";
import { reportText } from "@/lib/chart";
import { getDesign } from "@/templates/registry";
import { photoAttributions, textsFor } from "@/texts/uz-cyrl";
import type { OrderRecord } from "@/lib/domain";
import { MAIN_EVENT } from "@/lib/order-rules";
import { parseWeddingDate } from "@/lib/wedding-date";
import { ONE_PAGE_LOOKS } from "@/templates/one-page-looks";
import type { InviteLang } from "@/texts/invite-lang";
const themes: Record<
  string,
  {
    paper: string;
    ink: string;
    art: string;
    contain?: boolean;
    credit?: string;
  }
> = {
  muhr: {
    paper: "#f3f4f2",
    ink: "#2c3b49",
    art: "/art/natural/eucalyptus.webp",
    contain: true,
    credit: "SYG_Anime · Pixabay",
  },
  "girih-barg": {
    paper: "#f6f7f2",
    ink: "#2f3a33",
    art: "/floral/eucalyptus-top.webp",
    contain: true,
    credit: "PhuongLucky · Pixabay",
  },
  "muhrli-maktub": {
    paper: "#fff5ec",
    ink: "#725247",
    art: "/floral/rose-garland.webp",
    contain: true,
    credit: "Urdu-Flex-Data · Pixabay",
  },
  "gul-doira": {
    paper: "#f5f6ee",
    ink: "#53634d",
    art: "/floral/tea-sprig.webp",
    contain: true,
    credit: "SYG_Anime · Pixabay",
  },
  "bordo-guldasta": {
    paper: "#f7efe4",
    ink: "#7a2335",
    art: "/floral/burgundy-peony.webp",
    contain: true,
    credit: "lucianapappdesign · Pixabay",
  },
};
let fonts:
  | Promise<{
      normal: ArrayBuffer;
      italic: ArrayBuffer;
    }>
  | undefined;
function fontData() {
  return (fonts ??= Promise.all(
    ["InviteStatusSerif-Regular.ttf", "InviteStatusSerif-Italic.ttf"].map((f) =>
      readFile(join(process.cwd(), "assets/fonts/status-lora", f)),
    ),
  ).then(([n, i]) => ({ normal: Uint8Array.from(n).buffer, italic: Uint8Array.from(i).buffer })));
}
/** Язык приглашения: основной язык страницы, выбранный клиентом (узбекский по умолчанию) */
export const posterLang = (order: OrderRecord): InviteLang => order.data.mainLang ?? "uz";

export function statusFields(order: OrderRecord, lang: InviteLang = posterLang(order)) {
  const text = textsFor(lang),
    e = order.data.events.find((e) => e.kind === MAIN_EVENT[order.occasion]) ?? order.data.events[0],
    w = e ? parseWeddingDate(e.date, e.time) : null;
  return {
    names: reportText(
      order.occasion === "nikoh"
        ? `${order.data.groom ?? ""} & ${order.data.bride ?? ""}`
        : (order.data.person ?? order.data.hosts),
    ),
    title: reportText(text.occasionTitles[order.occasion]),
    invite: reportText(text.statusPoster.title[order.occasion]),
    scan: reportText(text.statusPoster.scan),
    date: w ? text.date.long(w.day, w.monthIndex, w.year) + " · " + e!.time : "",
    venue: e?.venueName ? reportText(e.venueName) : "",
    age: order.occasion === "yubiley" && order.data.age ? order.data.age + " " + text.ageLabel : null,
  };
}

const PUBLIC = resolve(process.cwd(), "public");
const SAFE_ASSET = /^\/(art|floral|materials|pilots|vip|covers)\/[a-zA-Z0-9_./-]+\.(webp|png|jpg|jpeg)$/;
function publicFile(asset: string | null | undefined) {
  if (!asset) return null;
  asset = asset.split("?")[0];
  if (!SAFE_ASSET.test(asset) || asset.includes("..")) return null;
  const path = resolve(join(PUBLIC, asset));
  return path.startsWith(PUBLIC + "/") ? path : null;
}
const hex = (r: number, g: number, b: number) =>
  "#" +
  [r, g, b]
    .map((v) =>
      Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
const luminance = (c: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** Палитра дизайна: [бумага, текст, акцент] */
async function palette(id: string, coverPath: string | null, dark: boolean) {
  const theme = themes[id],
    look = ONE_PAGE_LOOKS[id];
  if (theme) return [theme.paper, theme.ink, theme.ink];
  if (look) return [look.paper, look.ink, look.accent];
  let base = { r: 214, g: 196, b: 170 };
  if (coverPath)
    try {
      base = (await sharp(coverPath).stats()).dominant;
    } catch {
      /* обложки нет — тёплая бумага по умолчанию */
    }
  const { r, g, b } = base,
    dominant = hex(r, g, b);
  if (dark || luminance(dominant) < 0.35)
    return [
      hex(r * 0.85, g * 0.85, b * 0.85),
      "#f7f0e4",
      hex(r + (255 - r) * 0.7, g + (255 - g) * 0.62, b + (255 - b) * 0.45),
    ];
  return [
    hex(r + (255 - r) * 0.55, g + (255 - g) * 0.55, b + (255 - b) * 0.55),
    hex(r * 0.28, g * 0.28, b * 0.28),
    hex(r * 0.55, g * 0.55, b * 0.55),
  ];
}

const dataUrl = (b: Buffer) => "data:image/png;base64," + b.toString("base64");

export async function statusPoster(order: OrderRecord, url: string, lang: InviteLang = posterLang(order)) {
  const target = new URL(url),
    local = process.env.NODE_ENV === "development" && ["localhost", "127.0.0.1"].includes(target.hostname);
  if (
    (target.protocol !== "https:" && !local) ||
    target.username ||
    target.password ||
    target.search ||
    target.hash ||
    target.pathname !== "/" + order.slug
  )
    throw Error("Exact HTTPS invitation required");
  const design = getDesign(order.templateId);
  if (!design) throw Error("Unknown design");
  const theme = themes[design.id],
    look = ONE_PAGE_LOOKS[design.id],
    coverPath = publicFile(design.cover),
    [paper, ink, accent] = await palette(design.id, coverPath, !!design.dark || !!look?.dark);

  // Фон: обложка дизайна, размытая так, что надписи-примеры не читаются; поверх — бумага дизайна
  let background: string | null = null;
  if (coverPath)
    try {
      background = dataUrl(await sharp(coverPath).resize(540, 960, { fit: "cover" }).blur(24).png().toBuffer());
    } catch {
      /* без обложки — ровная бумага */
    }

  // Картина дизайна сверху, низ растворяется в бумагу
  let art: string | null = null;
  const artPath = publicFile(
    design.art ?? theme?.art ?? look?.art ?? (design.withPhoto ? `/art/${design.id}.webp` : null),
  );
  if (artPath)
    try {
      const fade = Buffer.from(
        `<svg width="940" height="560"><defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0.6" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><rect width="940" height="560" fill="url(#f)"/></svg>`,
      );
      art = dataUrl(
        await sharp(await readFile(artPath))
          .resize(940, 560, { fit: theme?.contain ? "contain" : "cover", background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .ensureAlpha()
          .composite([{ input: fade, blend: "dest-in" }])
          .png()
          .toBuffer(),
      );
    } catch {
      /* картины нет — остаётся текст на фоне обложки */
    }

  const qr = await QRCode.toDataURL(url, {
      width: 300,
      margin: 3,
      errorCorrectionLevel: "M",
      color: { dark: "#25211c", light: "#ffffff" },
    }),
    font = await fontData(),
    f = statusFields(order, lang),
    short = target.host.replace(/^www\./, "") + target.pathname,
    credit =
      theme?.credit ??
      (photoAttributions[design.id]
        ? photoAttributions[design.id]!.author + " · " + photoAttributions[design.id]!.source
        : null),
    namesSize = f.names.length > 80 ? 54 : f.names.length > 45 ? 68 : 92;
  const response = new ImageResponse(
    <div
      style={{
        display: "flex",
        position: "relative",
        width: "100%",
        height: "100%",
        background: paper,
        color: ink,
        fontFamily: "Status",
      }}
    >
      {background && (
        <img alt="" src={background} width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }} />
      )}
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: 0,
          top: 0,
          width: 1080,
          height: 1920,
          background: paper,
          opacity: background ? 0.62 : 1,
        }}
      />
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: 40,
          right: 52,
          fontSize: 22,
          letterSpacing: 2,
          opacity: 0.55,
        }}
      >
        InviteIZI
      </div>
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: 0,
          top: 0,
          width: 1080,
          height: 1920,
          flexDirection: "column",
          alignItems: "center",
          padding: "90px 70px 50px",
        }}
      >
        {art ? <img alt="" src={art} width={940} height={560} /> : <div style={{ display: "flex", height: 120 }} />}
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: f.invite.length > 30 ? 58 : 66,
              fontStyle: "italic",
              color: accent,
              lineHeight: 1.15,
              maxWidth: 920,
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            {f.invite}
          </div>
          {f.age && <div style={{ display: "flex", fontSize: 40, marginTop: 22 }}>{f.age}</div>}
          <div
            style={{
              display: "flex",
              fontSize: namesSize,
              lineHeight: 1.15,
              marginTop: 34,
              maxWidth: 940,
              flexWrap: "wrap",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            {f.names}
          </div>
          <div style={{ display: "flex", width: 140, borderTop: `2px solid ${accent}`, margin: "38px 0 30px" }} />
          {f.date && <div style={{ display: "flex", fontSize: 40 }}>{f.date}</div>}
          {f.venue && (
            <div style={{ display: "flex", fontSize: 34, marginTop: 14, maxWidth: 900, justifyContent: "center" }}>
              {f.venue}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 34, marginTop: 20 }}>
          <div style={{ display: "flex", padding: 10, background: "#fff", borderRadius: 14 }}>
            <img alt="" src={qr} width={260} height={260} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 520 }}>
            <div style={{ display: "flex", fontSize: 32, lineHeight: 1.25 }}>{f.scan}</div>
            <div style={{ display: "flex", fontSize: 28, marginTop: 16, color: accent }}>{short}</div>
          </div>
        </div>
        {credit && (
          <div style={{ display: "flex", fontSize: 13, marginTop: 22, opacity: 0.6 }}>{reportText(credit)}</div>
        )}
      </div>
    </div>,
    {
      width: 1080,
      height: 1920,
      fonts: [
        { name: "Status", data: font.normal, weight: 400, style: "normal" },
        { name: "Status", data: font.italic, weight: 400, style: "italic" },
      ],
    },
  );
  return new Uint8Array(await response.arrayBuffer());
}

/** Подпись к фото в Telegram: одна строка, ссылка, «Статусга қўйинг» */
export function statusCaption(order: OrderRecord, url: string, cta: string) {
  const f = statusFields(order);
  return [[f.names, f.date].filter(Boolean).join(" · "), url, cta].join("\n");
}
