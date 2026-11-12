"use client";

import { useState, type ReactNode } from "react";

type Props = {
  label: string;
  seasonLabel: string;
  allLabel: string;
  seasonSummary: string;
  allSummary: string;
  seasonContent: ReactNode;
  allContent: ReactNode;
};

/**
 * Локальне перемикання попередньо отриманих даних профілю.
 * Не робить мережевих запитів, не змінює URL, Supabase чи сезон.
 */
export default function ProfileViewSwitch({
  label,
  seasonLabel,
  allLabel,
  seasonSummary,
  allSummary,
  seasonContent,
  allContent,
}: Props) {
  const [mode, setMode] = useState<"season" | "all">("season");
  const seasonSelected = mode === "season";

  return (
    <div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label={label}
          className="inline-flex max-w-full gap-1 rounded-xl border border-blue-400/20 bg-[#081728] p-1"
        >
          <button
            type="button"
            aria-pressed={seasonSelected}
            onClick={() => setMode("season")}
            className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors sm:px-4 sm:text-sm ${
              seasonSelected
                ? "bg-blue-500 text-white shadow-md shadow-blue-500/15"
                : "text-white/60 hover:bg-white/10 hover:text-white"
            }`}
          >
            {seasonLabel}
          </button>
          <button
            type="button"
            aria-pressed={!seasonSelected}
            onClick={() => setMode("all")}
            className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors sm:px-4 sm:text-sm ${
              !seasonSelected
                ? "bg-blue-500 text-white shadow-md shadow-blue-500/15"
                : "text-white/60 hover:bg-white/10 hover:text-white"
            }`}
          >
            {allLabel}
          </button>
        </div>
        <p aria-live="polite" className="text-xs font-semibold text-white/55">
          {seasonSelected ? seasonSummary : allSummary}
        </p>
      </div>
      <div>{seasonSelected ? seasonContent : allContent}</div>
    </div>
  );
}
