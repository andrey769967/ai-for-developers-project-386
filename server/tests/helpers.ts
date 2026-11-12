import Fastify from "fastify";
import { meetingTypesRoutes } from "../src/routes/meeting-types.js";
import { bookingsRoutes } from "../src/routes/bookings.js";
import { storage } from "../src/storage/in-memory.js";
import { ApiError } from "../src/types.js";

export async function createTestApp() {
  storage.reset();

  const app = Fastify({ logger: false });

  app.setErrorHandler((err, _request, reply) => {
    if (err instanceof ApiError) {
      reply.code(err.statusCode).send({ message: err.message });
      return;
    }
    reply.code(500).send({ message: "Internal Server Error" });
  });

  await app.register(meetingTypesRoutes, { prefix: "/api" });
  await app.register(bookingsRoutes, { prefix: "/api" });

  return app;
}

export async function createMeetingType(
  app: Fastify.FastifyInstance,
  name = "Test Meeting",
  description = "Test description",
  durationMinutes = 30,
) {
  const res = await app.inject({
    method: "POST",
    url: "/api/meeting-types",
    payload: { name, description, durationMinutes },
  });
  return JSON.parse(res.payload);
}