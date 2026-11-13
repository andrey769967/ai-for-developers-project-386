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
      throw new ApiError(400, "meetingTypeId, guestName, guestEmail and startTime are required");
    }

    const startTime = new Date(body.startTime);
    if (isNaN(startTime.getTime())) {
      throw new ApiError(400, "startTime must be a valid ISO 8601 date");
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