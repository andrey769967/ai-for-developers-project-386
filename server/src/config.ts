// Спецификационные константы (см. TypeSpec контракт contract/main.tsp)

export const CONFIG = {
  // Часовой пояс владельца календаря
  timezone: "Europe/Moscow" as const,
  // Europe/Moscow = UTC+3 круглый год (DST отменён в 2014)
  timezoneOffsetHours: 3,
  // Рабочие часы (по локальному времени владельца)
  workingHoursStart: 9,  // 09:00
  workingHoursEnd: 18,   // 18:00
  // Окно записи
  bookingWindowDays: 14,
  // Шаг доступных стартов слотов
  slotStepMinutes: 15,
  // Минимальная длительность встречи
  minDurationMinutes: 15,
  // Сервер
  host: "0.0.0.0",
  // Путь к статике фронтенда (в Docker)
  staticDir: process.env.STATIC_DIR || "../web/dist",
} as const;

const DEFAULT_PORT = 3000;

// Booking обязан поместиться в Working hours целиком, поэтому Duration
// не может быть больше длины рабочего дня. При смене часов лимит меняется сам.
export const MAX_DURATION_MINUTES =
  (CONFIG.workingHoursEnd - CONFIG.workingHoursStart) * 60;

// Порт берётся из окружения, чтобы контейнер и платформа могли его переопределить.
// Некорректное значение не роняет сервер: используется дефолт.
export function resolvePort(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.PORT;
  if (!raw) return DEFAULT_PORT;

  const port = Number(raw);
  const isValid = Number.isInteger(port) && port > 0 && port <= 65535;
  return isValid ? port : DEFAULT_PORT;
}
