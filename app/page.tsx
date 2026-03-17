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
};

type HeatmapResponse = {
  range: "7d" | "30d";
  bucket: "hour";
  generated_at: string;
  cells: HeatmapCell[];
  summary: {
    hottest_slot: string | null;
    avg_online: number;
    peak_online: number;
  };
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://widc-api.20age1million.com";
const TORONTO_TZ = "America/Toronto";

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

function getHeatColor(value: number, maxValue: number): string {
  if (value <= 0 || maxValue <= 0) return "bg-slate-100";
  const ratio = value / maxValue;
  if (ratio < 0.2) return "bg-indigo-100";
  if (ratio < 0.4) return "bg-indigo-200";
  if (ratio < 0.6) return "bg-indigo-300";
  if (ratio < 0.8) return "bg-indigo-400";
  return "bg-indigo-500";
}

export default function Home() {
  const [people, setPeople] = useState<Person[]>([]);
  const [leaderboardRange, setLeaderboardRange] = useState<"today" | "week" | "month">("today");
  const [heatmapRange, setHeatmapRange] = useState<"7d" | "30d">("7d");
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
          fetch(`${API_BASE}/heatmap?range=${heatmapRange}&bucket=hour`, { cache: "no-store" }),
        ]);

        setPeople(peopleRes.ok ? ((await peopleRes.json()) as Person[]) : []);
        setLeaderboard(boardRes.ok ? ((await boardRes.json()) as LeaderboardResponse) : null);
        setHeatmap(heatRes.ok ? ((await heatRes.json()) as HeatmapResponse) : null);
      } catch {
        setError("Failed to load data.");
      }
    };

    load();
  }, [leaderboardRange, heatmapRange]);

  const updatedAt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TORONTO_TZ,
  }).format(new Date());

  const maxHeatValue = useMemo(
    () => Math.max(...(heatmap?.cells.map((cell) => cell.value) ?? [0])),
    [heatmap],
  );

  const myCard = leaderboard?.items[0];

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
          <h2 className="mb-4 text-xl font-semibold text-black">Current Presence</h2>
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
                {people.map((person) => (
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
          <div className="mb-4 rounded-xl bg-black/5 px-4 py-3 text-sm text-black/70">
            {myCard ? `Current #1: ${myCard.name} • ${formatDuration(myCard.duration_minutes)}` : "No leaderboard data yet."}
          </div>
          <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
            <div className="grid grid-cols-4 border-b border-black/10 bg-black/5 px-5 py-3 text-sm font-semibold text-black/70">
              <span>Rank</span>
              <span>Name</span>
              <span>Duration</span>
              <span>Gap</span>
            </div>
            <div className="divide-y divide-black/5">
              {(leaderboard?.items ?? []).length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-black/60">No ranking data in this range yet.</div>
              ) : (
                leaderboard?.items.map((item) => (
                  <div key={`${item.rank}-${item.name}`} className="grid grid-cols-4 px-5 py-3 text-sm text-black">
                    <span>#{item.rank}</span>
                    <span>{item.name}</span>
                    <span>{formatDuration(item.duration_minutes)}</span>
                    <span className="text-black/60">{item.diff_from_prev_minutes > 0 ? `${item.diff_from_prev_minutes}m` : "-"}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.6)] backdrop-blur">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-black">Presence Heatmap</h2>
            <div className="flex gap-2">
              {(["7d", "30d"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setHeatmapRange(r)}
                  className={`rounded-full px-3 py-1 text-sm ${heatmapRange === r ? "bg-black text-white" : "bg-black/5 text-black/70"}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-4 rounded-xl bg-black/5 px-4 py-3 text-sm text-black/70">
            {heatmap?.summary.hottest_slot
              ? `Hottest slot: ${heatmap.summary.hottest_slot} • Avg ${heatmap.summary.avg_online} online • Peak ${heatmap.summary.peak_online}`
              : "Heatmap will appear when data accumulates."}
          </div>
          <div className="overflow-auto rounded-2xl border border-black/10 bg-white p-4">
            <div className="grid min-w-[920px] grid-cols-[120px_repeat(24,minmax(26px,1fr))] gap-1 text-[11px]">
              <div />
              {Array.from({ length: 24 }, (_, i) => (
                <div key={`hour-${i}`} className="text-center text-black/50">
                  {i}
                </div>
              ))}
              {Array.from(new Set((heatmap?.cells ?? []).map((cell) => cell.date))).map((date) => (
                <>
                  <div key={`date-label-${date}`} className="pr-2 text-right text-black/60">
                    {date}
                  </div>
                  {Array.from({ length: 24 }, (_, hour) => {
                    const cell = heatmap?.cells.find((entry) => entry.date === date && entry.hour === hour);
                    const value = cell?.value ?? 0;
                    return (
                      <div
                        key={`${date}-${hour}`}
                        title={`${date} ${hour}:00 • ${value}`}
                        className={`h-5 rounded ${getHeatColor(value, maxHeatValue)}`}
                      />
                    );
                  })}
                </>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
