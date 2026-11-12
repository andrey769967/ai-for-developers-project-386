import { describe, it, expect, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp, createMeetingType } from "./helpers.js";

let app: FastifyInstance;

afterEach(async () => {
  if (app) await app.close();
});

describe("Concurrent booking requests", () => {
  it("only one of two concurrent requests for the same slot succeeds", async () => {
    app = await createTestApp();
    const mt = await createMeetingType(app, "Test", "desc", 15);

    const slotsRes = await app.inject({ method: "GET", url: `/api/meeting-types/${mt.id}/slots` });
    const slots = JSON.parse(slotsRes.payload);
    expect(slots.length).toBeGreaterThan(0);

    const payload = {
      meetingTypeId: mt.id,
      guestName: "Guest",
      guestEmail: "guest@test.com",
      startTime: slots[0].startTime,
    };

    // Fire two requests concurrently
    const [res1, res2] = await Promise.all([
      app.inject({ method: "POST", url: "/api/bookings", payload }),
      app.inject({ method: "POST", url: "/api/bookings", payload }),
    ]);

    const codes = [res1.statusCode, res2.statusCode].sort();
    expect(codes).toEqual([201, 409]);
  });

  it("only one of five concurrent requests for the same slot succeeds", async () => {
    app = await createTestApp();
    const mt = await createMeetingType(app, "Test", "desc", 15);

    const slotsRes = await app.inject({ method: "GET", url: `/api/meeting-types/${mt.id}/slots` });
    const slots = JSON.parse(slotsRes.payload);
    expect(slots.length).toBeGreaterThan(0);

    const payload = {
      meetingTypeId: mt.id,
      guestName: "Guest",
      guestEmail: "guest@test.com",
      startTime: slots[0].startTime,
    };

    // Fire five requests concurrently
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        app.inject({ method: "POST", url: "/api/bookings", payload }),
      ),
    );

    const codes = results.map((r) => r.statusCode).sort();
    // Exactly one 201, four 409s
    const successCount = codes.filter((c) => c === 201).length;
    const conflictCount = codes.filter((c) => c === 409).length;
    expect(successCount).toBe(1);
    expect(conflictCount).toBe(4);
  });

  it("concurrent requests for different slots all succeed", async () => {
    app = await createTestApp();
    const mt = await createMeetingType(app, "Test", "desc", 15);

    const slotsRes = await app.inject({ method: "GET", url: `/api/meeting-types/${mt.id}/slots` });
    const slots = JSON.parse(slotsRes.payload);
    expect(slots.length).toBeGreaterThanOrEqual(3);

    // Pick three non-overlapping slots (15-min duration, 15-min step = consecutive are back-to-back)
    const results = await Promise.all(
      slots.slice(0, 3).map((slot: { startTime: string }) =>
        app.inject({
          method: "POST",
          url: "/api/bookings",
          payload: {
            meetingTypeId: mt.id,
            guestName: "Guest",
            guestEmail: "guest@test.com",
            startTime: slot.startTime,
          },
        }),
      ),
    );

    for (const res of results) {
      expect(res.statusCode).toBe(201);
    }
  });
});