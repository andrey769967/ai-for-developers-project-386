import { CONFIG } from "../config.js";
import { storage } from "../storage/in-memory.js";
import type { Slot } from "../types.js";
import { ApiError } from "../types.js";
import { addDays, getBookingWindow, getWorkingHours } from "./time-window.js";

export function getAvailableSlots(meetingTypeId: string): Slot[] {
  const meetingType = storage.getMeetingType(meetingTypeId);
  if (!meetingType) {
    throw new ApiError(404, "Тип встречи не найден");
  }

  const durationMs = meetingType.durationMinutes * 60 * 1000;
  const stepMs = CONFIG.slotStepMinutes * 60 * 1000;
  const now = new Date();
  const window = getBookingWindow(now);

  const slots: Slot[] = [];

  for (
    let dayStart = window.start;
    dayStart.getTime() < window.end.getTime();
    dayStart = addDays(dayStart, 1)
  ) {
    // Working hours in UTC for this Owner timezone day
    const { start: workStart, end: workEnd } = getWorkingHours(dayStart);

    let slotStart = new Date(workStart);

    while (slotStart.getTime() + durationMs <= workEnd.getTime()) {
      const slotEnd = new Date(slotStart.getTime() + durationMs);

      // Skip past slots
      if (slotStart.getTime() >= now.getTime()) {
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