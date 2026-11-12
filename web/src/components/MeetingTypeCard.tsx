import type { components } from "../lib/api/schema";

type MeetingType = components["schemas"]["MeetingType"];

interface Props {
  meetingType: MeetingType;
  onSelect: (mt: MeetingType) => void;
}

export function MeetingTypeCard({ meetingType, onSelect }: Props) {
  return (
    <button
      onClick={() => onSelect(meetingType)}
      className="w-full text-left bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-400 hover:shadow-md transition-all duration-200 group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
            {meetingType.name}
          </h3>
          <p className="text-sm text-gray-500 mt-1">{meetingType.description}</p>
        </div>
        <div className="flex-shrink-0 ml-4 flex items-center gap-1 bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-sm font-medium">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {meetingType.durationMinutes} мин
        </div>
      </div>
    </button>
  );
}