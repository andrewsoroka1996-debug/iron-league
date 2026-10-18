"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type SeasonNumber = 2 | 3 | 4;

type Series = {
  series_id: string;

  bracket_slot:
    | number
    | null;

  home_id:
    | string
    | null;

  home_name: string;

  away_id:
    | string
    | null;

  away_name: string;

  complete: boolean;

  winner_id:
    | string
    | null;

  winner_name:
    | string
    | null;

  loser_id?:
    | string
    | null;

  loser_name?:
    | string
    | null;

  status: string;
};

type PlayoffResponse = {
  success?: boolean;

  series?: Series[];

  error?: string;
};

type StageData = {
  quarterfinal: Series[];
  semifinal: Series[];
  final: Series[];
  thirdPlace: Series[];
};

type Props = {
  season: SeasonNumber;
};

function getStatusText(
  series: Series
) {
  if (
    series.winner_name
  ) {
    return `Переможець: ${series.winner_name}`;
  }

  if (
    series.status ===
    "needs-tiebreak"
  ) {
    return "Потрібен 7-й матч";
  }

  if (
    series.status ===
    "tiebreak-pending"
  ) {
    return "Очікується 7-й матч";
  }

  if (
    series.status ===
    "tiebreak-draw"
  ) {
    return "7-й матч завершився нічиєю";
  }

  return "Протистояння триває";
}

// Bracket presentation. Match loading and series status come from the existing API.
const CARD_HEIGHT = 112;
const CARD_GAP = 24;
const STEP = CARD_HEIGHT + CARD_GAP;
const TOTAL_HEIGHT = 4 * STEP - CARD_GAP;

function topFor(stage: "quarterfinal" | "semifinal" | "final", slot: number) {
  const level = stage === "quarterfinal" ? 0 : stage === "semifinal" ? 1 : 2;
  const scale = 2 ** level;
  return (slot - 1) * scale * STEP + ((scale - 1) * STEP) / 2;
}

function getSeriesAt(series: Series[], slot: number) {
  return series.find((item) => item.bracket_slot === slot);
}

type CardData = {
  label: string;
  series?: Series;
  first: string;
  second: string;
  waiting?: string;
  third?: boolean;
};

function expectedTeam(series: Series | undefined, roundName: string, slot: number) {
  if (series?.winner_name) return series.winner_name;
  if (series) return `Переможець: ${series.home_name} — ${series.away_name}`;
  return `Переможець ${roundName} №${slot}`;
}

function cardData(stage: "quarterfinal" | "semifinal" | "final" | "thirdPlace", slot: number, data: StageData): CardData {
  if (stage === "quarterfinal") {
    const series = getSeriesAt(data.quarterfinal, slot);
    return {
      label: `Пара №${slot}`,
      series,
      first: series?.home_name ?? "Учасник не визначений",
      second: series?.away_name ?? "Учасник не визначений",
    };
  }
  if (stage === "semifinal") {
    const series = getSeriesAt(data.semifinal, slot);
    return {
      label: `Пара №${slot}`,
      series,
      first: series?.home_name ?? expectedTeam(getSeriesAt(data.quarterfinal, 2 * slot - 1), "1/4", 2 * slot - 1),
      second: series?.away_name ?? expectedTeam(getSeriesAt(data.quarterfinal, 2 * slot), "1/4", 2 * slot),
    };
  }
  if (stage === "final") {
    const series = getSeriesAt(data.final, 1);
    return {
      label: "Фінал",
      series,
      first: series?.home_name ?? expectedTeam(getSeriesAt(data.semifinal, 1), "1/2", 1),
      second: series?.away_name ?? expectedTeam(getSeriesAt(data.semifinal, 2), "1/2", 2),
    };
  }
  const series = getSeriesAt(data.thirdPlace, 1);
  const firstSemifinal = getSeriesAt(data.semifinal, 1);
  const secondSemifinal = getSeriesAt(data.semifinal, 2);
  return {
    label: "Матч за 3 місце",
    third: true,
    series,
    first: series?.home_name ?? firstSemifinal?.loser_name ?? "Команда, що програє 1/2 №1",
    second: series?.away_name ?? secondSemifinal?.loser_name ?? "Команда, що програє 1/2 №2",
    waiting: "Після завершення півфіналів",
  };
}

