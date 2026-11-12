import { CONFIG } from "../config.js";

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

// Owner timezone calendar date (YYYY-MM-DD) for a given instant.
// The current Owner timezone is Europe/Moscow, UTC+3 all year round (see ADR-0003).
export function getOwnerDateString(date: Date): string {
  const ownerMs = date.getTime() + CONFIG.timezoneOffsetHours * MS_PER_HOUR;
  return new Date(ownerMs).toISOString().slice(0, 10);
}

// UTC instant of a given wall-clock hour on a given Owner timezone calendar day
export function ownerDateAtHour(dateStr: string, ownerHour: number): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(
    Date.UTC(year, month - 1, day, ownerHour - CONFIG.timezoneOffsetHours, 0, 0, 0),
  );
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

export interface BookingWindow {
  start: Date;
  end: Date;
}

// Booking window: [today 00:00, today + bookingWindowDays 00:00) in Owner timezone
export function getBookingWindow(now: Date): BookingWindow {
  const start = ownerDateAtHour(getOwnerDateString(now), 0);
  return { start, end: addDays(start, CONFIG.bookingWindowDays) };
}

export function isWithinBookingWindow(startTime: Date, now: Date): boolean {
  const { start, end } = getBookingWindow(now);
  const ms = startTime.getTime();
  return ms >= start.getTime() && ms < end.getTime();
}

// Working hours of the Owner timezone day that contains the given instant
export function getWorkingHours(instant: Date): { start: Date; end: Date } {
  const dayStr = getOwnerDateString(instant);
  return {
    start: ownerDateAtHour(dayStr, CONFIG.workingHoursStart),
    end: ownerDateAtHour(dayStr, CONFIG.workingHoursEnd),
  };
}
