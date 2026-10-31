"use client";

import { MotionConfig } from "motion/react";
import { useEffect, type CSSProperties, type ReactNode } from "react";
import type { Invitation } from "./useInvitation";
import { MusicButton } from "./MusicButton";
import { Watermark } from "./Watermark";
import { BrandBadge, BrandFooter } from "./Brand";
import { Rsvp } from "./Rsvp";

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
  pageColor,
  children,
}: {
  inv: Invitation;
  style: CSSProperties;
  className?: string;
  backdropClassName?: string;
  /** Классы next/font дизайна: должны стоять там же, где style, иначе --d-* не увидят шрифты */
  fontsClassName?: string;
  musicButtonClassName?: string;
  /** Цвет за краями страницы (виден, когда телефон «пружинит» при листании) */
  pageColor?: string;
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

  return (
    // reducedMotion="user": если в телефоне отключены анимации, не мучаем гостя
    <MotionConfig reducedMotion="user">
      <div style={style} className={`min-h-svh ${fontsClassName} ${backdropClassName}`}>
        <div
          data-opened={inv.opened}
          className={`relative mx-auto min-h-svh w-full max-w-[430px] overflow-x-clip font-body ${className ?? ""}`}
        >
          {inv.audioElement}

          {children}

          {inv.data.rsvpSlug && <Rsvp slug={inv.data.rsvpSlug} preview={inv.mode === "demo"} />}
          <BrandFooter />

          {inv.hasMusic && inv.opened && (
            <MusicButton
              playing={inv.playing}
              onToggle={inv.toggleMusic}
              className={musicButtonClassName}
              raised={inv.mode === "demo"}
            />
          )}
          {inv.opened && <BrandBadge raised={inv.mode === "demo"} />}
          {inv.mode === "demo" && <Watermark />}
        </div>
      </div>
    </MotionConfig>
  );
}
