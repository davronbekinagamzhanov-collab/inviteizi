/* eslint-disable @next/next/no-img-element -- Satori понимает только <img>. */
/**
 * «Сақлаб олиш» (19.11.2026): готовые файлы приглашения в стиле ИМЕННО дизайна клиента.
 *  - фото: 1080×1920 (статус/сторис) и 1080×1350 (лента/WhatsApp), маленький QR на приглашение;
 *  - печать: PDF A5 и A6, 300 dpi, поля под обрез 3 мм, тексты в безопасной зоне, QR «Онлайн таклифнома».
 * Основа — «лицо» приглашения 9:16: подложка самого дизайна без текста (assets/keepsake/plates/<id>.webp —
 * рамка, орнамент, картина, бумага), шрифты и цвета имён/текста, снятые с дизайна (lib/keepsake/looks.json),
 * текст заказа в «тихой зоне» подложки (там, где в дизайне стоит текст). Другие форматы — то же лицо
 * по центру на размытом фоне дизайна. Без браузера: next/og (Satori) + sharp + pdf-lib.
 */
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import QRCode from "qrcode";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import { reportText } from "@/lib/chart";
import { getDesign } from "@/templates/registry";
import { textsFor } from "@/texts/uz-cyrl";
import type { OrderRecord } from "@/lib/domain";
import { parseWeddingDate } from "@/lib/wedding-date";
import type { InviteLang } from "@/texts/invite-lang";
import looksJson from "./looks.json";

export type KeepsakeLook = {
  paper: string;
  ink: string;
  accent: string;
  namesFont: string;
  namesItalic: boolean;
  bodyFont: string;
  dark: boolean;
  zone: [number, number];
};
const LOOKS = looksJson as unknown as Record<string, KeepsakeLook>;

export type PhotoKind = "story" | "feed";
export type PrintKind = "a5" | "a6";
export type KeepsakeKind = PhotoKind | PrintKind;

/** Печать: 300 dpi, поля под обрез 3 мм с каждой стороны, безопасная зона — 5 мм внутрь от обреза */
export const DPI = 300;
export const BLEED_MM = 3;
export const SAFE_MM = 5;
export const PRINT_MM: Record<PrintKind, { w: number; h: number }> = { a5: { w: 148, h: 210 }, a6: { w: 105, h: 148 } };
const px = (mm: number) => Math.round((mm / 25.4) * DPI);

export function canvasSize(kind: KeepsakeKind) {
  if (kind === "story") return { w: 1080, h: 1920 };
  if (kind === "feed") return { w: 1080, h: 1350 };
  const t = PRINT_MM[kind];
  return { w: px(t.w + 2 * BLEED_MM), h: px(t.h + 2 * BLEED_MM) };
}

/** Где на холсте стоит лицо 9:16 (печать — внутри безопасной зоны) */
export function faceBox(kind: KeepsakeKind) {
  const { w, h } = canvasSize(kind);
  if (kind === "story") return { x: 0, y: 0, w, h };
  const margin = kind === "feed" ? Math.round(h * 0.03) : px(BLEED_MM + SAFE_MM);
  const fh = h - 2 * margin;
  let fw = Math.round((fh * 9) / 16);
  const maxW = w - 2 * margin;
  if (fw > maxW) fw = maxW;
  const fh2 = Math.round((fw * 16) / 9);
  return { x: Math.round((w - fw) / 2), y: Math.round((h - fh2) / 2), w: fw, h: fh2 };
}

const ROOT = process.cwd();
const FALLBACK_FONT = "assets/fonts/status-lora/InviteStatusSerif-Regular.ttf";
const ITALIC_FONT = "assets/fonts/status-lora/InviteStatusSerif-Italic.ttf";
const fontCache = new Map<string, Promise<ArrayBuffer>>();
function font(file: string) {
  const path =
    file === "italic"
      ? ITALIC_FONT
      : file === "lora-regular" || !/^[a-f0-9]{10}-\d{3}\.ttf$/.test(file)
        ? FALLBACK_FONT
        : `assets/keepsake/fonts/${file}`;
  if (!fontCache.has(path))
    fontCache.set(
      path,
      readFile(join(ROOT, path)).then((b) => Uint8Array.from(b).buffer),
    );
  return fontCache.get(path)!;
}

