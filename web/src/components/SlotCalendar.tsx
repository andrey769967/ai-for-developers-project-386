import { useState, useMemo } from "react";
import type { components } from "../lib/api/schema";
import {
  buildCalendarDays,
  formatMonth,
  getDayKey,
  getDayNumber,
  getWeekdayMon,
} from "../lib/calendar";

type Slot = components["schemas"]["Slot"];

interface Props {
  slots: Slot[];
  selectedSlot: Slot | null;
  onSelect: (slot: Slot) => void;
  timezone: string;
  // UTC instants of the Booking window; the calendar always shows the full
  // window, including days with no free Slot left.
  windowStart: string;
  windowEnd: string;
}

function formatTime(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

const WEEKDAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function SlotCalendar({ slots, selectedSlot, onSelect, timezone, windowStart, windowEnd }: Props) {
  const tz = timezone;

  // Group slots by the day the guest sees them on
  const slotsByDay = useMemo(() => {
    const groups = new Map<string, Slot[]>();
    for (const slot of slots) {
      const key = getDayKey(slot.startTime, tz);
      const group = groups.get(key);
      if (group) {
        group.push(slot);
      } else {
        groups.set(key, [slot]);
      }
    }
    return groups;
  }, [slots, tz]);

  // All 14 dates of the Booking window, starting from the guest's date of
  // the window start. Days without free Slot stay visible but muted.
  const calendarDays = useMemo(
    () => buildCalendarDays(windowStart, windowEnd, tz),
    [windowStart, windowEnd, tz],
  );

  const dayEntries = useMemo(
    () => calendarDays.map((key) => ({ key, slots: slotsByDay.get(key) ?? [] })),
    [calendarDays, slotsByDay],
  );

  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const firstAvailableKey = dayEntries.find((day) => day.slots.length > 0)?.key ?? null;
  const validDayKey = dayEntries.some((day) => day.key === selectedDayKey)
    ? selectedDayKey
    : (firstAvailableKey ?? dayEntries[0]?.key ?? null);

  const currentDay = dayEntries.find((day) => day.key === validDayKey);
  const daySlots = currentDay?.slots ?? [];

  const todayKey = getDayKey(new Date().toISOString(), tz);
  const leadingBlanks = calendarDays.length > 0 ? getWeekdayMon(calendarDays[0]) : 0;

  if (calendarDays.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-3 h-[420px]">
      {/* Left panel: calendar grid */}
      <div className="w-[280px] flex-shrink-0 border border-gray-200 rounded-xl overflow-hidden bg-white flex flex-col">
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Даты
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
            <div key={`blank-${i}`} className="bg-white h-11" />
          ))}
          {dayEntries.map(({ key, slots: daySlotsForDay }, index) => {
            const isActive = key === validDayKey;
            const isToday = key === todayKey;
            const hasSlots = daySlotsForDay.length > 0;
            const hasSelectedSlot =
              !!selectedSlot && daySlotsForDay.some((s) => s.startTime === selectedSlot.startTime);
            const showMonth = index === 0 || getDayNumber(key) === 1;

            return (
              <button
                key={key}
                onClick={() => setSelectedDayKey(key)}
                aria-label={hasSlots ? undefined : "Нет свободных слотов"}
                className={`relative h-11 flex flex-col items-center justify-center text-sm transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : isToday
                      ? "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                      : hasSlots
                        ? "bg-white text-gray-700 hover:bg-gray-50"
                        : "bg-white text-gray-300 hover:bg-gray-50"
                }`}
              >
                <span
                  className={`font-medium leading-none ${
                    isActive ? "text-white" : isToday ? "text-indigo-600" : hasSlots ? "text-gray-700" : "text-gray-300"
                  }`}
                >
                  {getDayNumber(key)}
                </span>
                {showMonth && (
                  <span
                    className={`mt-0.5 text-[9px] leading-none ${
                      isActive ? "text-indigo-100" : "text-gray-400"
                    }`}
                  >
                    {formatMonth(key)}
                  </span>
                )}
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
            <div className="text-center py-8 text-gray-400 text-sm">
              Нет свободных слотов в этот день
            </div>
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
