import { useState, useMemo } from "react";
import type { components } from "../lib/api/schema";

type Slot = components["schemas"]["Slot"];

interface Props {
  slots: Slot[];
  selectedSlot: Slot | null;
  onSelect: (slot: Slot) => void;
  timezone: string;
}

function formatTime(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function getDayKey(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

// Monday-first weekday index (0=Mon .. 6=Sun) in the given timezone
function getWeekdayMon(iso: string, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
  }).formatToParts(new Date(iso));
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const map: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  return map[weekday] ?? 0;
}

function isToday(iso: string, tz: string): boolean {
  return getDayKey(iso, tz) === getDayKey(new Date().toISOString(), tz);
}

const WEEKDAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function SlotCalendar({ slots, selectedSlot, onSelect, timezone }: Props) {
  const tz = timezone;

  // Group slots by day key (in selected timezone)
  const days = useMemo(() => {
    const groups = new Map<string, Slot[]>();
    for (const slot of slots) {
      const key = getDayKey(slot.startTime, tz);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(slot);
    }
    return Array.from(groups.entries());
  }, [slots, tz]);

  // Reset selected day when timezone changes
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(
    days.length > 0 ? days[0][0] : null,
  );

  // Ensure selected day is valid when timezone changes
  const validDayKey = days.find(([key]) => key === selectedDayKey)
    ? selectedDayKey
    : days.length > 0
      ? days[0][0]
      : null;

  const currentDay = days.find(([key]) => key === validDayKey);
  const daySlots = currentDay?.[1] ?? [];

  const leadingBlanks = days.length > 0 ? getWeekdayMon(days[0][1][0].startTime, tz) : 0;

  if (days.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p>Нет свободных слотов на ближайшие 14 дней</p>
      </div>
    );
  }

  return (
    <div className="flex gap-3 h-[420px]">
      {/* Left panel: calendar grid */}
      <div className="w-[280px] flex-shrink-0 border border-gray-200 rounded-xl overflow-hidden bg-white flex flex-col">
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Календарь
        </div>
        <div className="grid grid-cols-7 border-b border-gray-200">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="text-center text-[11px] font-medium text-gray-400 py-1.5">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-gray-100 flex-1 overflow-y-auto content-start">
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`blank-${i}`} className="bg-white h-9" />
          ))}
          {days.map(([dayKey, dSlots]) => {
            const iso = dSlots[0].startTime;
            const isActive = dayKey === validDayKey;
            const today = isToday(iso, tz);
            const hasSelectedSlot = !!selectedSlot && dSlots.some((s) => s.startTime === selectedSlot.startTime);
            const dayNum = new Intl.DateTimeFormat("ru-RU", { timeZone: tz, day: "numeric" }).format(new Date(iso));

            return (
              <button
                key={dayKey}
                onClick={() => setSelectedDayKey(dayKey)}
                className={`relative h-9 flex items-center justify-center text-sm transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : today
                      ? "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className={`font-medium leading-none ${isActive ? "text-white" : today ? "text-indigo-600" : "text-gray-700"}`}>
                  {dayNum}
                </span>
                {hasSelectedSlot && !isActive && (
                  <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                )}
                {isActive && (
                  <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right panel: time slots */}
      <div className="flex-1 border border-gray-200 rounded-xl overflow-hidden bg-white">
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Время
        </div>
        <div className="overflow-y-auto p-3" style={{ height: "calc(100% - 2.25rem)" }}>
          {daySlots.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Нет свободных слотов</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {daySlots.map((slot) => {
                const isSelected = selectedSlot?.startTime === slot.startTime;
                return (
                  <button
                    key={slot.startTime}
                    onClick={() => onSelect(slot)}
                    className={`px-2 py-2 rounded-lg text-sm font-medium border transition-all ${
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-gray-700 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50"
                    }`}
                  >
                    {formatTime(slot.startTime, tz)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}