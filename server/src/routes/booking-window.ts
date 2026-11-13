import type { FastifyInstance } from "fastify";
import { getBookingWindow } from "../services/time-window.js";
import type { BookingWindow } from "../types.js";

export async function bookingWindowRoutes(app: FastifyInstance): Promise<void> {
  // The guest calendar needs the window boundaries to show all 14 dates,
  // including the days with no free Slot left.
  app.get("/booking-window", async (): Promise<BookingWindow> => {
    const { start, end } = getBookingWindow(new Date());
    return { startTime: start.toISOString(), endTime: end.toISOString() };
  });
}
