import { t } from "@/texts/uz-cyrl";

/**
 * Личная НАМУНА до оплаты: аккуратная полупрозрачная надпись поверх страницы.
 * Редкие диагональные строки, тонкий шрифт — имена и текст читаются, дизайн не портится,
 * но скриншот без оплаты разослать стыдно. Белая буква с тёмным контуром видна и на светлых,
 * и на тёмных (бархат) дизайнах. Внизу — плашка: после оплаты надпись исчезнет.
 */
export function Watermark() {
  const rows = Array.from({ length: 7 });
  return (
    <div aria-hidden data-watermark className="pointer-events-none fixed inset-0 z-50 overflow-hidden select-none">
      <div className="absolute -inset-1/2 flex rotate-[-24deg] flex-col justify-center gap-[clamp(150px,26vh,220px)]">
        {rows.map((_, i) => (
          <div
            key={i}
            className="flex gap-24 whitespace-nowrap font-sans text-[22px] font-light tracking-[0.5em] text-white/25"
            style={{ marginLeft: i % 2 ? "-7rem" : "2rem", textShadow: "0 0 1px rgba(60,40,20,0.35)" }}
          >
            {Array.from({ length: 6 }).map((_, j) => (
              <span key={j}>{t.watermark}</span>
            ))}
          </div>
        ))}
      </div>

      <p className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[430px] bg-[#3b2a1e]/70 px-4 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] text-center font-sans text-[13px] leading-snug tracking-wide text-[#f8f3ea] backdrop-blur-sm">
        {t.watermark} · {t.watermarkNote}
      </p>
    </div>
  );
}
