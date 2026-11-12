import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi3";

using TypeSpec.Http;

@service(#{title: "Call Booking API"})
@doc("Call Booking API. Spec constants: timezone=Europe/Moscow UTC+3, working hours 09:00-18:00, booking window 14 days from today, slot step 15 minutes, slot duration = meeting type duration (multiple of 15), back-to-back allowed, overlaps forbidden across all types, owner is predefined, no auth.")
namespace CallBooking;

@doc("Meeting type")
model MeetingType {
  id: string;
  name: string;
  description: string;
  durationMinutes: int32;
}

@doc("Create meeting type request")
model MeetingTypeCreate {
  name: string;
  description: string;
  durationMinutes: int32;
}

@doc("Booking")
model Booking {
  id: string;
  meetingTypeId: string;
  meetingTypeName: string;
  guestName: string;
  guestEmail: string;
  startTime: utcDateTime;
  endTime: utcDateTime;
  createdAt: utcDateTime;
}

@doc("Create booking request")
model BookingCreate {
  meetingTypeId: string;
  guestName: string;
  guestEmail: string;
  startTime: utcDateTime;
}

@doc("Available time slot")
model Slot {
  startTime: utcDateTime;
  endTime: utcDateTime;
}

@doc("API error")
model ApiError {
  message: string;
}

@route("/api/meeting-types")
interface MeetingTypes {
  @doc("List all meeting types")
  @get list(): MeetingType[];

  @doc("Create a new meeting type")
  @post create(@body body: MeetingTypeCreate): MeetingType;

  @doc("Delete a meeting type by id")
  @route("/{id}")
  @delete remove(@path id: string): void;

  @doc("Get available slots for a meeting type for the next 14 days")
  @route("/{id}/slots")
  @get slots(@path id: string): Slot[];
}

@route("/api/bookings")
interface Bookings {
  @doc("List all upcoming bookings")
  @get list(): Booking[];

  @doc("Create a booking. Returns 409 if slot is taken.")
  @post create(@body body: BookingCreate): Booking;
}