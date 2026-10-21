/**
 * Дата и время свадьбы. Все свадьбы в Казахстане: часовой пояс UTC+5.
 */
const KZ_OFFSET = "+05:00";

export type WeddingDate = {
  year: number;
  monthIndex: number; // 0 = январь
  day: number;
  weekdayIndex: number; // 0 = понедельник (Душанба)
  time: string;
  /** Момент начала свадьбы (для таймера) */
  startsAt: Date;
};

export function parseWeddingDate(date: string, time: string): WeddingDate {
  const [year, month, day] = date.split("-").map(Number);
  // Day of week считаем по «чистой» дате, без часовых поясов
  const jsDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0 = воскресенье
  return {
    year,
    monthIndex: month - 1,
    day,
    weekdayIndex: (jsDay + 6) % 7,
    time,
    startsAt: new Date(`${date}T${time}:00${KZ_OFFSET}`),
  };
}

/** Сетка календаря на месяц: недели по 7 дней, пустые клетки — null */
export function monthGrid(year: number, monthIndex: number): (number | null)[][] {
  const firstJsDay = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const offset = (firstJsDay + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

  const cells: (number | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