const DEFAULT_LOOK: KeepsakeLook = {
  paper: "#f8f3ea",
  ink: "#3b2a1e",
  accent: "#a8772a",
  namesFont: "lora-regular",
  namesItalic: false,
  bodyFont: "lora-regular",
  dark: false,
  zone: [0, 0],
};
/** Контраст WCAG двух цветов #rrggbb */
export function contrast(a: string, b: string) {
  const lum = (c: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const v = parseInt(c.slice(i, i + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Цвет текста на бумаге: свой цвет дизайна, если читается (≥ 4,5), иначе тёмный/светлый в тон */
export function readable(color: string, paper: string) {
  if (contrast(color, paper) >= 4.5) return color;
  const alt = ["#2b2118", "#f7f0e4"].sort((p, q) => contrast(q, paper) - contrast(p, paper))[0];
  return alt;
}

export const lookOf = (templateId: string): KeepsakeLook => {
  const l = { ...DEFAULT_LOOK, ...LOOKS[templateId] };
  return { ...l, ink: readable(l.ink, l.paper), accent: readable(l.accent, l.paper) };
};

/** Тексты лица на языке приглашения */
export function keepsakeFields(order: OrderRecord, lang: InviteLang) {
  const text = textsFor(lang);
  const d = order.data;
  const names =
    order.occasion === "nikoh" ? [d.groom ?? "", d.bride ?? ""].filter(Boolean).join(" & ") : (d.person ?? d.hosts ?? "");
  return {
    invite: reportText(text.statusPoster.title[order.occasion]),
    names: reportText(names),
    age: order.occasion === "yubiley" && d.age ? `${d.age} ${text.ageLabel}` : null,
    scan: reportText(text.statusPoster.scan),
    online: reportText(text.statusPoster.online),
    events: d.events.slice(0, 3).map((e) => {
      const w = parseWeddingDate(e.date, e.time);
      return {
        title: reportText(text.eventTitles[e.kind] ?? ""),
        when: `${text.date.long(w.day, w.monthIndex, w.year)} · ${e.time}`,
        day: text.weekdays[w.weekdayIndex],
        venue: reportText(e.venueName ?? ""),
      };
    }),
  };
}

/** Оценка высоты текста (Satori не отдаёт раскладку): ширина знака ~0.6 кегля с запасом на перенос слов */
const lines = (text: string, size: number, width: number, k = 0.6) =>
  text ? Math.max(1, Math.ceil((text.length * size * k) / width)) : 0;

export type FaceLayout = {
  card: boolean;
  box: { top: number; bottom: number; left: number; right: number };
  scale: number;
  sizes: { invite: number; names: number; age: number; title: number; when: number; venue: number };
};

/** Раскладка текста лица шириной W (единицы — пиксели лица) */
export function faceLayout(look: KeepsakeLook, f: ReturnType<typeof keepsakeFields>, W: number): FaceLayout {
  const H = (W * 16) / 9;
  const [zt, zb] = look.zone;
  const card = zb - zt < 0.36;
  const top = card ? 0.4 : Math.max(0.06, zt + 0.015);
  const bottom = card ? 0.785 : Math.min(0.785, zb);
  const left = card ? 0.1 : 0.09;
  const box = { top: top * H, bottom: bottom * H, left: left * W, right: (1 - left) * W };
  const inner = box.right - box.left - (card ? 0.08 * W : 0);
  const avail = box.bottom - box.top - (card ? 0.06 * W : 0);
  const u = W / 1080;
  const base = { invite: 52, names: 92, age: 38, title: 28, when: 36, venue: 31 };
  let scale = 1.3;
  for (; scale > 0.42; scale -= 0.04) {
    const s = (n: number) => n * u * scale;
    const many = f.events.length > 1;
    let h = lines(f.invite, s(base.invite), inner) * s(base.invite) * 1.2;
    if (f.age) h += s(base.age) * 1.3 + s(14);
    h += s(26) + lines(f.names, s(base.names), inner, 0.68) * s(base.names) * 1.15;
    h += s(30) + s(2) + s(26);
    for (const e of f.events) {
      if (many) h += lines(`${e.title} · ${e.day}`, s(base.title), inner) * s(base.title) * 1.3;
      h += lines(e.when, s(base.when), inner) * s(base.when) * 1.25;
      h += lines(e.venue, s(base.venue), inner) * s(base.venue) * 1.25;
      h += s(22);
    }
    // самое длинное слово должно поместиться в строку (перенести слово Satori не может)
    const word = (t: string) => Math.max(0, ...t.split(/\s+/).map((w) => w.length));
    const fits =
      word(f.names) * s(base.names) * 0.68 <= inner &&
      word(f.invite) * s(base.invite) * 0.62 <= inner &&
      f.events.every((e) => word(e.venue) * s(base.venue) * 0.62 <= inner && word(e.when) * s(base.when) * 0.62 <= inner);
    if (h <= avail && fits) break;
  }
  scale = Math.max(0.42, Number(scale.toFixed(2)));
  const sizes = Object.fromEntries(Object.entries(base).map(([k, v]) => [k, Math.round(v * u * scale)])) as FaceLayout["sizes"];
  return { card, box, scale, sizes };
}

const dataUrl = (b: Buffer, type = "png") => `data:image/${type};base64,${b.toString("base64")}`;

function alpha(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export type FaceOptions = {
  /** Печать: подпись «Онлайн таклифнома» под QR */
  print?: boolean;
  /** Только для теста раскладки: текст невидим (сравнение «с текстом / без» показывает, где текст) */
  hideText?: boolean;
};

/** Лицо приглашения 9:16 шириной W */
export async function renderFace(order: OrderRecord, url: string, W: number, lang: InviteLang, opts: FaceOptions = {}) {
  const design = getDesign(order.templateId);
  if (!design) throw Error("Unknown design");
  const look = lookOf(design.id);
  const H = Math.round((W * 16) / 9);
  const f = keepsakeFields(order, lang);
  const L = faceLayout(look, f, W);
  const u = W / 1080;
  const platePath = join(ROOT, "assets/keepsake/plates", `${design.id}.webp`);
  let plate: string | null = null;
  try {
    plate = dataUrl(await sharp(await readFile(platePath)).resize(W, H, { fit: "cover" }).jpeg({ quality: 90 }).toBuffer(), "jpeg");
  } catch {
    /* нет подложки (новый дизайн до съёмки) — ровная бумага дизайна */
  }
  const qrSize = Math.round(220 * u);
  // QR — вектором (SVG): чёткие модули при любом размере, читается и с печати
  const qrSvg = await QRCode.toString(url, {
    type: "svg",
    margin: 4,
    errorCorrectionLevel: "M",
    color: { dark: "#1f1b17", light: "#ffffff" },
  });
  const qr = `data:image/svg+xml;base64,${Buffer.from(qrSvg).toString("base64")}`;
  const [namesFont, bodyFont, italicFont, fallback] = await Promise.all([
    font(look.namesFont),
    font(look.bodyFont),
    font("italic"),
    font("lora-regular"),
  ]);
  const ink = opts.hideText ? "transparent" : look.ink;
  const accent = opts.hideText ? "transparent" : look.accent;
  const short = new URL(url).host.replace(/^www\./, "") + new URL(url).pathname;
  const many = f.events.length > 1;
  const S = L.sizes;
  const inner = L.box.right - L.box.left;

  const response = new ImageResponse(
    <div style={{ display: "flex", position: "relative", width: W, height: H, background: look.paper, fontFamily: "Body" }}>
      {plate && <img alt="" src={plate} width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }} />}
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: L.box.left,
          top: L.box.top,
          width: inner,
          height: L.box.bottom - L.box.top,
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: L.card ? `${Math.round(30 * u)}px ${Math.round(43 * u)}px` : 0,
          background: L.card ? alpha(look.paper, 0.9) : "transparent",
          border: L.card ? `${Math.max(1, Math.round(2 * u))}px solid ${alpha(look.accent, 0.55)}` : "none",
          borderRadius: L.card ? Math.round(28 * u) : 0,
        }}
      >
        <div style={{ display: "flex", fontFamily: "Italic", fontSize: S.invite, lineHeight: 1.2, color: accent, textAlign: "center", justifyContent: "center" }}>
          {f.invite}
        </div>
        {f.age && (
          <div style={{ display: "flex", fontSize: S.age, marginTop: Math.round(14 * u * L.scale), color: ink }}>{f.age}</div>
        )}
        <div
          style={{
            display: "flex",
            fontFamily: "Names",
            fontStyle: look.namesItalic ? "italic" : "normal",
            fontSize: S.names,
            lineHeight: 1.15,
            marginTop: Math.round(26 * u * L.scale),
            color: ink,
            flexWrap: "wrap",
            justifyContent: "center",
            textAlign: "center",
            maxWidth: "100%",
          }}
        >
          {f.names}
        </div>
        <div
          style={{
            display: "flex",
            width: Math.round(150 * u),
            height: Math.max(1, Math.round(2 * u)),
            background: accent,
            margin: `${Math.round(30 * u * L.scale)}px 0 ${Math.round(26 * u * L.scale)}px`,
          }}
        />
        {f.events.map((e, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginTop: i ? Math.round(22 * u * L.scale) : 0,
              maxWidth: "100%",
            }}
          >
            {many && (
              <div style={{ display: "flex", fontSize: S.title, lineHeight: 1.3, color: accent, letterSpacing: 1, textAlign: "center" }}>
                {`${e.title} · ${e.day}`}
              </div>
            )}
            <div style={{ display: "flex", fontSize: S.when, lineHeight: 1.25, color: ink, textAlign: "center" }}>{e.when}</div>
            {e.venue && (
              <div style={{ display: "flex", fontSize: S.venue, lineHeight: 1.25, color: ink, opacity: 0.85, textAlign: "center", justifyContent: "center" }}>
                {e.venue}
              </div>
            )}
          </div>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: Math.round(W * 0.1),
          width: Math.round(W * 0.8),
          top: Math.round(H * 0.805),
          height: Math.round(H * 0.15),
          alignItems: "center",
          justifyContent: "center",
          gap: Math.round(26 * u),
          background: alpha(look.paper, 0.86),
          borderRadius: Math.round(24 * u),
          padding: `0 ${Math.round(24 * u)}px`,
        }}
      >
        <div style={{ display: "flex", background: "#fff", borderRadius: Math.round(12 * u) }}>
          <img alt="" src={qr} width={qrSize} height={qrSize} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: Math.round(W * 0.42) }}>
          {opts.print && (
            <div style={{ display: "flex", fontFamily: "Italic", fontSize: Math.round(32 * u), color: accent, marginBottom: Math.round(8 * u) }}>
              {f.online}
            </div>
          )}
          <div style={{ display: "flex", fontSize: Math.round(25 * u), lineHeight: 1.25, color: ink }}>{f.scan}</div>
          <div style={{ display: "flex", fontSize: Math.round(23 * u), marginTop: Math.round(10 * u), color: accent }}>{short}</div>
        </div>
      </div>
    </div>,
    {
      width: W,
      height: H,
      fonts: [
        { name: "Names", data: await namesFont, weight: 400, style: look.namesItalic ? "italic" : "normal" },
        { name: "Body", data: await bodyFont, weight: 400, style: "normal" },
        { name: "Italic", data: await italicFont, weight: 400, style: "normal" },
        // запасной шрифт: буквы ў қ ғ ҳ, которых нет в шрифте дизайна
        { name: "Fallback", data: await fallback, weight: 400, style: "normal" },
      ],
    },
  );
  return Buffer.from(await response.arrayBuffer());
}

