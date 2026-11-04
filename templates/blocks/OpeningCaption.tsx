"use client";
/**
 * Подпись на конверте/шторке/воротах ДО нажатия: имена (или имя), тадбир и дата.
 * Правило владельца 03.11.2026: на первом экране надписи видны сразу, иначе гость думает, что это ошибка.
 * Только span — можно класть внутрь кнопки.
 */
import { t } from "@/texts/uz-cyrl";
import type { Invitation } from "./useInvitation";

export function OpeningCaption({
  inv,
  className = "",
  nameClassName = "",
  metaClassName = "",
}: {
  inv: Invitation;
  className?: string;
  nameClassName?: string;
  metaClassName?: string;
}) {
  const d = inv.data;
  const w = inv.main.when;
  const nikoh = inv.occasion === "nikoh" && d.groom && d.bride;
  return (
    <span className={`flex flex-col items-center text-center ${className}`} data-opening-caption>
      <span className={`block [overflow-wrap:anywhere] ${nameClassName}`}>
        {nikoh ? (
          <>
            {/* «ва» не висит в конце строки: неразрывный пробел перед невестой */}
            {d.groom} <span className="text-[0.62em] italic opacity-80">{t.natural.and}</span>{" "}{d.bride}
          </>
        ) : (
          d.person
        )}
      </span>
      <span className={`mt-1 block ${metaClassName}`}>{t.occasionTitles[inv.occasion]}</span>
      <span className={`block ${metaClassName}`}>{t.date.long(w.day, w.monthIndex, w.year)}</span>
    </span>
  );
}
