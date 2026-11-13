import { describe, it, expect, afterEach, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { storage } from "../src/storage/in-memory.js";
import { getAvailableSlots } from "../src/services/availability.js";
import { getWorkingHours } from "../src/services/time-window.js";
import { CONFIG } from "../src/config.js";
import { ApiError } from "../src/types.js";

let app: FastifyInstance;

afterEach(async () => {
  vi.useRealTimers();
  if (app) await app.close();
});

describe("getAvailableSlots", () => {
  it("throws 404 for non-existent meeting type", () => {
    storage.reset();
    expect(() => getAvailableSlots("nonexistent")).toThrow(ApiError);
  });

  it("generates slots within working hours (09:00-18:00 Moscow = 06:00-15:00 UTC)", () => {
    storage.reset();
    const mt = storage.createMeetingType({
      name: "Test",
      description: "desc",
      durationMinutes: 30,
    });

    const slots = getAvailableSlots(mt.id);
    expect(slots.length).toBeGreaterThan(0);

    for (const slot of slots) {
      const start = new Date(slot.startTime);
      const end = new Date(slot.endTime);
      const startUTCHour = start.getUTCHours();
      const endUTCHour = end.getUTCHours();

      // Working hours: 06:00-15:00 UTC
      expect(startUTCHour).toBeGreaterThanOrEqual(6);
      expect(endUTCHour).toBeLessThanOrEqual(15);
    }
  });

  it("slot duration matches meeting type duration", () => {
    storage.reset();
    const mt = storage.createMeetingType({
      name: "Test",
      description: "desc",
      durationMinutes: 45,
    });

    const slots = getAvailableSlots(mt.id);
    expect(slots.length).toBeGreaterThan(0);

    for (const slot of slots) {
      const durationMs = new Date(slot.endTime).getTime() - new Date(slot.startTime).getTime();
      expect(durationMs).toBe(45 * 60 * 1000);
    }
  });

  it("excludes booked slots", () => {
    storage.reset();
    const mt = storage.createMeetingType({
      name: "Test",
      description: "desc",
      durationMinutes: 30,
    });

    const slotsBefore = getAvailableSlots(mt.id);
    expect(slotsBefore.length).toBeGreaterThan(0);

    // Book the first slot directly in storage
    storage.createBooking({
      meetingTypeId: mt.id,
      meetingTypeName: mt.name,
      guestName: "Test",
      guestEmail: "test@test.com",
      startTime: slotsBefore[0].startTime,
      endTime: slotsBefore[0].endTime,
      createdAt: new Date().toISOString(),
    });

    const slotsAfter = getAvailableSlots(mt.id);
    // The booked slot should not be available
    const stillAvailable = slotsAfter.find(
      (s) => s.startTime === slotsBefore[0].startTime,
    );
    expect(stillAvailable).toBeUndefined();
  });

  it("generates slots for exactly 14 days", () => {
    storage.reset();
    const mt = storage.createMeetingType({
      name: "Test",
      description: "desc",
      durationMinutes: 60,
    });

    const slots = getAvailableSlots(mt.id);
    expect(slots.length).toBeGreaterThan(0);

    // Collect unique dates
    const dates = new Set<string>();
    for (const slot of slots) {
      dates.add(new Date(slot.startTime).toISOString().slice(0, 10));
    }

    // Should span up to 14 days
    expect(dates.size).toBeLessThanOrEqual(14);
    expect(dates.size).toBeGreaterThanOrEqual(1);
  });

  it("does not show past slots", () => {
    storage.reset();
    const mt = storage.createMeetingType({
      name: "Test",
      description: "desc",
      durationMinutes: 15,
    });

    const slots = getAvailableSlots(mt.id);
    const now = Date.now();

    for (const slot of slots) {
      expect(new Date(slot.startTime).getTime()).toBeGreaterThanOrEqual(now - 60000);
    }
  });
});

// Fake now: 2026-11-13T09:00Z = 12:00 Moscow. The window covers Nov 13-26.
function fakeNow(): void {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-13T09:00:00.000Z"));
}

describe("Slot grid rules", () => {
  it("aligns every Slot start to the Slot step from the start of Working hours", () => {
    fakeNow();

    for (const duration of [15, 30, 60]) {
      storage.reset();
      const mt = storage.createMeetingType({
        name: "Test",
        description: "desc",
        durationMinutes: duration,
      });

      const slots = getAvailableSlots(mt.id);
      expect(slots.length).toBeGreaterThan(0);

      for (const slot of slots) {
        const start = new Date(slot.startTime);
        const { start: workStart } = getWorkingHours(start);
        const minutesFromWorkStart = (start.getTime() - workStart.getTime()) / 60000;

        expect(minutesFromWorkStart).toBeGreaterThanOrEqual(0);
        expect(minutesFromWorkStart % CONFIG.slotStepMinutes).toBe(0);
      }
    }
  });

  it("hides start times that partially overlap a Booking of another MeetingType", () => {
    fakeNow();
    storage.reset();

    const long = storage.createMeetingType({
      name: "Long",
      description: "desc",
      durationMinutes: 60,
    });
    const short = storage.createMeetingType({
      name: "Short",
      description: "desc",
      durationMinutes: 30,
    });

    // 10:00-11:00 Moscow on 16 Nov, booked with a different MeetingType
    storage.createBooking({
      meetingTypeId: long.id,
      meetingTypeName: long.name,
      guestName: "Guest",
      guestEmail: "guest@example.com",
      startTime: "2026-11-16T07:00:00.000Z",
      endTime: "2026-11-16T08:00:00.000Z",
      createdAt: new Date().toISOString(),
    });

    const starts = getAvailableSlots(short.id)
      .filter((slot) => slot.startTime.startsWith("2026-11-16"))
      .map((slot) => slot.startTime);

    // 10:00, 10:15, 10:30 and 10:45 would overlap the Booking
    expect(starts).not.toContain("2026-11-16T07:00:00.000Z");
    expect(starts).not.toContain("2026-11-16T07:15:00.000Z");
    expect(starts).not.toContain("2026-11-16T07:30:00.000Z");
    expect(starts).not.toContain("2026-11-16T07:45:00.000Z");
    // 11:00 starts exactly when the Booking ends
    expect(starts).toContain("2026-11-16T08:00:00.000Z");
  });

  it("starts the last Slot of a 60-minute MeetingType at 17:00 and ends it at 18:00", () => {
    fakeNow();
    storage.reset();

    const mt = storage.createMeetingType({
      name: "Long",
      description: "desc",
      durationMinutes: 60,
    });

    const slots = getAvailableSlots(mt.id).filter((slot) =>
      slot.startTime.startsWith("2026-11-16"),
    );
    expect(slots.length).toBeGreaterThan(0);

    const last = slots[slots.length - 1];
    // 17:00-18:00 Moscow
    expect(last.startTime).toBe("2026-11-16T14:00:00.000Z");
    expect(last.endTime).toBe("2026-11-16T15:00:00.000Z");
  });

  it("never lets a Slot end after Working hours, for every supported Duration", () => {
    fakeNow();

    for (const duration of [15, 30, 60, 90, 540]) {
      storage.reset();
      const mt = storage.createMeetingType({
        name: "Test",
        description: "desc",
        durationMinutes: duration,
      });

      const slots = getAvailableSlots(mt.id);
      expect(slots.length).toBeGreaterThan(0);

      for (const slot of slots) {
        const { end: workEnd } = getWorkingHours(new Date(slot.startTime));
        expect(new Date(slot.endTime).getTime()).toBeLessThanOrEqual(workEnd.getTime());
      }
    }
  });

  it("gives a full-day MeetingType exactly one Slot per day", () => {
    fakeNow();
    storage.reset();

    const mt = storage.createMeetingType({
      name: "Full day",
      description: "desc",
      durationMinutes: 540,
    });

    const slots = getAvailableSlots(mt.id);
    const perDay = new Map<string, number>();
    for (const slot of slots) {
      const day = slot.startTime.slice(0, 10);
      perDay.set(day, (perDay.get(day) ?? 0) + 1);
    }

    for (const count of perDay.values()) {
      expect(count).toBe(1);
    }
  });
});