/** Проверка адреса: только точная https-ссылка этого заказа (как у картинки для статуса) */
export function checkUrl(order: OrderRecord, url: string) {
  const target = new URL(url);
  const local = process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(target.hostname);
  const own = new URL(process.env.PUBLIC_BASE_URL?.trim() || "https://inviteizi.vercel.app").host;
  if (
    (target.host !== own && !local) ||
    (target.protocol !== "https:" && !local) ||
    target.username ||
    target.password ||
    target.search ||
    target.hash ||
    target.pathname !== "/" + order.slug
  )
    throw Error("Exact HTTPS invitation required");
}

export const keepsakeLang = (order: OrderRecord): InviteLang => order.data.mainLang ?? "uz";

/** PNG выбранного формата */
export async function keepsakePng(order: OrderRecord, url: string, kind: KeepsakeKind, opts: FaceOptions = {}) {
  checkUrl(order, url);
  const lang = keepsakeLang(order);
  const { w, h } = canvasSize(kind);
  const box = faceBox(kind);
  const face = await renderFace(order, url, box.w, lang, { ...opts, print: kind === "a5" || kind === "a6" });
  if (kind === "story") return new Uint8Array(face);
  // фон: та же подложка, растянутая и размытая, поверх — бумага дизайна; лицо — с мягкой тенью
  const look = lookOf(order.templateId);
  let bg: Buffer;
  try {
    bg = await sharp(join(ROOT, "assets/keepsake/plates", `${order.templateId}.webp`))
      .resize(Math.round(w / 4), Math.round(h / 4), { fit: "cover" })
      .blur(10)
      .resize(w, h)
      .toBuffer();
  } catch {
    bg = await sharp({ create: { width: w, height: h, channels: 3, background: look.paper } }).png().toBuffer();
  }
  const veil = Buffer.from(`<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${look.paper}" fill-opacity="0.55"/></svg>`);
  const r = Math.round(box.w * 0.02);
  const shadow = Buffer.from(
    `<svg width="${w}" height="${h}"><defs><filter id="s"><feGaussianBlur stdDeviation="${Math.round(box.w * 0.012)}"/></filter></defs><rect x="${box.x}" y="${box.y + Math.round(box.w * 0.008)}" width="${box.w}" height="${box.h}" rx="${r}" fill="#000" fill-opacity="0.22" filter="url(#s)"/></svg>`,
  );
  const mask = Buffer.from(`<svg width="${box.w}" height="${box.h}"><rect width="${box.w}" height="${box.h}" rx="${r}" fill="#fff"/></svg>`);
  const rounded = await sharp(face).ensureAlpha().composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  const out = await sharp(bg)
    .composite([
      { input: veil, left: 0, top: 0 },
      { input: shadow, left: 0, top: 0 },
      { input: rounded, left: box.x, top: box.y },
    ])
    .png({ compressionLevel: 8 })
    .withMetadata({ density: kind === "feed" ? 72 : DPI })
    .toBuffer();
  return new Uint8Array(out);
}

