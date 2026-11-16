"use client";
/* eslint-disable @next/next/no-img-element -- картина дизайна и фото клиента: готовые сжатые файлы */
/**
 * «Оддий» — один экран (17.11.2026): без прокрутки, свайпа, конверта и анимации открытия.
 * Имена, тадбиры (дата, время, место, кнопка карты), «Жавоб бериш» (ответ гостя — поверх экрана), кнопка музыки.
 * Палитра, шрифт и картина — свои у каждого дизайна (templates/one-page-looks.ts).
 * Много текста (2–3 тадбира, длинные имена) — уменьшаются шрифт и отступы, прокрутки нет.
 * Вёрстка не зависит от прокрутки — основа будущей печатной версии.
 */
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import localFont from "next/font/local";
import type { TemplateProps } from "../themes/types";
import { t } from "@/texts/uz-cyrl";
import { useInvitation } from "./useInvitation";
import { MusicButton } from "./MusicButton";
import { LangSwitch } from "./LangSwitch";
import { Watermark } from "./Watermark";
import { PaidRefresh } from "./PaidRefresh";
import { BrandBadge } from "./Brand";
import { Rsvp } from "./Rsvp";
import { melody as defaultMelody } from "../themes/oq-ot/melody";
import { ONE_PAGE_LOOKS, type OnePageLook } from "../one-page-looks";
import { FrameDividerMark, FrameLayer } from "./OnePageFrame";

const vollkorn = localFont({
  preload: false,
  src: "../../assets/fonts/google/vollkorn/Vollkorn[wght].woff2",
  variable: "--op-vollkorn",
  display: "swap",
});
const piazzolla = localFont({
  preload: false,
  src: "../../assets/fonts/google/piazzolla/Piazzolla[opsz,wght].woff2",
  variable: "--op-piazzolla",
  display: "swap",
});
const cormorant = localFont({
  preload: false,
  src: "../../assets/fonts/google/cormorantgaramond/CormorantGaramond[wght].woff2",
  variable: "--op-cormorant",
  display: "swap",
});
const unicase = localFont({
  preload: false,
  src: "../../assets/fonts/google/cormorantunicase/CormorantUnicase-Medium.woff2",
  variable: "--op-unicase",
  display: "swap",
});
const FONT_VARS = `${vollkorn.variable} ${piazzolla.variable} ${cormorant.variable} ${unicase.variable}`;
const FAMILY: Record<OnePageLook["font"], string> = {
  vollkorn: "var(--op-vollkorn), Georgia, serif",
  piazzolla: "var(--op-piazzolla), Georgia, serif",
  cormorant: "var(--op-cormorant), Georgia, serif",
  unicase: "var(--op-unicase), var(--op-cormorant), Georgia, serif",
};

/** Шаги ужатия: 1 → 0.56. Подбирается, пока содержимое не влезет в экран */
const MIN_SCALE = 0.56;

