import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "../lib/api/client";
import type { components } from "../lib/api/schema";
import { MeetingTypeCard } from "../components/MeetingTypeCard";
import { SlotCalendar } from "../components/SlotCalendar";
import { BookingForm } from "../components/BookingForm";
import { TimezoneSelector } from "../components/TimezoneSelector";

type MeetingType = components["schemas"]["MeetingType"];
type Slot = components["schemas"]["Slot"];

type Step = "types" | "slots" | "form" | "confirmation";

export function GuestPage() {
  const [step, setStep] = useState<Step>("types");
  const [selectedType, setSelectedType] = useState<MeetingType | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const queryClient = useQueryClient();

  // Default to browser timezone
  const [timezone, setTimezone] = useState<string>(() =>
    Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Moscow",
  );

  const tzLabel = useMemo(
    () => timezone.replace(/_/g, " ").replace("Europe/", "").replace("Asia/", ""),
    [timezone],
  );

  const { data: meetingTypes, isLoading: typesLoading } = useQuery({
    queryKey: ["meeting-types"],
    queryFn: async () => {
      const { data, error } = await client.GET("/api/meeting-types");
      if (error) throw error;
      return data;
    },
  });

  const { data: slots, isLoading: slotsLoading } = useQuery({
    queryKey: ["slots", selectedType?.id],
    queryFn: async () => {
      const { data, error } = await client.GET("/api/meeting-types/{id}/slots", {
        params: { path: { id: selectedType!.id } },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedType && step === "slots",
  });

  const { data: bookingWindow } = useQuery({
    queryKey: ["booking-window"],
    queryFn: async () => {
      const { data, error } = await client.GET("/api/booking-window");
      if (error) throw error;
      return data;
    },
  });

  const bookingMutation = useMutation({
    mutationFn: async (params: { guestName: string; guestEmail: string }) => {
      const { data, error } = await client.POST("/api/bookings", {
        body: {
          meetingTypeId: selectedType!.id,
          guestName: params.guestName,
          guestEmail: params.guestEmail,
          startTime: selectedSlot!.startTime,
        },
      });
      if (error) throw new Error((error as { message?: string }).message ?? "Ошибка записи");
      return data;
    },
    onSuccess: () => {
      setStep("confirmation");
      queryClient.invalidateQueries({ queryKey: ["slots"] });
    },
  });

  function handleSelectType(mt: MeetingType) {
    setSelectedType(mt);
    setSelectedSlot(null);
    setStep("slots");
  }

  function handleSelectSlot(slot: Slot) {
    setSelectedSlot(slot);
    setStep("form");
  }

  function reset() {
    setSelectedType(null);
    setSelectedSlot(null);
    setStep("types");
  }

  // ─── Confirmation ───
  if (step === "confirmation") {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Вы записаны!</h2>
        <p className="text-gray-500 mt-2">
          {selectedType?.name} — {" "}
          {selectedSlot && new Intl.DateTimeFormat("ru-RU", {
            timeZone: timezone,
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(selectedSlot.startTime))}
          {" (" + tzLabel + ")"}
        </p>
        <button
          onClick={reset}
          className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
        >
          Записаться ещё
        </button>
      </div>
    );
  }

  // ─── Booking Form ───
  if (step === "form" && selectedType && selectedSlot) {
    return (
      <div>
        <button
          onClick={() => setStep("slots")}
          className="mb-4 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Назад к слотам
        </button>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Заполните данные</h2>
        <BookingForm
          slot={selectedSlot}
          meetingTypeName={selectedType.name}
          timezone={timezone}
          onBack={() => setStep("slots")}
          onSubmit={async (name, email) => {
            await bookingMutation.mutateAsync({ guestName: name, guestEmail: email });
          }}
        />
      </div>
    );
  }

  // ─── Slot Calendar ───
  if (step === "slots" && selectedType) {
    return (
      <div>
        <button
          onClick={reset}
          className="mb-4 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Назад к типам встреч
        </button>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{selectedType.name}</h2>
            <p className="text-sm text-gray-500">
              {selectedType.description} — {selectedType.durationMinutes} мин
            </p>
          </div>
          <TimezoneSelector value={timezone} onChange={setTimezone} />
        </div>
        {slotsLoading || !bookingWindow ? (
          <div className="text-center py-12 text-gray-400">Загрузка слотов...</div>
        ) : (
          <SlotCalendar
            slots={slots ?? []}
            selectedSlot={selectedSlot}
            onSelect={handleSelectSlot}
            timezone={timezone}
            windowStart={bookingWindow.startTime}
            windowEnd={bookingWindow.endTime}
          />
        )}
      </div>
    );
  }

  // ─── Meeting Types List ───
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Выберите тип встречи</h2>
      {typesLoading ? (
        <div className="text-center py-12 text-gray-400">Загрузка...</div>
      ) : meetingTypes && meetingTypes.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {meetingTypes.map((mt) => (
            <MeetingTypeCard key={mt.id} meetingType={mt} onSelect={handleSelectType} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">
          <p>Нет доступных типов встреч</p>
          <p className="text-sm mt-1">Создайте типы встреч в календаре владельца</p>
        </div>
      )}
    </div>
  );
}