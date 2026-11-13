import { useState } from "react";
import type { components } from "../lib/api/schema";

type Slot = components["schemas"]["Slot"];

interface Props {
  slot: Slot;
  meetingTypeName: string;
  timezone: string;
  onSubmit: (guestName: string, guestEmail: string) => Promise<void>;
  onBack: () => void;
}

export function BookingForm({ slot, meetingTypeName, timezone, onSubmit, onBack }: Props) {
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const timeStr = new Intl.DateTimeFormat("ru-RU", {
    timeZone: timezone,
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(slot.startTime));

  const tzLabel = timezone.replace(/_/g, " ").replace("Europe/", "").replace("Asia/", "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!guestName.trim() || !guestEmail.trim()) {
      setError("Заполните все поля");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(guestName.trim(), guestEmail.trim());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Ошибка при создании записи";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4">
      <div className="bg-indigo-50 rounded-lg p-4 text-sm">
        <p className="text-indigo-600 font-medium">{meetingTypeName}</p>
        <p className="text-gray-500 mt-1">{timeStr} ({tzLabel})</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
        <input
          type="text"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          placeholder="Ваше имя"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          value={guestEmail}
          onChange={(e) => setGuestEmail(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          placeholder="you@example.com"
        />
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3">{error}</div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Назад
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? "Запись..." : "Записаться"}
        </button>
      </div>
    </form>
  );
}