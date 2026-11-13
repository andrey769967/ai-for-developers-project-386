import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { existsSync } from "node:fs";
import { storage } from "./storage/in-memory.js";
import { meetingTypesRoutes } from "./routes/meeting-types.js";
import { bookingsRoutes } from "./routes/bookings.js";
import { bookingWindowRoutes } from "./routes/booking-window.js";
import { ApiError } from "./types.js";

export interface BuildAppOptions {
  logger?: FastifyServerOptions["logger"];
  // Seed the default MeetingTypes on startup. Production does, tests usually do not.
  seed?: boolean;
  // Absolute path to the built frontend. When present, the server also serves the SPA.
  staticDir?: string;
}

// Single composition of the application: production entrypoint and tests use this
// same function, so tests exercise the composition that actually runs.
export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const { logger = false, seed = true, staticDir } = options;
  const app = Fastify({ logger });

  // CORS is only needed for the Vite dev server. In production the frontend is
  // served from the same origin as the API.
  if (process.env.NODE_ENV !== "production") {
    await app.register(cors, { origin: true });
  }

  app.setErrorHandler((err, _request, reply) => {
    if (err instanceof ApiError) {
      reply.code(err.statusCode).send({ message: err.message });
      return;
    }
    app.log.error(err);
    reply.code(500).send({ message: "Внутренняя ошибка сервера" });
  });

  // Liveness probe: no storage access, no side effects.
  app.get("/health", async () => ({ status: "ok" }));

  await app.register(meetingTypesRoutes, { prefix: "/api" });
  await app.register(bookingsRoutes, { prefix: "/api" });
  await app.register(bookingWindowRoutes, { prefix: "/api" });

  if (seed) {
    storage.seed();
  }

  if (staticDir && existsSync(staticDir)) {
    await app.register(fastifyStatic, {
      root: staticDir,
      prefix: "/",
      wildcard: false,
    });

    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith("/api/") || request.url.startsWith("/health")) {
        reply.code(404).send({ message: "Не найдено" });
        return;
      }
      reply.sendFile("index.html");
    });
  } else if (staticDir) {
    // In production a missing build is a configuration mistake, not a dev setup.
    if (process.env.NODE_ENV === "production") {
      app.log.warn(`Static directory not found: ${staticDir}. Serving API only.`);
    }
  }

  return app;
}
