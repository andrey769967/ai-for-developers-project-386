import { describe, it, expect, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp, createMeetingType } from "./helpers.js";

let app: FastifyInstance;

afterEach(async () => {
  if (app) await app.close();
});

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
    expect(JSON.parse(res.payload)).toEqual({ message: "Meeting type not found" });
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
      message: "meetingTypeId, guestName, guestEmail and startTime are required",
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
    expect(JSON.parse(res2.payload)).toEqual({ message: "This time slot is already booked" });
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
