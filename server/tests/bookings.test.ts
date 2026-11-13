import { describe, it, expect, afterEach, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp, createMeetingType } from "./helpers.js";

let app: FastifyInstance;

afterEach(async () => {
  vi.useRealTimers();
  if (app) await app.close();
});

// Fake now: 2026-11-13T12:00Z = 15:00 Moscow; the Booking window covers Nov 13-26
function fakeNow(): void {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-13T12:00:00.000Z"));
}

async function book(startTime: string, durationMinutes = 15) {
  app = await createTestApp();
  const mt = await createMeetingType(app, "Test", "desc", durationMinutes);
  return app.inject({
    method: "POST",
    url: "/api/bookings",
    payload: { meetingTypeId: mt.id, guestName: "A", guestEmail: "a@test.com", startTime },
  });
}

describe("GET /api/bookings", () => {
  it("returns empty list initially", async () => {
    app = await createTestApp();
    const res = await app.inject({ method: "GET", url: "/api/bookings" });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual([]);
  });

  it("returns bookings sorted by startTime", async () => {
    app = await createTestApp();
    const mt = await createMeetingType(app, "Test", "desc", 15);

    // Get available slots
    const slotsRes = await app.inject({ method: "GET", url: `/api/meeting-types/${mt.id}/slots` });
    const slots = JSON.parse(slotsRes.payload);
    expect(slots.length).toBeGreaterThanOrEqual(2);

    // Book two slots (second one first to test sorting)
    await app.inject({
      method: "POST",
      url: "/api/bookings",
      payload: { meetingTypeId: mt.id, guestName: "B", guestEmail: "b@test.com", startTime: slots[1].startTime },
    });
    await app.inject({
      method: "POST",
      url: "/api/bookings",
      payload: { meetingTypeId: mt.id, guestName: "A", guestEmail: "a@test.com", startTime: slots[0].startTime },
    });

    const res = await app.inject({ method: "GET", url: "/api/bookings" });
    expect(res.statusCode).toBe(200);
    const bookings = JSON.parse(res.payload);
    expect(bookings).toHaveLength(2);
    // Sorted by startTime ascending
    expect(new Date(bookings[0].startTime).getTime()).toBeLessThanOrEqual(
      new Date(bookings[1].startTime).getTime(),
    );
  });
});

describe("GET /api/bookings Upcoming filter", () => {
  it("hides bookings whose start time has passed", async () => {
    fakeNow();
    const res1 = await book("2026-11-13T12:00:00.000Z"); // 15:00 Moscow slot
    expect(res1.statusCode).toBe(201);

    // Advance 16 minutes, past the 15-minute booking's start
    vi.setSystemTime(new Date("2026-11-13T12:16:00.000Z"));

    const res = await app.inject({ method: "GET", url: "/api/bookings" });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual([]);
  });

  it("returns bookings that have not started yet", async () => {
    fakeNow();
    await book("2026-11-13T12:00:00.000Z");

    const res = await app.inject({ method: "GET", url: "/api/bookings" });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toHaveLength(1);
  });
});

describe("createBooking validation rules", () => {
  it("rejects a start time in the past", async () => {
    fakeNow();
    const res = await book("2026-11-13T11:45:00.000Z");
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload)).toEqual({ message: "Нельзя записаться на прошедшее время" });
  });

  it("rejects a start time beyond the Booking window", async () => {
    fakeNow();
    const res = await book("2026-12-15T09:00:00.000Z");
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload)).toEqual({ message: "Время начала вне окна записи" });
  });

  it("allows a booking on the last day of the Booking window", async () => {
    fakeNow();
    // 09:00 Moscow on Nov 26, the 14th calendar day of the window
    const res = await book("2026-11-26T06:00:00.000Z");
    expect(res.statusCode).toBe(201);
  });

  it("rejects a start time at the first moment past the Booking window", async () => {
    fakeNow();
    // 00:00 Moscow on Nov 27 is the exclusive window end
    const res = await book("2026-11-26T21:00:00.000Z");
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload)).toEqual({ message: "Время начала вне окна записи" });
  });

  it("rejects a start time before Working hours", async () => {
    fakeNow();
    // 07:00 Moscow on Nov 16
    const res = await book("2026-11-16T04:00:00.000Z");
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload)).toEqual({ message: "Время начала раньше рабочих часов" });
  });

  it("rejects a booking ending after Working hours", async () => {
    fakeNow();
    // 17:45 Moscow + 30 min ends at 18:15, past the 18:00 boundary
    const res = await book("2026-11-16T14:45:00.000Z", 30);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload)).toEqual({ message: "Встреча не помещается в рабочие часы" });
  });

  it("allows a booking ending exactly at the Working hours end", async () => {
    fakeNow();
    // 17:30 Moscow + 30 min ends exactly at 18:00
    const res = await book("2026-11-16T14:30:00.000Z", 30);
    expect(res.statusCode).toBe(201);
  });

  it("rejects a start time not aligned to the Slot step", async () => {
    fakeNow();
    // 12:10 Moscow is not a multiple of 15 minutes from 09:00
    const res = await book("2026-11-16T09:10:00.000Z");
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload)).toEqual({ message: "Время начала не совпадает с сеткой слотов" });
  });
});

