import { describe, it, expect, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { resolvePort } from "../src/config.js";
import { storage } from "../src/storage/in-memory.js";
import { createTestApp } from "./helpers.js";

let app: FastifyInstance | undefined;

afterEach(async () => {
  if (app) await app.close();
  app = undefined;
  storage.reset();
});

describe("GET /health", () => {
  it("returns 200 and { status: 'ok' }", async () => {
    app = await createTestApp();
    const res = await app.inject({ method: "GET", url: "/health" });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual({ status: "ok" });
  });

  it("does not create storage records", async () => {
    app = await createTestApp();
    expect(storage.listMeetingTypes()).toEqual([]);

    await app.inject({ method: "GET", url: "/health" });

    expect(storage.listMeetingTypes()).toEqual([]);
  });
});

describe("buildApp composition", () => {
  it("seeds the default meeting types unless seeding is disabled", async () => {
    storage.reset();
    app = await buildApp({ logger: false });

    const res = await app.inject({ method: "GET", url: "/api/meeting-types" });

    expect(JSON.parse(res.payload)).toHaveLength(3);
  });

  it("enables CORS outside production", async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    try {
      app = await createTestApp();
      const res = await app.inject({
        method: "GET",
        url: "/health",
        headers: { origin: "http://localhost:5173" },
      });

      expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  it("does not enable CORS in production", async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      app = await buildApp({ logger: false, seed: false });
      const res = await app.inject({
        method: "GET",
        url: "/health",
        headers: { origin: "http://localhost:5173" },
      });

      expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});

describe("resolvePort", () => {
  it("defaults to 3000", () => {
    expect(resolvePort({})).toBe(3000);
  });

  it("uses PORT from the environment", () => {
    expect(resolvePort({ PORT: "4100" })).toBe(4100);
  });

  it("falls back to 3000 when PORT is invalid", () => {
    expect(resolvePort({ PORT: "not-a-port" })).toBe(3000);
  });
});
