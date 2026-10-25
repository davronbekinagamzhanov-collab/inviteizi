import { ImageResponse } from "next/og";
import { getInvitationBySlug } from "@/lib/orders";
import { parseWeddingDate } from "@/lib/wedding-date";
import { t } from "@/texts/uz-cyrl";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getDesign } from "@/templates/registry";
import { reportFont, reportText } from "@/lib/chart";

// Картинка ссылки в WhatsApp / Telegram: имена и дата на молочном фоне
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = t.site.title;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getInvitationBySlug(slug).catch(() => null);
  const d = page && page.mode !== "expired" ? page.data : null;

  const eyebrow = d ? t.invitationPage.inviteTo[d.occasion] : t.site.title;
  const rawNames = reportText(d ? t.invitationPage.names(d) : "InviteIZI");
  const names = Array.from(rawNames).slice(0, 100).join("") + (rawNames.length > 100 ? "…" : "");
  const first = d?.events[0];
  const w = first ? parseWeddingDate(first.date, first.time) : null;
  const date = w ? `${t.date.long(w.day, w.monthIndex, w.year)} · ${t.date.at(first!.time)}` : "";
  const brand = "InviteIZI";

  const font = await reportFont();
  const fonts = [{ name: "Body", data: font, weight: 400 as const, style: "normal" as const }];
  const design = d && page ? getDesign(page.order.templateId) : undefined;
  // Only project-owned covers; never a customer-supplied URL or private event address.
  const cover = design ? await readFile(path.join(process.cwd(), "public/og", `${design.id}.jpg`)).then(bytes => `data:image/jpeg;base64,${bytes.toString("base64")}`).catch(() => null) : null;
  const namesSize = names.length > 45 ? 42 : names.length > 28 ? 54 : 68;

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
        {/* ImageResponse requires a native img element, not next/image. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {cover ? <img src={cover} alt="" width={380} height={550} style={{ position: "absolute", left: 40, top: 40, objectFit: "cover", borderRadius: 20 }} /> : null}
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
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: cover ? 680 : 1000, marginLeft: cover ? 420 : 0, padding: "0 42px", textAlign: "center" }}>
          <div style={{ fontSize: 27, letterSpacing: 2, color: "#a87a28" }}>{eyebrow}</div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 26, marginBottom: 22 }}>
            <div style={{ width: 120, height: 2, background: "#b8892f" }} />
            <div style={{ width: 16, height: 16, margin: "0 18px", transform: "rotate(45deg)", border: "2px solid #b8892f" }} />
            <div style={{ width: 120, height: 2, background: "#b8892f" }} />
          </div>
          <div style={{ fontSize: namesSize, lineHeight: 1.15, overflowWrap: "break-word" }}>{names}</div>
          {date ? <div style={{ marginTop: 30, fontSize: 28, color: "#6f5a46" }}>{date}</div> : null}
          <div style={{ marginTop: 36, fontSize: 22, letterSpacing: 5, color: "#b8892f" }}>{brand}</div>
        </div>
      </div>
    ),
    { ...size, fonts, headers: { "Cache-Control": "no-store" } },
  );
}
