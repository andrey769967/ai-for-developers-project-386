// Правило длительности MeetingType задано сервером: целое число минут,
// кратное шагу сетки Slot и не меньше минимальной длительности.
// Здесь оно повторяется, чтобы форма объясняла ошибку до запроса к API.
export const MIN_DURATION_MINUTES = 15;
export const DURATION_STEP_MINUTES = 15;
// Working hours 09:00-18:00: Booking обязан поместиться в рабочий день.
export const MAX_DURATION_MINUTES = 540;

export interface DurationParseResult {
  minutes: number | null;
  error: string | null;
}

export function parseDurationMinutes(raw: string): DurationParseResult {
  const trimmed = raw.trim();

  if (!trimmed) {
    return { minutes: null, error: "Укажите длительность в минутах" };
  }

  if (!/^\d+$/.test(trimmed)) {
    return { minutes: null, error: "Длительность должна быть целым числом минут" };
  }

  const minutes = Number(trimmed);

  if (minutes < MIN_DURATION_MINUTES) {
    return {
      minutes: null,
      error: `Длительность не может быть меньше ${MIN_DURATION_MINUTES} минут`,
    };
  }

  if (minutes > MAX_DURATION_MINUTES) {
    return {
      minutes: null,
      error: `Длительность не может быть больше ${MAX_DURATION_MINUTES} минут`,
    };
  }

  if (minutes % DURATION_STEP_MINUTES !== 0) {
    return {
      minutes: null,
      error: `Длительность должна быть кратна ${DURATION_STEP_MINUTES} минутам`,
    };
  }

  return { minutes, error: null };
}
