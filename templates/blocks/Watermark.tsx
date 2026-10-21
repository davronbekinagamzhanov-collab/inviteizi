import { t } from "@/texts/uz-cyrl";

/**
 * Водяной знак «НАМУНА» поверх всей страницы (демо до оплаты).
 * Лежит над контентом, поэтому виден на любом скриншоте.
 */
export function Watermark() {
  const rows = Array.from({ length: 14 });
  return (
    <div
      aria-hidden
      data-watermark
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden select-none"
    >
      <div className="absolute -inset-1/2 flex rotate-[-28deg] flex-col justify-center gap-16">
        {rows.map((_, i) => (
          <div
            key={i}
            className="flex gap-12 whitespace-nowrap font-sans text-3xl font-extrabold tracking-[0.3em] text-black/[0.09]"
            style={{ marginLeft: i % 2 ? "-6rem" : 0 }}
          >
            {Array.from({ length: 8 }).map((_, j) => (
              <span key={j} className="[text-shadow:0_0_1px_rgba(255,255,255,0.35)]">
                {t.watermark}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
