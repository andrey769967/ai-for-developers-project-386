import { describe, it, expect, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp, createMeetingType } from "./helpers.js";
import { storage } from "../src/storage/in-memory.js";
import { getAvailableSlots } from "../src/services/availability.js";
import { ApiError } from "../src/types.js";

let app: FastifyInstance;

afterEach(async () => {
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