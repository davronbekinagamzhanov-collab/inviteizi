"use client";

import { MotionConfig } from "motion/react";
import type { CSSProperties, ReactNode } from "react";
import type { Invitation } from "./useInvitation";
import { MusicButton } from "./MusicButton";
import { Watermark } from "./Watermark";

/**
 * Оболочка любого дизайна: аудио, кнопка ▶/⏸, водяной знак «НАМУНА».
 * style — цвета и шрифты дизайна (CSS-переменные).
 */
export function InvitationShell({
  inv,
  style,
  className,
  musicButtonClassName,
  children,
}: {
  inv: Invitation;
  style: CSSProperties;
  className?: string;
  musicButtonClassName?: string;
  children: ReactNode;
}) {
  return (
    // reducedMotion="user": если в телефоне отключены анимации, не мучаем гостя
    <MotionConfig reducedMotion="user">
      <div style={style} className={`min-h-svh font-body ${className ?? ""}`}>
        {inv.audioElement}

        {children}

        {inv.musicUrl && inv.opened && (
          <MusicButton
            playing={inv.playing}
            onToggle={inv.toggleMusic}
            className={musicButtonClassName}
          />
        )}
        {inv.mode === "demo" && <Watermark />}
      </div>
    </MotionConfig>
  );
}
