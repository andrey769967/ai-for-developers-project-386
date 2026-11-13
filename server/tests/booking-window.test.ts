import { describe, it, expect, afterEach, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp, createMeetingType } from "./helpers.js";
import { storage } from "../src/storage/in-memory.js";
import { getAvailableSlots } from "../src/services/availability.js";
import {
  getBookingWindow,
  getOwnerDateString,
  isWithinBookingWindow,
} from "../src/services/time-window.js";

let app: FastifyInstance | undefined;

afterEach(async () => {
  vi.useRealTimers();
  if (app) await app.close();
  app = undefined;
});

describe("getBookingWindow", () => {
  it("starts at 00:00 in Owner timezone, not at UTC midnight", () => {
    // 02:00 UTC on 13 Nov is 05:00 Moscow; the window still starts on the previous UTC evening
    const { start } = getBookingWindow(new Date("2026-11-13T02:00:00.000Z"));

    expect(start.toISOString()).toBe("2026-11-12T21:00:00.000Z");
  });

  it("ends 14 calendar days later at 00:00 in Owner timezone", () => {
    const { start, end } = getBookingWindow(new Date("2026-11-13T12:00:00.000Z"));

    expect(start.toISOString()).toBe("2026-11-12T21:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-26T21:00:00.000Z");
    expect(end.getTime() - start.getTime()).toBe(14 * 24 * 60 * 60 * 1000);
  });

  it("rolls over at Owner midnight inside the 00:00-03:00 Moscow band", () => {
    // 22:30 UTC on 13 Nov is 01:30 Moscow on 14 Nov
    const { start } = getBookingWindow(new Date("2026-11-13T22:30:00.000Z"));

    expect(start.toISOString()).toBe("2026-11-13T21:00:00.000Z");
  });
});

describe("isWithinBookingWindow", () => {
  const now = new Date("2026-11-13T12:00:00.000Z");

  it("includes the last day of the window", () => {
    // 23:45 Moscow on 26 Nov, the 14th calendar day
    expect(isWithinBookingWindow(new Date("2026-11-26T20:45:00.000Z"), now)).toBe(true);
  });

  it("excludes the first moment after the window", () => {
    // 00:00 Moscow on 27 Nov, the 15th calendar day
    expect(isWithinBookingWindow(new Date("2026-11-26T21:00:00.000Z"), now)).toBe(false);
  });

  it("excludes times before the window starts", () => {
    // 23:59 Moscow on 12 Nov, the day before the window
    expect(isWithinBookingWindow(new Date("2026-11-12T20:59:00.000Z"), now)).toBe(false);
  });
});

describe("getAvailableSlots Booking window", () => {
  it("covers exactly the 14 Owner timezone dates of the window", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-13T12:00:00.000Z"));
    app = await createTestApp();
    const meetingType = await createMeetingType(app, "Test", "desc", 30);

    const slots = getAvailableSlots(meetingType.id);
    const dates = [...new Set(slots.map((slot) => getOwnerDateString(new Date(slot.startTime))))];

    expect(dates.sort()).toEqual([
      "2026-11-13",
      "2026-11-14",
      "2026-11-15",
      "2026-11-16",
      "2026-11-17",
      "2026-11-18",
      "2026-11-19",
      "2026-11-20",
      "2026-11-21",
      "2026-11-22",
      "2026-11-23",
      "2026-11-24",
      "2026-11-25",
      "2026-11-26",
    ]);
  });
});

describe("createBooking Booking window", () => {
  it("treats a start just after Owner midnight as inside the window", async () => {
    // 21:15 UTC on 13 Nov is 00:15 Moscow on 14 Nov; the window covers that moment
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-13T21:15:00.000Z"));
    app = await createTestApp();
    const meetingType = await createMeetingType(app, "Test", "desc", 30);

    const response = await app.inject({
      method: "POST",
      url: "/api/bookings",
      payload: {
        meetingTypeId: meetingType.id,
        guestName: "Guest",
        guestEmail: "guest@example.com",
        // 00:30 Moscow on 14 Nov
        startTime: "2026-11-13T21:30:00.000Z",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.payload).message).toBe("Время начала раньше рабочих часов");
  });
});

describe("GET /api/booking-window", () => {
  it("returns the current Booking window boundaries", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-13T12:00:00.000Z"));
    app = await createTestApp();

    const res = await app.inject({ method: "GET", url: "/api/booking-window" });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual({
      startTime: "2026-11-12T21:00:00.000Z",
      endTime: "2026-11-26T21:00:00.000Z",
    });
  });

  it("does not touch storage", async () => {
    app = await createTestApp();

    await app.inject({ method: "GET", url: "/api/booking-window" });

    expect(storage.listMeetingTypes()).toEqual([]);
  });
});
