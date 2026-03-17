"use client";

import { useEffect, useMemo, useState } from "react";

type Person = {
  name: string;
  entered_at: string;
};

type LeaderboardItem = {
  rank: number;
  name: string;
  duration_minutes: number;
  diff_from_prev_minutes: number;
};

type LeaderboardResponse = {
  range: "today" | "week" | "month";
  generated_at: string;
  items: LeaderboardItem[];
};

type HeatmapCell = {
  date: string;
  hour: number;
  value: number;
  color: string;
};

type HeatmapResponse = {
  month: string;
  available_months: string[];
  bucket: "day";
  generated_at: string;
  cells: HeatmapCell[];
  day_details: Record<string, { name: string; duration_minutes: number }[]>;
  summary: {
    hottest_slot: string | null;
    avg_online: number;
    peak_online: number;
  };
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://widc-api.20age1million.com";
const TORONTO_TZ = "America/Toronto";
const CURRENT_MONTH = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  timeZone: TORONTO_TZ,
}).format(new Date());

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TORONTO_TZ,
  }).format(date);
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function Home() {
  const [people, setPeople] = useState<Person[]>([]);
  const [leaderboardRange, setLeaderboardRange] = useState<"today" | "week" | "month">("today");
  const [heatmapMonth, setHeatmapMonth] = useState(CURRENT_MONTH);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setError("");
      try {
        const [peopleRes, boardRes, heatRes] = await Promise.all([
          fetch(`${API_BASE}/get-people`, { cache: "no-store" }),
          fetch(`${API_BASE}/leaderboard?range=${leaderboardRange}&limit=50`, { cache: "no-store" }),
          fetch(`${API_BASE}/heatmap?month=${heatmapMonth}&bucket=day`, { cache: "no-store" }),
        ]);

        setPeople(peopleRes.ok ? ((await peopleRes.json()) as Person[]) : []);
        setLeaderboard(boardRes.ok ? ((await boardRes.json()) as LeaderboardResponse) : null);
        setHeatmap(heatRes.ok ? ((await heatRes.json()) as HeatmapResponse) : null);
      } catch {
        setError("Failed to load data.");
      }
    };

    load();
  }, [leaderboardRange, heatmapMonth]);

  const updatedAt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TORONTO_TZ,
  }).format(new Date());

  const dailyHeat = useMemo(() => {
    const values = (heatmap?.cells ?? []).reduce<Record<string, { value: number; color: string }>>((acc, cell) => {
      acc[cell.date] = { value: cell.value, color: cell.color };
      return acc;
    }, {});
    const [year, month] = heatmapMonth.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const date = `${heatmapMonth}-${String(i + 1).padStart(2, "0")}`;
      const dayValue = values[date] ?? { value: 0, color: "#d3d3d3" };
      return { date, value: Number(dayValue.value.toFixed(2)), color: dayValue.color };
    });
  }, [heatmap, heatmapMonth]);

  const firstDayOffset = dailyHeat.length > 0 ? new Date(`${heatmapMonth}-01T00:00:00`).getDay() : 0;
  const sortedPeople = useMemo(
    () => [...people].sort((a, b) => new Date(a.entered_at).getTime() - new Date(b.entered_at).getTime()),
    [people],
  );
  const selectedDay = dailyHeat.find((day) => day.date === selectedDate) ?? null;
  const selectedDayDetails = selectedDate ? heatmap?.day_details?.[selectedDate] ?? [] : [];
  const activeCount = people.length;

  const monthOptions = useMemo(
    () => [...new Set([heatmapMonth, ...(heatmap?.available_months ?? [CURRENT_MONTH])])],
    [heatmap?.available_months, heatmapMonth],
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f2e9ff_0%,_#fdf6e9_35%,_#f6f8ff_70%,_#ffffff_100%)]">
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-12">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold text-black">Who Is In DC</h1>
          <p className="text-sm text-black/60">Updated {updatedAt}</p>
        </header>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        ) : null}

        <section className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.6)] backdrop-blur">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-black">Current Presence</h2>
            <div
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                activeCount > 0 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
              }`}
            >
              {activeCount} people in DC
            </div>
          </div>
          {people.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/15 bg-white/60 p-6 text-center text-black/60">
              No one is currently marked as inside.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
              <div className="grid grid-cols-2 border-b border-black/10 bg-black/5 px-5 py-3 text-sm font-semibold text-black/70">
                <span>Name</span>
                <span>Entered</span>
              </div>
              <div className="divide-y divide-black/5">
                {sortedPeople.map((person) => (
                  <div key={`${person.name}-${person.entered_at}`} className="grid grid-cols-2 px-5 py-4 text-base text-black">
                    <span>{person.name}</span>
                    <span className="text-black/60">{formatTime(person.entered_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.6)] backdrop-blur">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-black">Duration Leaderboard</h2>
            <div className="flex gap-2">
              {(["today", "week", "month"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setLeaderboardRange(r)}
                  className={`rounded-full px-3 py-1 text-sm ${leaderboardRange === r ? "bg-black text-white" : "bg-black/5 text-black/70"}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
            <div className="grid grid-cols-3 border-b border-black/10 bg-black/5 px-5 py-3 text-sm font-semibold text-black/70">
              <span>Rank</span>
              <span>Name</span>
              <span>Duration</span>
            </div>
            <div className="divide-y divide-black/5">
              {(leaderboard?.items ?? []).length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-black/60">No ranking data in this range yet.</div>
              ) : (
                leaderboard?.items.map((item) => (
                  <div key={`${item.rank}-${item.name}`} className="grid grid-cols-3 px-5 py-3 text-sm text-black">
                    <span>#{item.rank}</span>
                    <span>{item.name}</span>
                    <span>{formatDuration(item.duration_minutes)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.6)] backdrop-blur">
          <div className="mb-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold text-black">Presence Heatmap</h2>
            <select
              value={heatmapMonth}
              onChange={(e) => setHeatmapMonth(e.target.value)}
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-black sm:w-auto sm:py-1"
            >
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </div>
          <div className="overflow-auto rounded-2xl border border-black/10 bg-white p-2 sm:p-4">
            <div className="grid grid-cols-7 gap-1 text-[10px] sm:gap-2 sm:text-xs">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((week) => (
                <div key={week} className="pb-1 text-center font-medium text-black/50">
                  <span className="sm:hidden">{week.slice(0, 1)}</span>
                  <span className="hidden sm:inline">{week}</span>
                </div>
              ))}
              {Array.from({ length: firstDayOffset }, (_, idx) => (
                <div key={`blank-${idx}`} className="h-14 rounded-md bg-transparent sm:h-20" />
              ))}
              {dailyHeat.map((day) => (
                <button
                  type="button"
                  key={day.date}
                  title={`${day.date} • ${day.value.toFixed(2)} avg hours/person`}
                  onClick={() => setSelectedDate((prev) => (prev === day.date ? null : day.date))}
                  className={`flex h-14 flex-col justify-between rounded-md border p-1.5 text-left sm:h-20 sm:p-2 ${
                    selectedDate === day.date ? "border-black/30" : "border-black/5"
                  }`}
                  style={{ backgroundColor: day.color }}
                >
                  <span className="text-[11px] font-semibold text-black/80 sm:text-xs">{day.date.slice(-2)}</span>
                  <span className="hidden text-[11px] text-black/70 sm:block">{day.value.toFixed(2)}</span>
                </button>
              ))}
            </div>
          </div>
          {selectedDay ? (
            <div className="mt-4 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black/80">
              <div className="font-semibold">{selectedDay.date}</div>
              <div>Avg hours/person: {selectedDay.value.toFixed(2)}</div>
              <div className="mt-3 overflow-hidden rounded-lg border border-black/10">
                <div className="grid grid-cols-2 border-b border-black/10 bg-black/5 px-3 py-2 text-xs font-semibold text-black/70">
                  <span>Name</span>
                  <span>Duration</span>
                </div>
                <div className="divide-y divide-black/5">
                  {selectedDayDetails.length === 0 ? (
                    <div className="px-3 py-3 text-xs text-black/60">No one stayed in DC on this day.</div>
                  ) : (
                    selectedDayDetails.map((row) => (
                      <div key={`${selectedDay.date}-${row.name}`} className="grid grid-cols-2 px-3 py-2 text-sm">
                        <span>{row.name}</span>
                        <span>{formatDuration(row.duration_minutes)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
