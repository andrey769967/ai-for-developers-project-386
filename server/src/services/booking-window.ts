import { CONFIG } from "../config.js";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export interface BookingWindow {
  /** First instant in the Owner's local date, represented in UTC. */
  start: Date;
  /** Exclusive instant at the start of the fifteenth Owner date, represented in UTC. */
  end: Date;
  /** Owner-local calendar date containing `start`. */
  firstOwnerDate: string;
}

/** Return the half-open Booking window `[today 00:00, today + N days 00:00)` in Owner timezone. */
export function getBookingWindow(now = new Date()): BookingWindow {
  const ownerNow = new Date(now.getTime() + CONFIG.timezoneOffsetHours * HOUR_MS);
  const firstOwnerDate = ownerNow.toISOString().slice(0, 10);
  const start = new Date(`${firstOwnerDate}T00:00:00.000Z`);
  start.setTime(start.getTime() - CONFIG.timezoneOffsetHours * HOUR_MS);

  return {
    start,
    end: new Date(start.getTime() + CONFIG.bookingWindowDays * DAY_MS),
    firstOwnerDate,
  };
}
