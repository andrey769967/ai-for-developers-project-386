import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "../lib/api/client";
import type { components } from "../lib/api/schema";
import { BookingList } from "../components/BookingList";
import {
  DURATION_STEP_MINUTES,
  MAX_DURATION_MINUTES,
  MIN_DURATION_MINUTES,
  parseDurationMinutes,
} from "../lib/duration";

type MeetingType = components["schemas"]["MeetingType"];

// openapi-fetch throws plain {message} objects, not Error instances
function apiErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return fallback;
}

export function OwnerPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("30");
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: meetingTypes } = useQuery({
    queryKey: ["meeting-types"],
    queryFn: async () => {
      const { data, error } = await client.GET("/api/meeting-types");
      if (error) throw error;
      return data;
    },
  });

  const { data: bookings } = useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const { data, error } = await client.GET("/api/bookings");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (body: components["schemas"]["MeetingTypeCreate"]) => {
      const { data, error } = await client.POST("/api/meeting-types", { body });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting-types"] });
      setName("");
      setDescription("");
      setDuration("30");
      setError(null);
    },
    onError: (err: unknown) => {
      setError(apiErrorMessage(err, "Ошибка создания"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client.DELETE("/api/meeting-types/{id}", {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onMutate: () => {
      setDeleteError(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting-types"] });
      setDeleteError(null);
    },
    onError: (err: unknown) => {
      setDeleteError(apiErrorMessage(err, "Ошибка удаления"));
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !description.trim()) {
      setError("Заполните все поля");
      return;
    }

    const parsed = parseDurationMinutes(duration);
    if (parsed.error || parsed.minutes === null) {
      setError(parsed.error);
      return;
    }

    createMutation.mutate({ name: name.trim(), description: description.trim(), durationMinutes: parsed.minutes });
  }

  return (
    <div className="space-y-8">
      {/* Create meeting type form */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Новый тип встречи</h2>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="Например: Консультация"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
              placeholder="Краткое описание типа встречи"
            />
          </div>
          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">Длительность</label>
            <div className="flex items-center gap-2">
              <input
                id="duration"
                type="text"
                inputMode="numeric"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                placeholder="30"
              />
              <span className="text-sm text-gray-500">мин</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Кратна {DURATION_STEP_MINUTES} минутам, от {MIN_DURATION_MINUTES} до {MAX_DURATION_MINUTES}:
              например, 15, 30, 60, 90, 120.
            </p>
          </div>
          {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3">{error}</div>}
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {createMutation.isPending ? "Создание..." : "Создать тип встречи"}
          </button>
        </form>
      </section>

      {/* Meeting types list */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Типы встреч</h2>
        {deleteError && <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-3">{deleteError}</div>}
        {meetingTypes && meetingTypes.length > 0 ? (
          <div className="space-y-2">
            {meetingTypes.map((mt: MeetingType) => (
              <div
                key={mt.id}
                className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3"
              >
                <div>
                  <span className="font-medium text-gray-900">{mt.name}</span>
                  <span className="text-gray-400 mx-2">|</span>
                  <span className="text-sm text-gray-500">{mt.description}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-indigo-600 font-medium">{mt.durationMinutes} мин</span>
                  <button
                    onClick={() => deleteMutation.mutate(mt.id)}
                    disabled={deleteMutation.isPending}
                    className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                    title="Удалить"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">Нет типов встреч</div>
        )}
      </section>

      {/* Bookings list */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Записи</h2>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          {bookings ? <BookingList bookings={bookings} /> : (
            <div className="text-center py-8 text-gray-400">Загрузка...</div>
          )}
        </div>
      </section>
    </div>
  );
}