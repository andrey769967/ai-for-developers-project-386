// Типы, соответствующие TypeSpec-контракту (contract/main.tsp)
// После генерации OpenAPI можно заменить на импорт из сгенерированных типов

export interface MeetingType {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
}

export interface MeetingTypeCreate {
  name: string;
  description: string;
  durationMinutes: number;
}

export interface Booking {
  id: string;
  meetingTypeId: string;
  meetingTypeName: string;
  guestName: string;
  guestEmail: string;
  startTime: string;  // ISO 8601 UTC
  endTime: string;     // ISO 8601 UTC
  createdAt: string;   // ISO 8601 UTC
}

export interface BookingCreate {
  meetingTypeId: string;
  guestName: string;
  guestEmail: string;
  startTime: string;  // ISO 8601 UTC
}

export interface Slot {
  startTime: string;  // ISO 8601 UTC
  endTime: string;     // ISO 8601 UTC
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}