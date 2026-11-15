import Link from "next/link";
import { getPlayerCoefficientSnapshot } from "../lib/player-coefficient-summary";

type Props = { playerId: string; season: number };
const fmt = (value: number | null, digits = 0): string =>
  value === null ? "—" : new Intl.NumberFormat("uk-UA", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);

export default async function PlayerCoefficientPanel({ playerId, season }: Props) {
  let snapshot: Awaited<ReturnType<typeof getPlayerCoefficientSnapshot>>;
  try {
    snapshot = await getPlayerCoefficientSnapshot(playerId);
  } catch (error) {
    console.error("PLAYER COEFFICIENT SUMMARY ERROR:", error);
    snapshot = null;
  }
  const selected = snapshot?.seasons.find((row) => row.season === season) ?? null;
  const available = (snapshot?.seasons.length ?? 0) > 0;
  const hasSelectedSeason = season <= 3 && selected !== null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-2 sm:px-6 sm:py-3" aria-label="Коефіцієнти гравця">
      <div className="overflow-hidden rounded-2xl border border-blue-400/20 bg-gradient-to-br from-[#10243a] via-[#091729] to-[#07111f] p-3 shadow-[0_14px_36px_rgba(0,0,0,0.18)] sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.17em] text-blue-300">IRON LEAGUE · PLAYER RATING</div>
            <h2 className="mt-0.5 text-lg font-black text-white">Коефіцієнти</h2>
          </div>
          <Link href="/coefficients?season=all" className="inline-flex items-center gap-1 rounded-full border border-blue-400/25 bg-blue-500/[0.08] px-2.5 py-1 text-xs font-bold text-blue-200 transition hover:border-blue-300/60 hover:text-white">
            Повний рейтинг <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="col-span-2 rounded-xl border border-blue-400/25 bg-blue-500/[0.08] px-3 py-2 sm:col-span-1">
            <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-blue-200/80">
              <span>Сезон {season}</span>
              {season === 3 && <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-2 py-0.5 text-[10px] text-emerald-200">LIVE</span>}
            </div>
            <div className="mt-0.5 text-[1.375rem] font-black tabular-nums text-white sm:text-[1.625rem]">{hasSelectedSeason ? fmt(selected.points) : "—"}</div>
            <div className="mt-0.5 text-[11px] text-white/45">{season > 3 ? "Коефіцієнт ще не розраховується" : hasSelectedSeason ? "Очки вибраного сезону" : "Немає даних для сезону"}</div>
          </div>
          <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <div className="text-[11px] font-bold text-white/55">Загальний</div>
            <div className="mt-0.5 text-[1.375rem] font-black tabular-nums text-white sm:text-[1.625rem]">{fmt(snapshot?.allPoints ?? null)}</div>
            <div className="mt-0.5 text-[11px] text-blue-300">{snapshot?.allPlace ? `${snapshot.allPlace}-те місце` : "Місце не визначено"}</div>
          </div>
          <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <div className="text-[11px] font-bold text-white/55">Середній</div>
            <div className="mt-0.5 text-[1.375rem] font-black tabular-nums text-white sm:text-[1.625rem]">{fmt(snapshot?.averagePoints ?? null, 2)}</div>
            <div className="mt-0.5 text-[11px] text-blue-300">{snapshot?.participatedSeasons ? `${snapshot.participatedSeasons} сезонів · ${snapshot.averagePlace ?? "—"}-те місце` : "Немає даних"}</div>
          </div>
        </div>
        {available ? (
          <div className="mt-2.5 border-t border-white/10 pt-2.5">
            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/50">Коефіцієнт за сезонами</div>
            <div className="grid grid-cols-3 gap-1.5">
              {[1, 2, 3].map((item) => {
                const record = snapshot?.seasons.find((entry) => entry.season === item);
                return (
                  <div key={item} className={`min-w-0 rounded-lg border px-2 py-1.5 text-center ${season === item ? "border-blue-400/30 bg-blue-400/[0.08]" : "border-white/[0.07] bg-white/[0.025]"}`}>
                    <div className="text-[10px] font-semibold text-white/50">Сезон {item}{item === 3 ? " · LIVE" : ""}</div>
                    <div className="mt-0.5 text-sm font-black tabular-nums text-white sm:text-[0.9375rem]">{record ? fmt(record.points) : "—"}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="mt-2 border-t border-white/10 pt-2 text-xs text-white/50">{season > 3 ? "Розрахунок коефіцієнтів сезону 4 ще не запущено." : "Коефіцієнти тимчасово недоступні або ще не нараховані."}</p>
        )}
      </div>
    </section>
  );
}
