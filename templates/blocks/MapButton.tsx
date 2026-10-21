import { t } from "@/texts/uz-cyrl";

const DEFAULT_LOOK =
  "rounded-full bg-primary px-7 py-3.5 text-paper shadow-lg shadow-primary/25 ring-1 ring-gold/60";

/** Кнопка «Харитада очиш». href — из mapLink(): точные координаты, если они есть */
export function MapButton({
  href,
  className,
  iconClassName = "text-gold-light",
}: {
  href: string;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2.5 text-[15px] font-semibold transition active:scale-95 ${className ?? DEFAULT_LOOK}`}
    >
      <svg viewBox="0 0 24 24" className={`h-5 w-5 ${iconClassName}`} aria-hidden>
        <path
          fill="currentColor"
          d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"
        />
      </svg>
      {t.venue.openMap}
    </a>
  );
}