/** PDF для печати: страница = формат + поля под обрез; TrimBox/BleedBox выставлены для типографии */
export async function keepsakePdf(order: OrderRecord, url: string, kind: PrintKind) {
  const png = await keepsakePng(order, url, kind);
  const jpg = await sharp(png).flatten({ background: "#ffffff" }).jpeg({ quality: 92, chromaSubsampling: "4:4:4" }).toBuffer();
  const pt = (mm: number) => (mm / 25.4) * 72;
  const t = PRINT_MM[kind];
  const doc = await PDFDocument.create();
  doc.setTitle(`InviteIZI — ${order.slug} (${kind.toUpperCase()})`);
  doc.setCreator("InviteIZI");
  doc.setProducer("InviteIZI");
  const W = pt(t.w + 2 * BLEED_MM),
    H = pt(t.h + 2 * BLEED_MM);
  const page = doc.addPage([W, H]);
  page.drawImage(await doc.embedJpg(jpg), { x: 0, y: 0, width: W, height: H });
  page.setBleedBox(0, 0, W, H);
  page.setTrimBox(pt(BLEED_MM), pt(BLEED_MM), pt(t.w), pt(t.h));
  return doc.save();
}

/** Имя файла для клиента: aziz-madina-status.png, aziz-madina-A5.pdf */
export function keepsakeFileName(order: OrderRecord, kind: KeepsakeKind) {
  const name = { story: "status", feed: "post", a5: "A5", a6: "A6" }[kind];
  return `${order.slug}-${name}.${kind === "a5" || kind === "a6" ? "pdf" : "png"}`;
}
