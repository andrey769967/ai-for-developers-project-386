import type { FastifyInstance } from "fastify";
import { storage } from "../storage/in-memory.js";
import { getAvailableSlots } from "../services/availability.js";
import { ApiError } from "../types.js";
import { CONFIG } from "../config.js";

export async function meetingTypesRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/meeting-types - list all
  app.get("/meeting-types", async () => {
    return storage.listMeetingTypes();
  });

  // POST /api/meeting-types - create
  app.post("/meeting-types", async (request, reply) => {
    const body = request.body as {
      name?: string;
      description?: string;
      durationMinutes?: number;
    };

    if (!body?.name || !body?.description || !body?.durationMinutes) {
      throw new ApiError(400, "name, description and durationMinutes are required");
    }

    if (!Number.isInteger(body.durationMinutes) || body.durationMinutes < CONFIG.minDurationMinutes) {
      throw new ApiError(400, `durationMinutes must be an integer >= ${CONFIG.minDurationMinutes}`);
    }

    if (body.durationMinutes % CONFIG.slotStepMinutes !== 0) {
      throw new ApiError(400, `durationMinutes must be a multiple of ${CONFIG.slotStepMinutes}`);
    }

    const record = storage.createMeetingType({
      name: body.name,
      description: body.description,
      durationMinutes: body.durationMinutes,
    });

    return reply.code(201).send(record);
  });

  // DELETE /api/meeting-types/:id
  app.delete("/meeting-types/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = storage.deleteMeetingTypeIfNoBookings(id);
    if (result === "not_found") {
      throw new ApiError(404, "Meeting type not found");
    }
    if (result === "has_bookings") {
      throw new ApiError(409, "Cannot delete a meeting type with existing bookings");
    }
    return reply.code(204).send();
  });

  // GET /api/meeting-types/:id/slots
  app.get("/meeting-types/:id/slots", async (request) => {
    const { id } = request.params as { id: string };
    return getAvailableSlots(id);
  });
}