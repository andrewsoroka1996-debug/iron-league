"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type SeasonNumber = 2 | 3;

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

function SeriesCard({
  series,
  label,
}: {
  series?: Series;

  label: string;
}) {
  if (!series) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.015] p-4">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/25">
          {label}
        </div>

        <div className="mt-4 text-sm text-white/25">
          Ще не визначено
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#030711]">
      <div className="border-b border-white/5 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
        {label}
      </div>

      <div
        className={`border-b border-white/5 px-4 py-4 ${
          series.winner_id ===
          series.home_id
            ? "bg-blue-500/10"
            : ""
        }`}
      >
        <div className="font-black">
          {series.home_name}
        </div>
      </div>

      <div
        className={`px-4 py-4 ${
          series.winner_id ===
          series.away_id
            ? "bg-blue-500/10"
            : ""
        }`}
      >
        <div className="font-black">
          {series.away_name}
        </div>
      </div>

      <div
        className={`border-t border-white/5 px-4 py-3 text-xs font-bold ${
          series.complete
            ? "text-green-300"
            : series.status ===
                  "needs-tiebreak" ||
                series.status ===
                  "tiebreak-pending"
              ? "text-yellow-300"
              : "text-white/35"
        }`}
      >
        {getStatusText(
          series
        )}
      </div>
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

            season === 2
              ? loadStage(
                  "third-place"
                )
              : Promise.resolve(
                  []
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

  function findSeries(
    series:
      Series[],
    slot: number
  ) {
    return series.find(
      (item) =>
        item.bracket_slot ===
        slot
    );
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
    <div className="overflow-x-auto pb-3">
      <div className="grid min-w-[950px] grid-cols-3 gap-6">
        {/* QUARTERFINAL */}

        <div>
          <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-center font-black text-blue-300">
            1/4 фіналу
          </div>

          <div className="space-y-4">
            {[
              1,
              2,
              3,
              4,
            ].map(
              (slot) => (
                <SeriesCard
                  key={
                    slot
                  }
                  label={`Пара №${slot}`}
                  series={findSeries(
                    data.quarterfinal,
                    slot
                  )}
                />
              )
            )}
          </div>
        </div>

        {/* SEMIFINAL */}

        <div>
          <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-center font-black text-blue-300">
            1/2 фіналу
          </div>

          <div className="space-y-8 pt-16">
            {[
              1,
              2,
            ].map(
              (slot) => {
                const series =
                  findSeries(
                    data.semifinal,
                    slot
                  );

                if (series) {
                  return (
                    <SeriesCard
                      key={
                        slot
                      }
                      label={`Пара №${slot}`}
                      series={
                        series
                      }
                    />
                  );
                }

                const sourceA =
                  slot *
                    2 -
                  1;

                const sourceB =
                  slot * 2;

                const qfA =
                  findSeries(
                    data.quarterfinal,
                    sourceA
                  );

                const qfB =
                  findSeries(
                    data.quarterfinal,
                    sourceB
                  );

                return (
                  <div
                    key={
                      slot
                    }
                    className="overflow-hidden rounded-2xl border border-dashed border-white/10 bg-white/[0.015]"
                  >
                    <div className="border-b border-white/5 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/25">
                      Пара №
                      {slot}
                    </div>

                    <div className="border-b border-white/5 px-4 py-4 text-sm font-bold text-white/45">
                      {qfA?.winner_name ??
                        (qfA
                          ? `Переможець: ${qfA.home_name} — ${qfA.away_name}`
                          : `Переможець 1/4 №${sourceA}`)}
                    </div>

                    <div className="px-4 py-4 text-sm font-bold text-white/45">
                      {qfB?.winner_name ??
                        (qfB
                          ? `Переможець: ${qfB.home_name} — ${qfB.away_name}`
                          : `Переможець 1/4 №${sourceB}`)}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* FINAL */}

        <div>
          <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-center font-black text-blue-300">
            Фінал
          </div>

          <div className="pt-40">
            {findSeries(
              data.final,
              1
            ) ? (
              <SeriesCard
                label="Фінал"
                series={findSeries(
                  data.final,
                  1
                )}
              />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-dashed border-white/10 bg-white/[0.015]">
                <div className="border-b border-white/5 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/25">
                  Фінал
                </div>

                <div className="border-b border-white/5 px-4 py-4 text-sm font-bold text-white/45">
                  {findSeries(
                    data.semifinal,
                    1
                  )
                    ?.winner_name ??
                    "Переможець 1/2 №1"}
                </div>

                <div className="px-4 py-4 text-sm font-bold text-white/45">
                  {findSeries(
                    data.semifinal,
                    2
                  )
                    ?.winner_name ??
                    "Переможець 1/2 №2"}
                </div>
              </div>
            )}

            {/* THIRD PLACE */}

            {season ===
              2 && (
              <div className="mt-8">
                <div className="mb-3 text-center text-xs font-bold uppercase tracking-[0.2em] text-yellow-300">
                  Матч за 3
                  місце
                </div>

                {findSeries(
                  data.thirdPlace,
                  1
                ) ? (
                  <SeriesCard
                    label="3 місце"
                    series={findSeries(
                      data.thirdPlace,
                      1
                    )}
                  />
                ) : (
                  <div className="rounded-2xl border border-dashed border-yellow-400/15 bg-yellow-500/[0.04] p-5 text-center text-sm text-yellow-100/50">
                    Учасники
                    визначаться
                    після
                    півфіналів
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}