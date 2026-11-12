import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { fileURLToPath } from "node:url";
import { dirname, join, isAbsolute } from "node:path";
import { existsSync } from "node:fs";
import { storage } from "./storage/in-memory.js";
import { meetingTypesRoutes } from "./routes/meeting-types.js";
import { bookingsRoutes } from "./routes/bookings.js";
import { ApiError } from "./types.js";
import { CONFIG } from "./config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main(): Promise<void> {
  const app = Fastify({ logger: true });

  // CORS for development (Vite dev server on different port)
  await app.register(cors, { origin: true });

  // Error handler for ApiError
  app.setErrorHandler((err, _request, reply) => {
    if (err instanceof ApiError) {
      reply.code(err.statusCode).send({ message: err.message });
      return;
    }
    app.log.error(err);
    reply.code(500).send({ message: "Internal Server Error" });
  });

  // API routes
  await app.register(meetingTypesRoutes, { prefix: "/api" });
  await app.register(bookingsRoutes, { prefix: "/api" });

  // Seed initial meeting types
  storage.seed();

  // Serve static frontend files (production)
  const staticDir = CONFIG.staticDir;
  const staticPath = isAbsolute(staticDir)
    ? staticDir
    : join(__dirname, staticDir);

  if (existsSync(staticPath)) {
    await app.register(fastifyStatic, {
      root: staticPath,
      prefix: "/",
      wildcard: false,
    });

    // SPA fallback: serve index.html for non-API routes
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith("/api/")) {
        reply.code(404).send({ message: "Not found" });
        return;
      }
      reply.sendFile("index.html");
    });
  }

  try {
    await app.listen({ port: CONFIG.port, host: CONFIG.host });
    app.log.info(`Server running on http://localhost:${CONFIG.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
