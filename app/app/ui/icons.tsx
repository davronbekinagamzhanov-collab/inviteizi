/** Иконки приложения: линейные SVG в стиле сердца (обводка 1.8, скругления), цвет — currentColor */
import type { ReactNode } from "react";
import s from "../app.module.css";

function Svg({ size = 22, children, className }: { size?: number; children: ReactNode; className?: string }) {
  return (
    <svg className={`${s.icon} ${className ?? ""}`} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

export const PlayIcon = (p: { size?: number }) => (
  <Svg {...p}>
    <path className={s.iconFill} d="M8.2 5.6c0-.9 1-1.5 1.8-1l9 5.6c.8.5.8 1.6 0 2.1l-9 5.6c-.8.5-1.8-.1-1.8-1z" />
  </Svg>
);
export const PauseIcon = (p: { size?: number }) => (
  <Svg {...p}>
    <rect className={s.iconFill} x="6.5" y="5" width="3.8" height="14" rx="1.4" />
    <rect className={s.iconFill} x="13.7" y="5" width="3.8" height="14" rx="1.4" />
  </Svg>
);
/** Кружок загрузки: дуга вращается (reduced-motion — медленно пульсирует) */
export const SpinnerIcon = (p: { size?: number }) => (
  <Svg {...p} className={s.spin}>
    <circle cx="12" cy="12" r="8.5" opacity=".22" />
    <path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5" />
  </Svg>
);
export const ExpandIcon = (p: { size?: number }) => (
  <Svg {...p}>
    <path d="M14.5 4.5h5v5M9.5 19.5h-5v-5M19.5 4.5l-6 6M4.5 19.5l6-6" />
  </Svg>
);
export const CloseIcon = (p: { size?: number }) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);
export const TrashIcon = (p: { size?: number }) => (
  <Svg {...p}>
    <path d="M4.5 7h15M9.5 7V5.2c0-.7.5-1.2 1.2-1.2h2.6c.7 0 1.2.5 1.2 1.2V7M6.5 7l.8 11.6c.1 1 .9 1.9 2 1.9h5.4c1.1 0 1.9-.9 2-1.9L17.5 7M10.2 11v5.5M13.8 11v5.5" />
  </Svg>
);
export const InfoIcon = (p: { size?: number }) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M12 11v5.4" />
    <circle className={s.iconFill} cx="12" cy="7.9" r="1.1" />
  </Svg>
);
export const FolderIcon = (p: { size?: number }) => (
  <Svg {...p}>
    <path d="M3.8 7.2c0-1 .8-1.8 1.8-1.8h3.6l2 2.1h7.2c1 0 1.8.8 1.8 1.8v7.9c0 1-.8 1.8-1.8 1.8H5.6c-1 0-1.8-.8-1.8-1.8z" />
  </Svg>
);
export const CameraIcon = (p: { size?: number }) => (
  <Svg {...p}>
    <path d="M4 8.6c0-1 .8-1.8 1.8-1.8h2l1.4-2h5.6l1.4 2h2c1 0 1.8.8 1.8 1.8v8.6c0 1-.8 1.8-1.8 1.8H5.8c-1 0-1.8-.8-1.8-1.8z" />
    <circle cx="12" cy="12.6" r="3.4" />
  </Svg>
);
export const CheckIcon = (p: { size?: number }) => (
  <Svg {...p}>
    <path d="M5 12.5l4.4 4.3L19 7.4" />
  </Svg>
);
export const ClockIcon = (p: { size?: number }) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M12 7.4V12l3.2 2" />
  </Svg>
);
export const BackIcon = (p: { size?: number }) => (
  <Svg {...p}>
    <path d="M14.5 5.5L8 12l6.5 6.5" />
  </Svg>
);
export const PencilIcon = (p: { size?: number }) => (
  <Svg {...p}>
    <path d="M14.8 5.6l3.6 3.6M5 19l1-4.3L15.6 5a1.6 1.6 0 0 1 2.3 0l1.1 1.1a1.6 1.6 0 0 1 0 2.3L9.3 18z" />
  </Svg>
);