describe("POST /api/bookings", () => {
  it("creates a booking with valid data", async () => {
    app = await createTestApp();
    const mt = await createMeetingType(app, "Test", "desc", 30);

    const slotsRes = await app.inject({ method: "GET", url: `/api/meeting-types/${mt.id}/slots` });
    const slots = JSON.parse(slotsRes.payload);

    const res = await app.inject({
      method: "POST",
      url: "/api/bookings",
      payload: {
        meetingTypeId: mt.id,
        guestName: "John Doe",
        guestEmail: "john@example.com",
        startTime: slots[0].startTime,
      },
    });
    expect(res.statusCode).toBe(201);
    const booking = JSON.parse(res.payload);
    expect(booking).toHaveProperty("id");
    expect(booking.meetingTypeId).toBe(mt.id);
    expect(booking.guestName).toBe("John Doe");
    expect(booking.startTime).toBe(slots[0].startTime);
  });

  it("rejects non-existent meeting type", async () => {
    app = await createTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/bookings",
      payload: {
        meetingTypeId: "nonexistent",
        guestName: "John",
        guestEmail: "john@example.com",
        startTime: new Date().toISOString(),
      },
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.payload)).toEqual({ message: "Тип встречи не найден" });
  });

  it("rejects missing fields", async () => {
    app = await createTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/bookings",
      payload: { meetingTypeId: "x", guestName: "John" },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload)).toEqual({
      message: "Укажите тип встречи, имя, email и время начала",
    });
  });

  it("rejects double booking (same slot)", async () => {
    app = await createTestApp();
    const mt = await createMeetingType(app, "Test", "desc", 30);

    const slotsRes = await app.inject({ method: "GET", url: `/api/meeting-types/${mt.id}/slots` });
    const slots = JSON.parse(slotsRes.payload);

    const res1 = await app.inject({
      method: "POST",
      url: "/api/bookings",
      payload: { meetingTypeId: mt.id, guestName: "A", guestEmail: "a@test.com", startTime: slots[0].startTime },
    });
    expect(res1.statusCode).toBe(201);

    const res2 = await app.inject({
      method: "POST",
      url: "/api/bookings",
      payload: { meetingTypeId: mt.id, guestName: "B", guestEmail: "b@test.com", startTime: slots[0].startTime },
    });
    expect(res2.statusCode).toBe(409);
    expect(JSON.parse(res2.payload)).toEqual({ message: "Это время уже занято, выберите другое" });
  });

  it("rejects overlapping slots with different meeting types", async () => {
    app = await createTestApp();
    const mt15 = await createMeetingType(app, "Short", "15 min", 15);
    const mt30 = await createMeetingType(app, "Long", "30 min", 30);

    // Get slots for 15-min type
    const slotsRes = await app.inject({ method: "GET", url: `/api/meeting-types/${mt15.id}/slots` });
    const slots = JSON.parse(slotsRes.payload);

    // Book a 15-min slot
    const res1 = await app.inject({
      method: "POST",
      url: "/api/bookings",
      payload: { meetingTypeId: mt15.id, guestName: "A", guestEmail: "a@test.com", startTime: slots[0].startTime },
    });
    expect(res1.statusCode).toBe(201);

    // Try to book a 30-min slot starting at the same time (should overlap)
    const res2 = await app.inject({
      method: "POST",
      url: "/api/bookings",
      payload: { meetingTypeId: mt30.id, guestName: "B", guestEmail: "b@test.com", startTime: slots[0].startTime },
    });
    expect(res2.statusCode).toBe(409);
  });

  it("rejects a 30-minute booking that starts inside a 60-minute booking", async () => {
    fakeNow();
    app = await createTestApp();
    const long = await createMeetingType(app, "Long", "60 min", 60);
    const short = await createMeetingType(app, "Short", "30 min", 30);

    // 10:00-11:00 Moscow on 16 Nov
    const first = await app.inject({
      method: "POST",
      url: "/api/bookings",
      payload: {
        meetingTypeId: long.id,
        guestName: "A",
        guestEmail: "a@test.com",
        startTime: "2026-11-16T07:00:00.000Z",
      },
    });
    expect(first.statusCode).toBe(201);

    // 10:30-11:00 Moscow, another MeetingType: partial overlap with 10:00-11:00
    const overlap = await app.inject({
      method: "POST",
      url: "/api/bookings",
      payload: {
        meetingTypeId: short.id,
        guestName: "B",
        guestEmail: "b@test.com",
        startTime: "2026-11-16T07:30:00.000Z",
      },
    });
    expect(overlap.statusCode).toBe(409);
    expect(JSON.parse(overlap.payload)).toEqual({
      message: "Это время уже занято, выберите другое",
    });

    // 11:00 starts exactly when the 60-minute Booking ends
    const backToBack = await app.inject({
      method: "POST",
      url: "/api/bookings",
      payload: {
        meetingTypeId: short.id,
        guestName: "C",
        guestEmail: "c@test.com",
        startTime: "2026-11-16T08:00:00.000Z",
      },
    });
    expect(backToBack.statusCode).toBe(201);
  });

  it("allows back-to-back bookings", async () => {
    app = await createTestApp();
    const mt = await createMeetingType(app, "Test", "desc", 30);

    const slotsRes = await app.inject({ method: "GET", url: `/api/meeting-types/${mt.id}/slots` });
    const slots = JSON.parse(slotsRes.payload);

    // Book first slot
    const res1 = await app.inject({
      method: "POST",
      url: "/api/bookings",
      payload: { meetingTypeId: mt.id, guestName: "A", guestEmail: "a@test.com", startTime: slots[0].startTime },
    });
    expect(res1.statusCode).toBe(201);

    // Book next slot (starts where first ends)
    // Find the slot that starts exactly when the first one ends (back-to-back)
    const backToBackSlot = slots.find((s: { startTime: string; endTime: string }) => s.startTime === slots[0].endTime);
    expect(backToBackSlot).toBeDefined();
    const res2 = await app.inject({
      method: "POST",
      url: "/api/bookings",
      payload: { meetingTypeId: mt.id, guestName: "B", guestEmail: "b@test.com", startTime: backToBackSlot!.startTime },
    });
    expect(res2.statusCode).toBe(201);
  });
});
