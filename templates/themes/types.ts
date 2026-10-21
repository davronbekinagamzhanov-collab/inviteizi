import type { CSSProperties } from "react";
import type { InvitationData, InvitationMode } from "@/lib/types";

/** Что получает любой дизайн: данные заказа, режим (демо/полный) и цветовой вариант */
export type TemplateProps = {
  data: InvitationData;
  mode: InvitationMode;
  color: string;
};

/** Набор цветов одного цветового варианта дизайна */
export type Palette = {
  primary: string; // основной цвет (конверт, бархат, кнопки)
  primaryDark: string; // самый тёмный фон
  gold: string;
  goldLight: string;
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
