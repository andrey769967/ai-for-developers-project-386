// Календарь гостя показывает весь Booking window: 14 дат в поясе владельца,
// включая дни без свободных Slot. Границы окна приходят с сервера, чтобы
// правило не дублировалось на клиенте.

const MS_PER_DAY = 24 * 60 * 60 * 1000;
// Календарная дата (YYYY-MM-DD) момента времени в часовом поясе зрителя
export function getDayKey(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function getDayNumber(key: string): number {
  return Number(key.slice(8, 10));
}

export function formatMonth(key: string): string {
  return new Intl.DateTimeFormat("ru-RU", { month: "short" }).format(
    new Date(`${key}T12:00:00.000Z`),
  );
}

// Индекс дня недели с понедельника (0=Пн .. 6=Вс) для календарной даты
export function getWeekdayMon(key: string): number {
  const weekday = new Date(`${key}T12:00:00.000Z`).getUTCDay();
  return (weekday + 6) % 7;
}

// Даты Booking window в поясе зрителя: от даты начала окна до даты, в которую
// попадает последняя секунда окна. В поясе владельца это ровно 14 дат; при
// сильном смещении пояса зрителя добавляется ещё одна — зато ни один Slot
// последнего дня не теряется.
export function buildCalendarDays(
  windowStart: string,
  windowEnd: string,
  timezone: string,
): string[] {
  const firstKey = getDayKey(windowStart, timezone);
  const lastKey = getDayKey(new Date(new Date(windowEnd).getTime() - 1).toISOString(), timezone);

  const first = new Date(`${firstKey}T00:00:00.000Z`).getTime();
  const last = new Date(`${lastKey}T00:00:00.000Z`).getTime();
  const count = Math.round((last - first) / MS_PER_DAY) + 1;

  return Array.from({ length: count }, (_, index) =>
    new Date(first + index * MS_PER_DAY).toISOString().slice(0, 10),
  );
}
