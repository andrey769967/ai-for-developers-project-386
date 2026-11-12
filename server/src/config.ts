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
  port: 3000,
  host: "0.0.0.0",
  // Путь к статике фронтенда (в Docker)
  staticDir: process.env.STATIC_DIR || "../web/dist",
} as const;
