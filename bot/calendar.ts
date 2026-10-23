/** Календарь кнопками: даты в Казахстане (UTC+5), прошлые дни недоступны */

export type Cell = { day: number; date: string; past: boolean } | null;
export type CalendarMonth = { month: string; weeks: Cell[][]; canPrev: boolean; canNext: boolean };

const KZ_OFFSET_MS = 5 * 60 * 60_000;
/** На сколько месяцев вперёд можно листать */
const MAX_AHEAD = 12;

const pad = (n: number) => String(n).padStart(2, "0");

/** Сегодняшняя дата в Казахстане: «2026-11-14» */
export function kzToday(now: Date): string {
  return new Date(now.getTime() + KZ_OFFSET_MS).toISOString().slice(0, 10);
}

/** «2026-12» + 1 → «2027-01» */
export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const i = y * 12 + (m - 1) + delta;
  return `${Math.floor(i / 12)}-${pad((i % 12) + 1)}`;
}

const monthIndex = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return y * 12 + m - 1;
};

/** Сетка месяца (неделя с понедельника) */
export function calendarMonth(month: string, today: string): CalendarMonth {
  const [y, m] = month.split("-").map(Number);
  const offset = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: Cell[] = Array(offset).fill(null);
  for (let d = 1; d <= days; d++) {
    const date = `${month}-${pad(d)}`;
    cells.push({ day: d, date, past: date < today });
  }
  while (cells.length % 7) cells.push(null);
  const weeks: Cell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const ahead = monthIndex(month) - monthIndex(today.slice(0, 7));
  return { month, weeks, canPrev: ahead > 0, canNext: ahead < MAX_AHEAD };
}
