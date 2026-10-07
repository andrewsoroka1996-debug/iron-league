import { players } from "../data/players";

type SeasonNumber = 1 | 2 | 3 | 4;
type DivisionNumber = 1 | 2 | 3 | 4;

type SavedMatch = {
  id: string;
  round: number | null;
  home_id: string;
  away_id: string;
  home_goals: number | null;
  away_goals: number | null;
  status: string;
};

type DivisionScheduleProps = {
  season: SeasonNumber;
  division: DivisionNumber;
  results: SavedMatch[];
};

export default function DivisionSchedule({
  season,
  division,
  results,
}: DivisionScheduleProps) {
  function getNickname(playerId: string) {
    return (
      players.find(
        (player) => player.id === playerId
      )?.nickname ?? playerId
    );
  }

  const matchesWithRound = results
    .filter(
      (match) =>
        match.round !== null &&
        (
          match.status === "scheduled" ||
          match.status === "finished"
        )
    )
    .sort((a, b) => {
      if ((a.round ?? 0) !== (b.round ?? 0)) {
        return (a.round ?? 0) - (b.round ?? 0);
      }

      return a.home_id.localeCompare(
        b.home_id
      );
    });

  const roundNumbers = Array.from(
    new Set(
      matchesWithRound.map(
        (match) => match.round as number
      )
    )
  ).sort((a, b) => a - b);

  if (matchesWithRound.length === 0) {
    return (
      <section className="border-t border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Матчі
          </div>

          <h2 className="mt-3 text-3xl font-black">
            Календар і результати
          </h2>

          <div className="mt-8 rounded-3xl border border-white/10 bg-[#07101d] px-8 py-14 text-center">
            <h3 className="text-2xl font-black">
              Календар ще не сформовано
            </h3>

            <p className="mx-auto mt-4 max-w-xl leading-7 text-white/40">
              Матчі {division} Дивізіону Сезону{" "}
              {season} з&apos;являться тут після
              створення календаря.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="border-t border-white/10 bg-white/[0.02]">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Матчі
          </div>

          <h2 className="mt-3 text-3xl font-black">
            Календар і результати
          </h2>
        </div>

        <div className="space-y-8">
          {roundNumbers.map((roundNumber) => {
            const roundMatches =
              matchesWithRound.filter(
                (match) =>
                  match.round === roundNumber
              );

            return (
              <div
                key={roundNumber}
                className="overflow-hidden rounded-3xl border border-white/10 bg-[#07101d]"
              >
                <div className="border-b border-white/10 bg-gradient-to-r from-blue-500/15 to-transparent px-6 py-5">
                  <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
                    Чемпіонат
                  </div>

                  <h3 className="mt-1 text-2xl font-black">
                    Тур {roundNumber}
                  </h3>
                </div>

                <div>
                  {roundMatches.map((match) => {
                    const finished =
                      match.status ===
                        "finished" &&
                      match.home_goals !==
                        null &&
                      match.away_goals !==
                        null;

                    return (
                      <div
                        key={match.id}
                        className="grid items-center gap-4 border-b border-white/5 px-6 py-5 last:border-b-0 md:grid-cols-[1fr_auto_1fr]"
                      >
                        <a
                          href={`/players/${match.home_id}?season=${season}`}
                          className="text-center font-bold transition hover:text-blue-300 md:text-right"
                        >
                          {getNickname(
                            match.home_id
                          )}
                        </a>

                        <div className="text-center">
                          {finished ? (
                            <div>
                              <div className="inline-flex min-w-24 justify-center rounded-xl bg-blue-500/15 px-5 py-2 text-xl font-black text-blue-300">
                                {
                                  match.home_goals
                                }
                                {" : "}
                                {
                                  match.away_goals
                                }
                              </div>

                              <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-green-400/70">
                                Завершено
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="inline-flex min-w-24 justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2 text-sm font-bold text-white/35">
                                VS
                              </div>

                              <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/20">
                                Не зіграно
                              </div>
                            </div>
                          )}
                        </div>

                        <a
                          href={`/players/${match.away_id}?season=${season}`}
                          className="text-center font-bold transition hover:text-blue-300 md:text-left"
                        >
                          {getNickname(
                            match.away_id
                          )}
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}