/**
 * Text-only display adaptation: makes projected participants easier to read.
 * It never changes participant IDs, results or winner determination.
 */
function participantDisplay(name: string) {
  const projected = /^Переможець:\s*(.+?)\s+—\s+(.+)$/.exec(name);
  if (!projected) {
    return { title: name, detail: null };
  }

  return {
    title: "Переможець протистояння",
    detail: `${projected[1]} / ${projected[2]}`,
  };
}

function MatchCard({ card }: { card: CardData }) {
  const series = card.series;
  const firstWins = Boolean(series?.winner_id && series.winner_id === series.home_id);
  const secondWins = Boolean(series?.winner_id && series.winner_id === series.away_id);
  const status = series ? getStatusText(series) : card.waiting ?? "Очікує учасників";
  const tiebreak = series?.status === "needs-tiebreak" || series?.status === "tiebreak-pending" || series?.status === "tiebreak-draw";
  const finished = Boolean(series?.winner_name);
  const stateLabel = finished ? "ЗАВЕРШЕНО" : tiebreak ? "ТАЙ-БРЕЙК" : series ? "ТРИВАЄ" : "ОЧІКУЄ";
  const stateColor = finished
    ? "text-emerald-300 bg-emerald-400/10"
    : tiebreak || series
      ? "text-amber-300 bg-amber-400/10"
      : "text-slate-400 bg-white/[0.04]";
  const statusColor = finished ? "text-emerald-300" : tiebreak ? "text-amber-300" : "text-slate-400";

  const sides = [
    { name: card.first, winner: firstWins },
    { name: card.second, winner: secondWins },
  ];

  return (
    <article className={`grid h-[112px] min-w-0 grid-rows-[23px_32px_32px_25px] overflow-hidden rounded-xl border bg-[#07111f] shadow-[0_5px_20px_rgba(0,0,0,0.10)] ${card.third ? "border-yellow-400/25" : "border-white/[0.12]"}`}>
      {/* Compact header: round on the left, match state on the right. */}
      <div className="flex min-w-0 items-center justify-between gap-1.5 border-b border-white/[0.08] bg-white/[0.035] px-3">
        <span className={`min-w-0 truncate text-[10px] font-black uppercase tracking-[0.12em] ${card.third ? "text-yellow-300" : "text-blue-400"}`}>
          {card.label}
        </span>
        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-black tracking-[0.04em] ${stateColor}`}>
          {stateLabel}
        </span>
      </div>

      {/* Team rows: consistent spacing, readable previews, winner highlight. */}
      {sides.map(({ name, winner }, index) => {
        const display = participantDisplay(name);
        return (
          <div
            key={index}
            className={`flex min-w-0 items-center gap-2 px-3 ${index === 0 ? "border-b border-white/[0.06]" : ""} ${winner ? "bg-blue-500/[0.14]" : index === 1 ? "bg-black/[0.10]" : ""}`}
            title={name}
          >
            <span
              aria-hidden="true"
              className={`h-4 w-[3px] shrink-0 rounded-full ${winner ? "bg-emerald-300" : series ? "bg-blue-400/35" : "bg-white/15"}`}
            />
            <span className="min-w-0 flex-1">
              <span className={`block truncate leading-[15px] ${display.detail ? "text-[11px] font-bold sm:text-xs" : "text-[13px] font-bold sm:text-sm"} ${winner || series ? "text-white" : "text-slate-400"}`}>
                {display.title}
              </span>
              {display.detail && (
                <span className="block truncate text-[10px] leading-[12px] text-slate-500">
                  {display.detail}
                </span>
              )}
            </span>
            {winner && (
              <span aria-label="Переможець" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-[12px] font-black text-emerald-300">
                ✓
              </span>
            )}
          </div>
        );
      })}

      {/* Match status remains visible without consuming a full team row. */}
      <div className={`flex min-w-0 items-center gap-1.5 border-t border-white/[0.08] bg-black/[0.12] px-3 text-[10px] font-semibold ${statusColor}`} title={status}>
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${finished ? "bg-emerald-400" : tiebreak ? "bg-amber-400" : "bg-slate-500"}`} aria-hidden="true" />
        <span className="min-w-0 truncate">{status}</span>
      </div>
    </article>
  );
}

