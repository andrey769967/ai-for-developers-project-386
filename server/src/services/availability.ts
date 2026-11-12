import { CONFIG, WORKING_START_UTC_HOUR, WORKING_END_UTC_HOUR } from "../config.js";
import { storage } from "../storage/in-memory.js";
import type { Slot } from "../types.js";
import { ApiError } from "../types.js";
import { getBookingWindow } from "./booking-window.js";

// Build a UTC Date for a specific Moscow date at a specific Moscow hour
function moscowDateAtUTC(dateStr: string, moscowHour: number): Date {
  const utcHour = moscowHour - CONFIG.timezoneOffsetHours;
  return new Date(`${dateStr}T${String(utcHour).padStart(2, "0")}:00:00.000Z`);
}

export function getAvailableSlots(meetingTypeId: string): Slot[] {
  const meetingType = storage.getMeetingType(meetingTypeId);
  if (!meetingType) {
    throw new ApiError(404, "Meeting type not found");
  }

  const durationMs = meetingType.durationMinutes * 60 * 1000;
  const stepMs = CONFIG.slotStepMinutes * 60 * 1000;
  const now = new Date();
  const bookingWindow = getBookingWindow(now);

  const slots: Slot[] = [];

  for (let dayOffset = 0; dayOffset < CONFIG.bookingWindowDays; dayOffset++) {
    // Advance the date by dayOffset days
    const baseDate = new Date(`${bookingWindow.firstOwnerDate}T00:00:00.000Z`);
    baseDate.setUTCDate(baseDate.getUTCDate() + dayOffset);
    const dayStr = baseDate.toISOString().slice(0, 10);

    // Working hours in UTC for this Moscow day
    const workStart = moscowDateAtUTC(dayStr, CONFIG.workingHoursStart);
    const workEnd = moscowDateAtUTC(dayStr, CONFIG.workingHoursEnd);

    let slotStart = new Date(workStart);

    while (slotStart.getTime() + durationMs <= workEnd.getTime()) {
      const slotEnd = new Date(slotStart.getTime() + durationMs);

      // Skip past slots
      if (slotStart.getTime() >= now.getTime() && slotStart.getTime() < bookingWindow.end.getTime()) {
        if (!storage.hasOverlap(slotStart.toISOString(), slotEnd.toISOString())) {
          slots.push({
            startTime: slotStart.toISOString(),
            endTime: slotEnd.toISOString(),
          });
        }
      }

      slotStart = new Date(slotStart.getTime() + stepMs);
    }
  }

  return slots;
}
