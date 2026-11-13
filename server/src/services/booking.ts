import { Mutex } from "async-mutex";
import { storage } from "../storage/in-memory.js";
import { CONFIG } from "../config.js";
import type { Booking, BookingCreate } from "../types.js";
import { ApiError } from "../types.js";
import {
  getWorkingHours,
  isWithinBookingWindow,
} from "./time-window.js";

const bookingMutex = new Mutex();

export async function createBooking(data: BookingCreate): Promise<Booking> {
  return bookingMutex.runExclusive(() => {
    const meetingType = storage.getMeetingType(data.meetingTypeId);
    if (!meetingType) {
      throw new ApiError(404, "Тип встречи не найден");
    }

    const startTime = new Date(data.startTime);
    const now = new Date();

    // Validate: not in the past
    if (startTime.getTime() < now.getTime()) {
      throw new ApiError(400, "Нельзя записаться на прошедшее время");
    }

    // Validate: within booking window (14 Moscow calendar days, starting today)
    if (!isWithinBookingWindow(startTime, now)) {
      throw new ApiError(400, "Время начала вне окна записи");
    }

    // Validate: within working hours
    const { start: workStart, end: workEnd } = getWorkingHours(startTime);
    if (startTime.getTime() < workStart.getTime()) {
      throw new ApiError(400, "Время начала раньше рабочих часов");
    }

    const endTime = new Date(startTime.getTime() + meetingType.durationMinutes * 60 * 1000);
    if (endTime.getTime() > workEnd.getTime()) {
      throw new ApiError(400, "Встреча не помещается в рабочие часы");
    }

    // Validate: aligned to slot step
    const minutesFromWorkStart = (startTime.getTime() - workStart.getTime()) / 60000;
    if (!Number.isInteger(minutesFromWorkStart) || minutesFromWorkStart % CONFIG.slotStepMinutes !== 0) {
      throw new ApiError(400, "Время начала не совпадает с сеткой слотов");
    }

    // Validate: no overlap with existing bookings
    if (storage.hasOverlap(startTime.toISOString(), endTime.toISOString())) {
      throw new ApiError(409, "Это время уже занято, выберите другое");
    }

    return storage.createBooking({
      meetingTypeId: data.meetingTypeId,
      meetingTypeName: meetingType.name,
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      createdAt: now.toISOString(),
    });
  });
}