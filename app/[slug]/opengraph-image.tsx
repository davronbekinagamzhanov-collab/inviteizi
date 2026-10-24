import { ImageResponse } from "next/og";
import { getInvitationBySlug } from "@/lib/orders";
import { parseWeddingDate } from "@/lib/wedding-date";
import { t } from "@/texts/uz-cyrl";

// Картинка ссылки в WhatsApp / Telegram: имена и дата на молочном фоне
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = t.site.title;

/**
 * Шрифт с кириллицей (ў қ ғ ҳ) с Google Fonts: только нужные буквы (параметр text), формат TTF.
 * Не получилось — картинка рисуется без своего шрифта (не падаем).
 */
async function googleFont(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}&text=${encodeURIComponent(text)}`,
    ).then((r) => r.text());
    const src = /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/.exec(css)?.[1];
    if (!src) return null;
    return await fetch(src).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getInvitationBySlug(slug).catch(() => null);
  const d = page && page.mode !== "expired" ? page.data : null;

  const eyebrow = d ? t.invitationPage.inviteTo[d.occasion] : t.site.title;
  const names = d ? t.invitationPage.names(d) : "InviteIZI";
  const first = d?.events[0];
  const w = first ? parseWeddingDate(first.date, first.time) : null;
  const date = w ? `${t.date.long(w.day, w.monthIndex, w.year)} · ${t.date.at(first!.time)}` : "";
  const brand = "InviteIZI";

  const all = `${eyebrow}${names}${date}${brand}`;
  const [display, body] = await Promise.all([
    googleFont("Cormorant Garamond", 600, names + brand),
    googleFont("PT Serif", 400, all),
  ]);
  const fonts = [
    display && { name: "Display", data: display, weight: 600 as const, style: "normal" as const },
    body && { name: "Body", data: body, weight: 400 as const, style: "normal" as const },
  ].filter((f) => !!f);

  const namesSize = names.length > 28 ? 64 : names.length > 18 ? 80 : 96;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(120% 90% at 50% 0%, #fffaf2 0%, #f7efe3 55%, #ecdcc4 100%)",
          fontFamily: "Body",
          color: "#3b2a1e",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 28,
            left: 28,
            right: 28,
            bottom: 28,
            border: "2px solid rgba(184,137,47,0.55)",
            borderRadius: 28,
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 42,
            left: 42,
            right: 42,
            bottom: 42,
            border: "1px solid rgba(184,137,47,0.35)",
            borderRadius: 20,
            display: "flex",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 110px", textAlign: "center" }}>
          <div style={{ fontSize: 34, letterSpacing: 4, color: "#a87a28" }}>{eyebrow}</div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 26, marginBottom: 22 }}>
            <div style={{ width: 120, height: 2, background: "#b8892f" }} />
            <div style={{ width: 16, height: 16, margin: "0 18px", transform: "rotate(45deg)", border: "2px solid #b8892f" }} />
            <div style={{ width: 120, height: 2, background: "#b8892f" }} />
          </div>
          <div style={{ fontFamily: "Display", fontSize: namesSize, lineHeight: 1.1, fontWeight: 600 }}>{names}</div>
          {date ? <div style={{ marginTop: 30, fontSize: 36, color: "#6f5a46" }}>{date}</div> : null}
          <div style={{ marginTop: 44, fontSize: 24, letterSpacing: 6, color: "#b8892f" }}>{brand}</div>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined },
  );
}
