import { describe, it, expect, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp, createMeetingType } from "./helpers.js";

let app: FastifyInstance;

afterEach(async () => {
  if (app) await app.close();
});

describe("GET /api/meeting-types", () => {
  it("returns empty list when no types exist", async () => {
    app = await createTestApp();
    const res = await app.inject({ method: "GET", url: "/api/meeting-types" });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual([]);
  });

  it("returns list after creating types", async () => {
    app = await createTestApp();
    await createMeetingType(app, "Quick", "15 min", 15);
    await createMeetingType(app, "Long", "60 min", 60);

    const res = await app.inject({ method: "GET", url: "/api/meeting-types" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body).toHaveLength(2);
    expect(body[0]).toHaveProperty("id");
    expect(body[0]).toHaveProperty("name", "Quick");
  });
});

describe("POST /api/meeting-types", () => {
  it("creates a meeting type with valid data", async () => {
    app = await createTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/meeting-types",
      payload: { name: "Consultation", description: "Quick call", durationMinutes: 30 },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body).toHaveProperty("id");
    expect(body.name).toBe("Consultation");
    expect(body.durationMinutes).toBe(30);
  });

  it("rejects missing fields", async () => {
    app = await createTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/meeting-types",
      payload: { name: "Test" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("rejects duration not multiple of 15", async () => {
    app = await createTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/meeting-types",
      payload: { name: "Test", description: "desc", durationMinutes: 20 },
    });
    expect(res.statusCode).toBe(400);
  });

  it("rejects duration less than 15", async () => {
    app = await createTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/meeting-types",
      payload: { name: "Test", description: "desc", durationMinutes: 5 },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("DELETE /api/meeting-types/:id", () => {
  it("deletes an existing meeting type", async () => {
    app = await createTestApp();
    const mt = await createMeetingType(app);
    const res = await app.inject({ method: "DELETE", url: `/api/meeting-types/${mt.id}` });
    expect(res.statusCode).toBe(204);
  });

  it("returns 404 for non-existent id", async () => {
    app = await createTestApp();
    const res = await app.inject({ method: "DELETE", url: "/api/meeting-types/nonexistent" });
    expect(res.statusCode).toBe(404);
  });
});

describe("GET /api/meeting-types/:id/slots", () => {
  it("returns 404 for non-existent meeting type", async () => {
    app = await createTestApp();
    const res = await app.inject({ method: "GET", url: "/api/meeting-types/nonexistent/slots" });
    expect(res.statusCode).toBe(404);
  });

  it("returns available slots", async () => {
    app = await createTestApp();
    const mt = await createMeetingType(app, "Test", "desc", 30);
    const res = await app.inject({ method: "GET", url: `/api/meeting-types/${mt.id}/slots` });
    expect(res.statusCode).toBe(200);
    const slots = JSON.parse(res.payload);
    expect(Array.isArray(slots)).toBe(true);
    expect(slots.length).toBeGreaterThan(0);
    // Each slot should have startTime and endTime
    expect(slots[0]).toHaveProperty("startTime");
    expect(slots[0]).toHaveProperty("endTime");
  });
});