function RoundHeading({ title, count, total, third = false }: { title: string; count: number; total: number; third?: boolean }) {
  return (
    <div className="mb-3 flex h-[51px] min-w-0 items-center justify-between gap-2 border-b border-white/10">
      <h3 className={`text-xs font-black uppercase tracking-[0.13em] ${third ? "text-yellow-300" : "text-blue-400"}`}>{title}</h3>
      <span className="shrink-0 text-[11px] text-slate-400">{count}/{total} пар</span>
    </div>
  );
}

function AssociationBracketColumns({ data, mobile, showThird }: { data: StageData; mobile: boolean; showThird: boolean }) {
  const sectionClass = mobile ? "w-[278px] shrink-0 snap-start" : "min-w-0";
  const halfGapClass = mobile ? "12px" : "14px";
  const roundKinds = ["quarterfinal", "semifinal", "final"] as const;
  const rounds = roundKinds.map((kind) => ({
    kind,
    title: kind === "quarterfinal" ? "1/4 фіналу" : kind === "semifinal" ? "1/2 фіналу" : "Фінал",
    count: kind === "quarterfinal" ? 4 : kind === "semifinal" ? 2 : 1,
    actual: data[kind].length,
  }));
  return (
    <div className={mobile ? "flex w-max items-start gap-6" : "grid min-w-[960px] grid-cols-3 gap-7"}>
      {rounds.map(({ kind, title, count, actual }, roundIndex) => (
        <section key={kind} data-association-bracket-stage={kind} className={sectionClass}>
          <RoundHeading title={title} count={actual} total={count} />
          <div className="relative" style={{ height: TOTAL_HEIGHT }}>
            {Array.from({ length: count }, (_, index) => {
              const slot = index + 1;
              const top = topFor(kind, slot);
              return (
                <div key={slot} className="absolute inset-x-0" style={{ top, height: CARD_HEIGHT }}>
                  {roundIndex > 0 && (
                    <span aria-hidden="true" className="pointer-events-none absolute top-1/2 h-px bg-blue-400/45" style={{ left: `-${halfGapClass}`, width: halfGapClass }} />
                  )}
                  {roundIndex < 2 && (
                    <span aria-hidden="true" className="pointer-events-none absolute top-1/2 h-px bg-blue-400/45" style={{ right: `-${halfGapClass}`, width: halfGapClass }} />
                  )}
                  <MatchCard card={cardData(kind, slot, data)} />
                </div>
              );
            })}
            {roundIndex < 2 && Array.from({ length: count / 2 }, (_, index) => {
              const firstTop = topFor(kind, 2 * index + 1) + CARD_HEIGHT / 2;
              const secondTop = topFor(kind, 2 * index + 2) + CARD_HEIGHT / 2;
              return <span key={index} aria-hidden="true" className="pointer-events-none absolute w-px bg-blue-400/45" style={{ right: `-${halfGapClass}`, top: firstTop, height: secondTop - firstTop }} />;
            })}
            {kind === "final" && showThird && !mobile && (
              <div className="absolute inset-x-0" style={{ top: topFor("final", 1) + CARD_HEIGHT + 32, height: CARD_HEIGHT }}>
                <MatchCard card={cardData("thirdPlace", 1, data)} />
              </div>
            )}
          </div>
        </section>
      ))}
      {mobile && showThird && (
        <section data-association-bracket-stage="thirdPlace" className={sectionClass}>
          <RoundHeading title="3 місце" count={data.thirdPlace.length} total={1} third />
          <div className="relative" style={{ height: TOTAL_HEIGHT }}>
            <div className="absolute inset-x-0" style={{ top: topFor("final", 1), height: CARD_HEIGHT }}>
              <MatchCard card={cardData("thirdPlace", 1, data)} />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function AssociationBracketList({ data, showThird }: { data: StageData; showThird: boolean }) {
  const rounds: { kind: "quarterfinal" | "semifinal" | "final" | "thirdPlace"; title: string; total: number }[] = [
    { kind: "quarterfinal", title: "1/4 фіналу", total: 4 },
    { kind: "semifinal", title: "1/2 фіналу", total: 2 },
    { kind: "final", title: "Фінал", total: 1 },
    ...(showThird ? [{ kind: "thirdPlace" as const, title: "3 місце", total: 1 }] : []),
  ];
  return (
    <div className="space-y-6">
      {rounds.map((round) => (
        <section key={round.kind}>
          <RoundHeading title={round.title} count={data[round.kind].length} total={round.total} third={round.kind === "thirdPlace"} />
          <div className="space-y-3">
            {Array.from({ length: round.total }, (_, index) => <MatchCard key={index} card={cardData(round.kind, index + 1, data)} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function AssociationCupPlayoffBracket({
  season,
}: Props) {
  const [
    data,
    setData,
  ] =
    useState<StageData>({
      quarterfinal: [],
      semifinal: [],
      final: [],
      thirdPlace: [],
    });

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    let cancelled =
      false;

    async function loadStage(
      stage: string
    ) {
      const params =
        new URLSearchParams();

      params.set(
        "season",
        String(season)
      );

      params.set(
        "stage",
        stage
      );

      const response =
        await fetch(
          `/api/admin/association-playoff?${params.toString()}`,
          {
            cache:
              "no-store",
          }
        );

      const result =
        (await response.json()) as PlayoffResponse;

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Не вдалося завантажити сітку"
        );
      }

      return (
        result.series ??
        []
      );
    }

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [
          quarterfinal,
          semifinal,
          final,
          thirdPlace,
        ] =
          await Promise.all([
            loadStage(
              "quarterfinal"
            ),

            loadStage(
              "semifinal"
            ),

            loadStage(
              "final"
            ),

            loadStage(
              "third-place"
            ),
          ]);

        if (cancelled) {
          return;
        }

        setData({
          quarterfinal,

          semifinal,

          final,

          thirdPlace,
        });
      } catch (
        loadError
      ) {
        if (
          !cancelled
        ) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "Помилка завантаження сітки"
          );
        }
      } finally {
        if (
          !cancelled
        ) {
          setLoading(
            false
          );
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [season]);

  const hasAnySeries =
    useMemo(() => {
      return (
        data.quarterfinal
          .length > 0 ||
        data.semifinal
          .length > 0 ||
        data.final.length >
          0 ||
        data.thirdPlace
          .length > 0
      );
    }, [data]);

  const [mobileView, setMobileView] = useState<"bracket" | "list">("bracket");
  const [activeStage, setActiveStage] = useState("quarterfinal");
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const showThird = season === 2 || season === 3;
  const stageButtons = [
    { id: "quarterfinal", name: "1/4" },
    { id: "semifinal", name: "1/2" },
    { id: "final", name: "Фінал" },
    ...(showThird ? [{ id: "thirdPlace", name: "3 місце" }] : []),
  ];

  function goToStage(stageId: string) {
    const scroller = mobileScrollRef.current;
    const section = Array.from(
      scroller?.querySelectorAll<HTMLElement>("[data-association-bracket-stage]") ?? []
    ).find((item) => item.dataset.associationBracketStage === stageId);
    if (!scroller || !section) return;
    setActiveStage(stageId);
    const target = scroller.scrollLeft + section.getBoundingClientRect().left - scroller.getBoundingClientRect().left;
    scroller.scrollTo({ left: target, behavior: "smooth" });
  }

  function handleBracketScroll() {
    const scroller = mobileScrollRef.current;
    if (!scroller) return;
    const sections = scroller.querySelectorAll<HTMLElement>("[data-association-bracket-stage]");
    let nearest = "quarterfinal";
    let nearestDistance = Infinity;
    const box = scroller.getBoundingClientRect();
    const viewportCenter = box.left + box.width / 2;
    sections.forEach((section) => {
      const bounds = section.getBoundingClientRect();
      const distance = Math.abs((bounds.left + bounds.right) / 2 - viewportCenter);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = section.dataset.associationBracketStage ?? nearest;
      }
    });
    setActiveStage(nearest);
  }


  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 text-white/40">
        Завантаження
        турнірної сітки...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-6 text-red-200">
        {error}
      </div>
    );
  }

  if (!hasAnySeries) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
        <div className="font-bold text-blue-300">
          Сітка плей-оф буде
          доступна після
          жеребкування.
        </div>
      </div>
    );
  }


  return (
    <div className="min-w-0">
      {/* Desktop: compact connected rounds, with the third-place fixture under the final. */}
      <div className="hidden xl:block overflow-x-auto pb-3">
        <AssociationBracketColumns data={data} mobile={false} showThird={showThird} />
      </div>

      {/* Phone/tablet: the same horizontal bracket, or a vertical list. */}
      <div className="xl:hidden">
        <div className="mb-3 inline-flex rounded-xl border border-white/10 bg-[#030b17] p-1" role="group" aria-label="Режим перегляду Кубка асоціацій">
          <button
            type="button"
            aria-pressed={mobileView === "bracket"}
            onClick={() => { setMobileView("bracket"); setActiveStage("quarterfinal"); }}
            className={`min-h-10 rounded-lg px-4 text-xs font-bold transition-colors ${mobileView === "bracket" ? "bg-blue-600 text-white" : "text-white/55 hover:text-white"}`}
          >Сітка</button>
          <button
            type="button"
            aria-pressed={mobileView === "list"}
            onClick={() => setMobileView("list")}
            className={`min-h-10 rounded-lg px-4 text-xs font-bold transition-colors ${mobileView === "list" ? "bg-blue-600 text-white" : "text-white/55 hover:text-white"}`}
          >Список</button>
        </div>

        {mobileView === "bracket" ? (
          <>
            <div className={`mb-2 grid gap-1.5 ${showThird ? "grid-cols-4" : "grid-cols-3"}`} role="group" aria-label="Перехід між раундами Кубка асоціацій">
              {stageButtons.map((stage) => (
                <button
                  key={stage.id}
                  type="button"
                  aria-pressed={activeStage === stage.id}
                  onClick={() => goToStage(stage.id)}
                  className={`min-h-9 rounded-lg border px-1 text-[11px] font-bold transition-colors ${activeStage === stage.id ? "border-blue-400/60 bg-blue-500/20 text-blue-200" : "border-white/10 bg-white/[0.03] text-white/65"}`}
                >{stage.name}</button>
              ))}
            </div>
            <p className="mb-3 text-[11px] text-blue-200/65">↔ Гортай сітку вліво або обери потрібний раунд</p>
            <div ref={mobileScrollRef} onScroll={handleBracketScroll} className="min-w-0 snap-x snap-mandatory overflow-x-auto overscroll-x-contain pb-4">
              <AssociationBracketColumns data={data} mobile showThird={showThird} />
            </div>
          </>
        ) : (
          <AssociationBracketList data={data} showThird={showThird} />
        )}
      </div>
    </div>
  );
}