export function OnePage({ id, data, mode }: TemplateProps & { id: string }) {
  const look = ONE_PAGE_LOOKS[id] ?? ONE_PAGE_LOOKS.default;
  const inv = useInvitation(data, mode, { opening: false, melody: defaultMelody });
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Подобрать масштаб: содержимое ≤ высоты экрана (шрифты загрузились, сменился язык, повернули телефон)
  useLayoutEffect(() => {
    const fit = () => {
      const b = box.current,
        c = content.current;
      if (!b || !c) return;
      // 1) полный текст, шрифт до 0.8; 2) не влезло — без второстепенного (адрес, приветствие), шрифт до MIN_SCALE
      const shrink = (floor: number) => {
        let s = 1;
        c.style.setProperty("--s", "1");
        while (c.scrollHeight > b.clientHeight && s > floor) {
          s = Math.round((s - 0.04) * 100) / 100;
          c.style.setProperty("--s", String(s));
        }
        return s;
      };
      c.removeAttribute("data-compact");
      let s = shrink(0.8);
      if (c.scrollHeight > b.clientHeight) {
        c.setAttribute("data-compact", "");
        s = shrink(MIN_SCALE);
      }
      setScale(s);
    };
    fit();
    void document.fonts?.ready.then(fit);
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [inv.lang, data]);

  // Цвет за краями страницы и запрет прокрутки документа (всё на одном экране)
  useEffect(() => {
    const el = document.documentElement;
    el.style.backgroundColor = look.paper;
    el.style.overflow = "hidden";
    return () => {
      el.style.backgroundColor = "";
      el.style.overflow = "";
    };
  }, [look.paper]);

  const comp = look.composition ?? (look.art ? "band" : "plain");
  // Медальон: фото клиента → фото дизайна → картина дизайна в круге
  const photo = data.photos?.[0] ?? look.photo ?? (comp === "medallion" ? (look.art ?? null) : null);
  const art = !photo && look.art ? look.art : null;
  const band = comp === "band" && art;
  const padX = look.frame ? 30 : 22;
  const many = inv.program.length > 1;
  const vars = {
    "--op-paper": look.paper,
    "--op-ink": look.ink,
    "--op-accent": look.accent,
    "--op-soft": look.soft,
    "--op-line": look.line,
    "--op-display": FAMILY[look.font],
    // Палитра для бейджа InviteIZI (brandTone читает --c-*): иначе на тёмном «Сапфир» надпись не видна
    "--c-paper": look.paper,
    "--c-ink": look.ink,
    "--c-accent": look.accent,
    "--s": String(scale),
  } as CSSProperties;

  return (
    <div
      className={`${FONT_VARS} fixed inset-0 overflow-hidden`}
      style={{ ...vars, background: look.paper, visibility: inv.langReady ? undefined : "hidden" }}
      data-one-page={id}
    >
      {inv.audioElement}
      <div
        ref={box}
        className="relative mx-auto h-full w-full max-w-[430px] overflow-hidden"
        style={{ color: look.ink }}
      >
        <div ref={content} className="group relative flex h-full flex-col">
          {/* Картина дизайна — полосой сверху, растворяется в бумагу; текст — ниже, в оставшемся месте */}
          {band && (
            <img
              src={band}
              alt=""
              aria-hidden
              data-one-art
              className="pointer-events-none w-full shrink-0 object-cover"
              style={{
                height: "calc(170px * var(--s) * var(--s))",
                maskImage: "linear-gradient(#000 55%, transparent)",
                WebkitMaskImage: "linear-gradient(#000 55%, transparent)",
                opacity: look.dark ? 0.5 : 0.95,
              }}
            />
          )}
          <div
            className="flex flex-1 flex-col items-center justify-center text-center"
            style={{
              padding: `${band ? "calc(4px * var(--s))" : "calc(56px * var(--s))"} ${padX}px ${comp === "bottom" && art ? "calc(8px * var(--s))" : "calc(64px * var(--s))"}`,
              gap: "calc(14px * var(--s))",
            }}
          >
            {comp === "arch" && art && (
              <img
                src={art}
                alt=""
                aria-hidden
                data-one-art
                className="shrink-0 object-cover"
                style={{
                  width: "calc(150px * var(--s) * var(--s))",
                  height: "calc(176px * var(--s) * var(--s))",
                  borderRadius: "999px 999px 14px 14px",
                  boxShadow: `0 0 0 4px ${look.paper}, 0 0 0 5px ${look.accent}`,
                }}
              />
            )}
            {photo && (
              <img
                src={photo}
                alt=""
                className="shrink-0 rounded-full object-cover"
                style={{
                  width: "calc(112px * var(--s))",
                  height: "calc(112px * var(--s))",
                  boxShadow: `0 0 0 3px ${look.paper}, 0 0 0 4.5px ${look.accent}`,
                }}
              />
            )}
            <p
              className="uppercase"
              style={{
                color: look.accent,
                letterSpacing: "0.22em",
                fontSize: "calc(13px * var(--s))",
                fontWeight: 600,
              }}
            >
              {t.occasionTitles[data.occasion]}
            </p>
            <h1
              data-one-names
              style={{
                fontFamily: "var(--op-display)",
                fontSize: "calc(clamp(30px, 10.5vw, 44px) * var(--s))",
                lineHeight: 1.08,
                fontWeight: 500,
                overflowWrap: "anywhere",
              }}
            >
              {t.invitationPage.names(inv.data)}
            </h1>
            {inv.text.greeting && (
              // Второстепенное: скрывается, если иначе не влезает в экран (data-compact)
              <p
                data-optional
                className="group-data-[compact]:hidden"
                style={{ fontSize: "calc(15px * var(--s))", lineHeight: 1.35, opacity: 0.85, maxWidth: 330 }}
              >
                {inv.text.greeting}
              </p>
            )}
            <FrameDividerMark kind={look.frame?.divider ?? "line"} accent={look.accent} />
            <ol className="flex w-full flex-col" style={{ gap: "calc(12px * var(--s))" }}>
              {inv.program.map((e, i) => (
                <li
                  key={i}
                  data-one-event
                  className="flex flex-col items-center"
                  style={{ gap: "calc(3px * var(--s))" }}
                >
                  {many && (
                    <b style={{ color: look.accent, fontSize: "calc(14px * var(--s))", letterSpacing: "0.06em" }}>
                      {e.title}
                    </b>
                  )}
                  <p style={{ fontFamily: "var(--op-display)", fontSize: "calc(22px * var(--s))", lineHeight: 1.15 }}>
                    {t.date.long(e.when.day, e.when.monthIndex, e.when.year)}
                  </p>
                  <p style={{ fontSize: "calc(15px * var(--s))" }}>{t.date.dayAndTime(e.when.weekdayIndex, e.time)}</p>
                  <p style={{ fontSize: "calc(15px * var(--s))", fontWeight: 600, overflowWrap: "anywhere" }}>
                    {e.venueName}
                  </p>
                  {e.address && (
                    <p
                      data-optional
                      className="group-data-[compact]:hidden"
                      style={{ fontSize: "calc(13px * var(--s))", opacity: 0.75, overflowWrap: "anywhere" }}
                    >
                      {e.address}
                    </p>
                  )}
                  {e.mapHref && (
                    <a
                      href={e.mapHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-brand-trigger
                      className="inline-flex items-center rounded-full font-semibold active:scale-95"
                      style={{
                        marginTop: "calc(4px * var(--s))",
                        padding: "calc(8px * var(--s)) calc(18px * var(--s))",
                        fontSize: "calc(14px * var(--s))",
                        background: look.soft,
                        color: look.ink,
                        border: `1px solid ${look.line}`,
                      }}
                    >
                      📍 {t.venue.openMap}
                    </a>
                  )}
                </li>
              ))}
            </ol>
            {inv.data.rsvpSlug && (
              <button
                type="button"
                onClick={() => setRsvpOpen(true)}
                data-one-rsvp
                className="rounded-full font-semibold active:scale-95"
                style={{
                  marginTop: "calc(6px * var(--s))",
                  padding: "calc(12px * var(--s)) calc(28px * var(--s))",
                  fontSize: "calc(16px * var(--s))",
                  background: look.accent,
                  color: look.paper,
                }}
              >
                {t.onePage.answer}
              </button>
            )}
          </div>
          {comp === "bottom" && art && (
            <img
              src={art}
              alt=""
              aria-hidden
              data-one-art
              className="pointer-events-none w-full shrink-0 object-cover"
              style={{
                height: "calc(150px * var(--s) * var(--s))",
                maskImage: "linear-gradient(transparent, #000 45%)",
                WebkitMaskImage: "linear-gradient(transparent, #000 45%)",
                opacity: look.dark ? 0.5 : 0.95,
              }}
            />
          )}
        </div>
        {look.frame && <FrameLayer id={id} frame={look.frame} accent={look.accent} line={look.line} />}

        {inv.hasMusic && (
          <MusicButton
            playing={inv.playing}
            onToggle={inv.toggleMusic}
            blocked={inv.musicBlocked}
            raised={inv.mode === "demo"}
          />
        )}
        <BrandBadge raised={inv.mode === "demo"} />
        <LangSwitch inv={inv} />
        {inv.mode === "demo" && <Watermark />}
        {inv.mode === "demo" && <PaidRefresh />}
      </div>

      {/* Ответ гостя — поверх экрана, своя прокрутка только у окна (страница не прокручивается) */}
      {rsvpOpen && inv.data.rsvpSlug && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.onePage.answer}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => setRsvpOpen(false)}
          data-one-rsvp-dialog
        >
          <div
            className="max-h-[92svh] w-full max-w-[430px] overflow-y-auto pb-6"
            style={{ background: look.paper, borderRadius: "22px 22px 0 0" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end px-3 pt-3">
              <button
                type="button"
                onClick={() => setRsvpOpen(false)}
                className="rounded-full px-4 py-2 text-[15px] font-semibold"
                style={{ background: look.soft, color: look.ink }}
              >
                {t.onePage.close}
              </button>
            </div>
            <Rsvp
              slug={inv.data.rsvpSlug}
              preview={inv.mode === "demo"}
              look={{
                paper: "#fffdf8",
                ink: look.ink,
                line: look.line,
                soft: look.soft,
                accent: look.accent,
                accentInk: look.paper,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default OnePage;
