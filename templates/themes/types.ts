import type { CSSProperties } from "react";
import type { InvitationData, InvitationMode } from "@/lib/types";

/** Что получает любой дизайн: данные заказа и режим (демо/полный) */
export type TemplateProps = {
  data: InvitationData;
  mode: InvitationMode;
};

/** Цвета дизайна */
export type Palette = {
  primary: string; // основной цвет (конверт, бархат, кнопки)
  primaryDark: string; // самый тёмный цвет
  gold: string; // золото: тёмный край градиента
  goldLight: string; // золото: блик
  paper: string; // фон страницы с текстом
  ink: string; // цвет текста
  muted: string; // второстепенный текст
  accent?: string; // дополнительный цвет дизайна (по умолчанию = gold)
};

/** Шрифты дизайна: CSS-переменные из next/font */
export type DesignFonts = {
  display: string; // имена, заголовки
  accent: string; // украшающий
  body: string; // текст
};

export function designVars(p: Palette, fonts?: DesignFonts): CSSProperties {
  return {
    "--c-primary": p.primary,
    "--c-primary-dark": p.primaryDark,
    "--c-gold": p.gold,
    "--c-gold-light": p.goldLight,
    "--c-paper": p.paper,
    "--c-ink": p.ink,
    "--c-muted": p.muted,
    "--c-accent": p.accent ?? p.gold,
    ...(fonts && {
      "--d-display": fonts.display,
      "--d-accent": fonts.accent,
      "--d-body": fonts.body,
    }),
  } as CSSProperties;
}
