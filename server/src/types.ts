import type { components } from "./api-schema.js";

// API-модели не дублируются руками: api-schema.d.ts генерируется из OpenAPI
// (источник — contract/main.tsp). Пересборка: `npm run generate` из корня.
// Расхождение контракта и сервера ломает tsc на этапе build:server.
type Schemas = components["schemas"];

export type MeetingType = Schemas["MeetingType"];
export type MeetingTypeCreate = Schemas["MeetingTypeCreate"];
export type Booking = Schemas["Booking"];
export type BookingCreate = Schemas["BookingCreate"];
export type Slot = Schemas["Slot"];
export type BookingWindow = Schemas["BookingWindow"];
type ApiErrorBody = Schemas["ApiError"];

// HTTP-ошибка уровня приложения: тело следует контрактной модели ApiError,
// но класс нужен для throw/catch, поэтому ручной.
export class ApiError extends Error implements ApiErrorBody {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
