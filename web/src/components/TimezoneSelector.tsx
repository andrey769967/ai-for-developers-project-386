import { useMemo } from "react";

interface Props {
  value: string;
  onChange: (tz: string) => void;
}

// Common timezones grouped by region for a manageable dropdown
const TZ_GROUPS: Record<string, string[]> = {
  "Россия": [
    "Europe/Moscow",
    "Europe/Kaliningrad",
    "Europe/Samara",
    "Asia/Yekaterinburg",
    "Asia/Omsk",
    "Asia/Krasnoyarsk",
    "Asia/Irkutsk",
    "Asia/Yakutsk",
    "Asia/Vladivostok",
    "Asia/Magadan",
    "Asia/Kamchatka",
  ],
  "Европа": [
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Europe/Madrid",
    "Europe/Rome",
    "Europe/Amsterdam",
    "Europe/Stockholm",
    "Europe/Warsaw",
    "Europe/Istanbul",
  ],
  "Америка": [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Sao_Paulo",
  ],
  "Азия": [
    "Asia/Dubai",
    "Asia/Tehran",
    "Asia/Kolkata",
    "Asia/Shanghai",
    "Asia/Tokyo",
    "Asia/Seoul",
    "Asia/Singapore",
  ],
  "Другое": [
    "Australia/Sydney",
    "Pacific/Auckland",
    "Africa/Cairo",
    "Africa/Johannesburg",
  ],
};

export function TimezoneSelector({ value, onChange }: Props) {
  const browserTz = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    [],
  );

  return (
    <div className="flex items-center gap-2">
      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 4 4 0 01-8 0z" />
        <circle cx="12" cy="12" r="9" strokeWidth={1.5} />
      </svg>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 hover:border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none cursor-pointer"
      >
        {value === browserTz && !Object.values(TZ_GROUPS).flat().includes(browserTz) && (
          <option value={browserTz}>Текущий ({browserTz})</option>
        )}
        {Object.entries(TZ_GROUPS).map(([region, tzs]) => (
          <optgroup key={region} label={region}>
            {tzs.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace(/_/g, " ")}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}