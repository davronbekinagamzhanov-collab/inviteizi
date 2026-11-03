import { t } from "@/texts/uz-cyrl";
import { monthGrid, type WeddingDate } from "@/lib/wedding-date";

export type CalendarMarker = "heart" | "circle" | "star";

const MARKERS: Record<CalendarMarker, string> = {
  heart:
    "M12 21.2 10.6 20C5.4 15.4 2 12.3 2 8.5 2 5.4 4.4 3 7.5 3c1.7 0 3.4.8 4.5 2.1C13.1 3.8 14.8 3 16.5 3 19.6 3 22 5.4 22 8.5c0 3.8-3.4 6.9-8.6 11.5L12 21.2z",
  circle: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z",
  // восьмиконечная звезда (как в восточных орнаментах)
  star: "M12 1l3 4.8 5.6-.8-.8 5.6L23 12l-4.2 3 .8 5.6-5.6-.8L12 23l-3-4.2-5.6.8.8-5.6L1 12l4.2-3-.8-5.6 5.6.8z",
};

/** Календарь месяца свадьбы с отмеченным днём */
export function Calendar({
  date,
  marker = "heart",
  markerClassName = "text-primary",
  markedDayClassName = "text-paper",
  showMonthTitle = true,
  weekendClassName = "text-primary/80",
}: {
  date: WeddingDate;
  marker?: CalendarMarker;
  markerClassName?: string;
  markedDayClassName?: string;
  showMonthTitle?: boolean;
  weekendClassName?: string;
}) {
  const weeks = monthGrid(date.year, date.monthIndex);

  return (
    <div className="mx-auto w-full max-w-[320px]">
      {showMonthTitle && (
        <p className="mb-4 font-display text-2xl capitalize text-primary">
          {t.date.monthYear(date.monthIndex, date.year)}
        </p>
      )}

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {t.weekdaysShort.map((d, i) => (
          <span
            key={d}
            className={`pb-2 text-[14px] font-semibold uppercase tracking-wide ${
              i >= 5 ? weekendClassName : "text-muted"
            }`}
          >
            {d}
          </span>
        ))}

        {weeks.flat().map((day, i) => {
          const isWedding = day === date.day;
          return (
            <span key={i} className="relative flex h-10 items-center justify-center">
              {isWedding && (
                <svg viewBox="0 0 24 24" className={`absolute h-10 w-10 ${markerClassName}`} aria-hidden>
                  <path fill="currentColor" d={MARKERS[marker]} />
                </svg>
              )}
              <span
                className={`relative font-display text-lg ${
                  isWedding
                    ? `${marker === "heart" ? "-mt-0.5" : ""} font-bold ${markedDayClassName}`
                    : day
                      ? "text-ink"
                      : ""
                }`}
              >
                {day ?? ""}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
