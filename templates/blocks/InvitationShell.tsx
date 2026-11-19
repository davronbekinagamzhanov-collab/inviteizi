"use client";

import { MotionConfig } from "motion/react";
import { useEffect, type CSSProperties, type ReactNode } from "react";
import type { Invitation } from "./useInvitation";
import { MusicButton } from "./MusicButton";
import { Watermark } from "./Watermark";
import { BrandBadge, BrandFooter, type PhotoCredit } from "./Brand";
import { SoftBrandBadge, SoftBrandFooter } from "./BrandSoft";
import { Rsvp, type RsvpLook } from "./Rsvp";
import { LangSwitch } from "./LangSwitch";
import { PaidRefresh } from "./PaidRefresh";
import { TapHint } from "./TapHint";

/**
 * Оболочка любого дизайна: колонка шириной телефона, аудио, кнопка ▶/⏸, водяной знак «НАМУНА».
 * style — цвета и шрифты дизайна (CSS-переменные).
 * На компьютере страница стоит по центру шириной 430px; backdropClassName — фон по бокам.
 */
export function InvitationShell({
  inv,
  style,
  className,
  backdropClassName = "bg-paper",
  fontsClassName = "",
  musicButtonClassName,
  musicVariant,
  pageColor,
  rsvpLook,
  credits,
  creditClassName,
  epilogue,
  brandVariant = "default",
  children,
}: {
  inv: Invitation;
  style: CSSProperties;
  className?: string;
  backdropClassName?: string;
  /** Классы next/font дизайна: должны стоять там же, где style, иначе --d-* не увидят шрифты */
  fontsClassName?: string;
  musicButtonClassName?: string;
  /** Вид кнопки музыки: soft — круглая с линейной иконкой (натуральные дизайны) */
  musicVariant?: "default" | "soft";
  /** Цвет за краями страницы (виден, когда телефон «пружинит» при листании) */
  pageColor?: string;
  /** Форма «Келасизми?» в цветах дизайна (нет — прежняя карточка) */
  rsvpLook?: RsvpLook;
  /** Авторы фото дизайна: строка «Сурат: …» внизу */
  credits?: PhotoCredit[];
  creditClassName?: string;
  /** Блок после формы ответов (подпись семьи), перед бейджем */
  epilogue?: ReactNode;
  /** "soft" — плашки InviteIZI в цветах дизайна (только натуральные дизайны) */
  brandVariant?: "default" | "soft";
  children: ReactNode;
}) {
  useEffect(() => {
    if (!pageColor) return;
    const el = document.documentElement;
    el.style.backgroundColor = pageColor;
    return () => {
      el.style.backgroundColor = "";
    };
  }, [pageColor]);

  // ?render=video (видео «Сақлаб олиш», снимок дизайна): без кнопок, бейджей и плашек, конверт открывается сам
  useEffect(() => {
    const render = new URLSearchParams(window.location.search).get("render");
    if (render !== "video" && render !== "plate") return;
    const el = document.documentElement;
    el.dataset.render = render;
    const timer = window.setTimeout(
      () => document.querySelector<HTMLElement>("[data-open]:not(:disabled)")?.click(),
      render === "video" ? 1600 : 50,
    );
    return () => {
      window.clearTimeout(timer);
      delete el.dataset.render;
    };
  }, []);

  return (
    // reducedMotion="user": если в телефоне отключены анимации, не мучаем гостя
    <MotionConfig reducedMotion="user">
      <div
        style={inv.langReady ? style : { ...style, visibility: "hidden" }}
        className={`min-h-svh ${fontsClassName} ${backdropClassName}`}
      >
        <div
          data-opened={inv.opened}
          className={`relative mx-auto min-h-svh w-full max-w-[430px] overflow-x-clip font-body ${className ?? ""}`}
        >
          {inv.audioElement}

          {children}

          {inv.data.rsvpSlug && <Rsvp slug={inv.data.rsvpSlug} preview={inv.mode === "demo"} look={rsvpLook} />}
          {epilogue}
          {brandVariant === "soft" ? (
            <SoftBrandFooter credits={credits} />
          ) : (
            <BrandFooter credits={credits} creditClassName={creditClassName} />
          )}

          {inv.hasMusic && inv.opened && (
            <MusicButton
              playing={inv.playing}
              onToggle={inv.toggleMusic}
              blocked={inv.musicBlocked}
              className={musicButtonClassName}
              variant={musicVariant}
              raised={inv.mode === "demo"}
            />
          )}
          {inv.opened && (brandVariant === "soft" ? <SoftBrandBadge /> : <BrandBadge raised={inv.mode === "demo"} />)}
          {/* v2: язык гостя и кнопка музыки на первом экране дизайнов без заставки */}
          <LangSwitch inv={inv} />
          {inv.mode === "demo" && <Watermark />}
          {inv.mode === "demo" && <PaidRefresh />}
          {!inv.opened && <TapHint inv={inv} />}
        </div>
      </div>
    </MotionConfig>
  );
}
