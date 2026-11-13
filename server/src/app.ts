import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { existsSync } from "node:fs";
import { storage } from "./storage/in-memory.js";
import { meetingTypesRoutes } from "./routes/meeting-types.js";
import { bookingsRoutes } from "./routes/bookings.js";
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
  const app = Fastify({ logger: options.logger ?? false });

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
    reply.code(500).send({ message: "Internal Server Error" });
  });

  // Liveness probe: no storage access, no side effects.
  app.get("/health", async () => ({ status: "ok" }));

  await app.register(meetingTypesRoutes, { prefix: "/api" });
  await app.register(bookingsRoutes, { prefix: "/api" });

  if (options.seed !== false) {
    storage.seed();
  }

  if (options.staticDir && existsSync(options.staticDir)) {
    await app.register(fastifyStatic, {
      root: options.staticDir,
      prefix: "/",
      wildcard: false,
    });

    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith("/api/") || request.url === "/health") {
        reply.code(404).send({ message: "Not found" });
        return;
      }
      reply.sendFile("index.html");
    });
  }

  return app;
}
