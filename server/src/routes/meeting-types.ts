import type { FastifyInstance } from "fastify";
import { storage } from "../storage/in-memory.js";
import { getAvailableSlots } from "../services/availability.js";
import { ApiError } from "../types.js";
import type { MeetingTypeCreate } from "../types.js";
import { CONFIG, MAX_DURATION_MINUTES } from "../config.js";

export async function meetingTypesRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/meeting-types - list all
  app.get("/meeting-types", async () => {
    return storage.listMeetingTypes();
  });

  // POST /api/meeting-types - create
  app.post("/meeting-types", async (request, reply) => {
    const body = request.body as Partial<MeetingTypeCreate>;

    if (!body?.name || !body?.description || !body?.durationMinutes) {
      throw new ApiError(400, "Укажите название, описание и длительность");
    }

    if (!Number.isInteger(body.durationMinutes) || body.durationMinutes < CONFIG.minDurationMinutes) {
      throw new ApiError(
        400,
        `Длительность должна быть целым числом минут не меньше ${CONFIG.minDurationMinutes}`,
      );
    }

    if (body.durationMinutes > MAX_DURATION_MINUTES) {
      throw new ApiError(
        400,
        `Длительность не может быть больше ${MAX_DURATION_MINUTES} минут: встреча должна поместиться в рабочий день`,
      );
    }

    if (body.durationMinutes % CONFIG.slotStepMinutes !== 0) {
      throw new ApiError(400, `Длительность должна быть кратна ${CONFIG.slotStepMinutes} минутам`);
    }

    const data: MeetingTypeCreate = {
      name: body.name,
      description: body.description,
      durationMinutes: body.durationMinutes,
    };

    const record = storage.createMeetingType(data);

    return reply.code(201).send(record);
  });

  // DELETE /api/meeting-types/:id
  app.delete("/meeting-types/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = storage.deleteMeetingTypeIfNoBookings(id);
    if (result === "not_found") {
      throw new ApiError(404, "Тип встречи не найден");
    }
    if (result === "has_bookings") {
      throw new ApiError(409, "Нельзя удалить тип встречи, у которого есть записи");
    }
    return reply.code(204).send();
  });

  // GET /api/meeting-types/:id/slots
  app.get("/meeting-types/:id/slots", async (request) => {
    const { id } = request.params as { id: string };
    return getAvailableSlots(id);
  });
}