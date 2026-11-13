import type { components } from "../lib/api/schema";

type Booking = components["schemas"]["Booking"];

interface Props {
  bookings: Booking[];
}

const TZ = "Europe/Moscow";

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: TZ,
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function BookingList({ bookings }: Props) {
  if (bookings.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>Записей пока нет</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-200">
            <th className="pb-2 pr-4 font-medium">Дата и время</th>
            <th className="pb-2 pr-4 font-medium">Тип</th>
            <th className="pb-2 pr-4 font-medium">Гость</th>
            <th className="pb-2 font-medium">Email</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 pr-4 whitespace-nowrap">{formatDateTime(b.startTime)}</td>
              <td className="py-2 pr-4">{b.meetingTypeName}</td>
              <td className="py-2 pr-4">{b.guestName}</td>
              <td className="py-2 text-gray-500">{b.guestEmail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}