import type { FastifyInstance } from "fastify";
import { storage } from "../storage/in-memory.js";
import { createBooking } from "../services/booking.js";
import { ApiError } from "../types.js";
import type { BookingCreate } from "../types.js";

export async function bookingsRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/bookings - list Upcoming bookings (startTime >= now)
  app.get("/bookings", async () => {
    return storage.listUpcomingBookings(new Date());
  });

  // POST /api/bookings - create a booking
  app.post("/bookings", async (request, reply) => {
    const body = request.body as Partial<BookingCreate>;

    if (!body?.meetingTypeId || !body?.guestName || !body?.guestEmail || !body?.startTime) {
      throw new ApiError(400, "Укажите тип встречи, имя, email и время начала");
    }

    const startTime = new Date(body.startTime);
    if (isNaN(startTime.getTime())) {
      throw new ApiError(400, "Время начала должно быть датой в формате ISO 8601");
    }

    const data: BookingCreate = {
      meetingTypeId: body.meetingTypeId,
      guestName: body.guestName,
      guestEmail: body.guestEmail,
      startTime: startTime.toISOString(),
    };

    const booking = await createBooking(data);

    return reply.code(201).send(booking);
  });
}