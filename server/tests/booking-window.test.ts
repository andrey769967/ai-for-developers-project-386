import { afterEach, describe, expect, it, vi } from "vitest";
import { getBookingWindow } from "../src/services/booking-window.js";
import { getAvailableSlots } from "../src/services/availability.js";
import { createBooking } from "../src/services/booking.js";
import { storage } from "../src/storage/in-memory.js";

afterEach(() => {
  vi.useRealTimers();
  storage.reset();
});

describe("Booking window", () => {
  it("uses Moscow midnight for both UTC boundaries", () => {
    const window = getBookingWindow(new Date("2026-11-11T21:00:00.000Z"));

    expect(window.start.toISOString()).toBe("2026-11-11T21:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-11-25T21:00:00.000Z");
  });

  it("includes the fourteenth owner date and excludes the fifteenth from Availability", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-12T02:59:00.000Z"));
    const meetingType = storage.createMeetingType({
      name: "Test",
      description: "desc",
      durationMinutes: 30,
    });

    const ownerDates = new Set(
      getAvailableSlots(meetingType.id).map((slot) =>
        new Date(new Date(slot.startTime).getTime() + 3 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
      ),
    );

    expect(ownerDates.has("2026-11-25")).toBe(true);
    expect(ownerDates.has("2026-11-26")).toBe(false);
  });

  it("rejects a booking after the fourteenth owner date ends", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-12T02:59:00.000Z"));
    const meetingType = storage.createMeetingType({
      name: "Test",
      description: "desc",
      durationMinutes: 30,
    });

    await expect(
      createBooking({
        meetingTypeId: meetingType.id,
        guestName: "Test",
        guestEmail: "test@example.com",
        startTime: "2026-11-25T22:00:00.000Z",
      }),
    ).rejects.toMatchObject({ message: "Start time is outside the booking window" });
  });
});
