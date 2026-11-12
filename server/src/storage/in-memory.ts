import { randomUUID } from "node:crypto";
import type { MeetingType, Booking } from "../types.js";

interface MeetingTypeRecord extends MeetingType {}
interface BookingRecord extends Booking {}

class InMemoryStorage {
  private meetingTypes = new Map<string, MeetingTypeRecord>();
  private bookings = new Map<string, BookingRecord>();

  // ─── Meeting Types ───

  listMeetingTypes(): MeetingTypeRecord[] {
    return Array.from(this.meetingTypes.values());
  }

  getMeetingType(id: string): MeetingTypeRecord | undefined {
    return this.meetingTypes.get(id);
  }

  createMeetingType(data: Omit<MeetingTypeRecord, "id">): MeetingTypeRecord {
    const record: MeetingTypeRecord = { ...data, id: randomUUID() };
    this.meetingTypes.set(record.id, record);
    return record;
  }

  deleteMeetingType(id: string): boolean {
    return this.meetingTypes.delete(id);
  }

  // ─── Bookings ───

  listBookings(): BookingRecord[] {
    return Array.from(this.bookings.values()).sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
  }

  createBooking(data: Omit<BookingRecord, "id">): BookingRecord {
    const record: BookingRecord = { ...data, id: randomUUID() };
    this.bookings.set(record.id, record);
    return record;
  }

  // ─── Overlap Check ───

  hasOverlap(startTime: string, endTime: string, excludeBookingId?: string): boolean {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();

    for (const [id, booking] of this.bookings) {
      if (excludeBookingId && id === excludeBookingId) continue;

      const bStart = new Date(booking.startTime).getTime();
      const bEnd = new Date(booking.endTime).getTime();

      // Intervals [start, end) and [bStart, bEnd) overlap iff start < bEnd && bStart < end
      // Back-to-back is allowed: end == bStart or start == bEnd is NOT an overlap
      if (start < bEnd && bStart < end) {
        return true;
      }
    }

    return false;
  }

  // ─── Seed ───

  seed(): void {
    if (this.meetingTypes.size > 0) return;

    this.createMeetingType({
      name: "Консультация",
      description: "Быстрый звонок на 15 минут",
      durationMinutes: 15,
    });
    this.createMeetingType({
      name: "Стратегическая встреча",
      description: "Обсуждение деталей, 30 минут",
      durationMinutes: 30,
    });
    this.createMeetingType({
      name: "Глубокое погружение",
      description: "Расширенная встреча, 60 минут",
      durationMinutes: 60,
    });
  }

  reset(): void {
    this.meetingTypes.clear();
    this.bookings.clear();
  }
}

export const storage = new InMemoryStorage();
