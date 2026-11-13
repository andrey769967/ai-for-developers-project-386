import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi";
import "@typespec/openapi3";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

@service(#{title: "Call Booking API"})
@doc("Call Booking API. Spec constants: timezone=Europe/Moscow UTC+3, working hours 09:00-18:00, booking window 14 days from today, slot step 15 minutes, slot duration = meeting type duration (multiple of 15, 15-540 minutes), back-to-back allowed, overlaps forbidden across all types, owner is predefined, no auth.")
namespace CallBooking;

@doc("Meeting type")
model MeetingType {
  id: string;
  name: string;
  description: string;
  @doc("Duration in minutes: multiple of 15, at least 15, at most 540 (the Owner working day 09:00-18:00)")
  @minValue(15)
  @maxValue(540)
  @extension("multipleOf", 15)
  durationMinutes: int32;
}

@doc("Create meeting type request")
model MeetingTypeCreate {
  name: string;
  description: string;
  @doc("Duration in minutes: multiple of 15, at least 15, at most 540 (the Owner working day 09:00-18:00)")
  @minValue(15)
  @maxValue(540)
  @extension("multipleOf", 15)
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

@doc("Bad request")
model BadRequest is BadRequestResponse {
  @body body: ApiError;
}

@doc("Not found")
model NotFound is NotFoundResponse {
  @body body: ApiError;
}

@doc("Conflict")
model Conflict is ConflictResponse {
  @body body: ApiError;
}

@doc("Health status")
model HealthStatus {
  status: string;
}

@doc("Booking window boundaries in UTC")
model BookingWindow {
  startTime: utcDateTime;
  endTime: utcDateTime;
}

@doc("Meeting type created")
model MeetingTypeCreated is CreatedResponse {
  @body body: MeetingType;
}

@doc("Booking created")
model BookingCreated is CreatedResponse {
  @body body: Booking;
}

@route("/api/meeting-types")
interface MeetingTypes {
  @doc("List all meeting types")
  @get list(): MeetingType[];

  @doc("Create a new meeting type")
  @post create(@body body: MeetingTypeCreate): MeetingTypeCreated | BadRequest;

  @doc("Delete a meeting type by id. Returns 409 if bookings exist for it.")
  @route("/{id}")
  @delete remove(@path id: string): NoContentResponse | NotFound | Conflict;

  @doc("Get available slots for a meeting type for the next 14 days")
  @route("/{id}/slots")
  @get slots(@path id: string): Slot[] | NotFound;
}

@route("/api/bookings")
interface Bookings {
  @doc("List all upcoming bookings")
  @get list(): Booking[];

  @doc("Create a booking. Returns 409 on overlap with an existing Booking.")
  @post create(@body body: BookingCreate): BookingCreated | BadRequest | NotFound | Conflict;
}

@route("/health")
interface Health {
  @doc("Liveness probe. Answers without touching storage and without side effects.")
  @get check(): HealthStatus;
}

@route("/api/booking-window")
interface BookingWindowApi {
  @doc("Current Booking window: 14 Owner timezone calendar days, including today")
  @get read(): BookingWindow;
}