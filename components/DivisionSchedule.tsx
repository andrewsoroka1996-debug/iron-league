import { players } from "../data/players";
import { divisionSchedule } from "../data/division-schedule";

type SeasonNumber = 1 | 2 | 3 | 4;
type DivisionNumber = 1 | 2 | 3 | 4;

type DivisionScheduleProps = {
  season: SeasonNumber;
  division: DivisionNumber;
};

export default function DivisionSchedule({
  season,
  division,
}: DivisionScheduleProps) {
  const rounds = divisionSchedule[season][division];

  function getPlayer(playerId: string) {
    return players.find((player) => player.id === playerId);
  }

  if (rounds.length === 0) {
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

            <p className="mx-auto mt-4 max-w-xl text-white/40">
              Матчі {division} Дивізіону Сезону {season} з&apos;являться
              тут після формування календаря.
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
          {rounds.map((round) => (
            <div
              key={round.round}
              className="overflow-hidden rounded-3xl border border-white/10 bg-[#07101d]"
            >
              <div className="border-b border-white/10 bg-gradient-to-r from-blue-500/15 to-transparent px-6 py-5">
                <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
                  Чемпіонат
                </div>

                <h3 className="mt-1 text-2xl font-black">
                  Тур {round.round}
                </h3>
              </div>

              <div>
                {round.matches.map((match) => {
                  const home = getPlayer(match.home);
                  const away = getPlayer(match.away);

                  const finished =
                    match.homeGoals !== null &&
                    match.awayGoals !== null;

                  return (
                    <div
                      key={match.id}
                      className="grid items-center gap-4 border-b border-white/5 px-6 py-5 last:border-b-0 md:grid-cols-[1fr_auto_1fr]"
                    >
                      <a
                        href={`/players/${match.home}?season=${season}`}
                        className="text-center font-bold transition hover:text-blue-300 md:text-right"
                      >
                        {home?.nickname ?? match.home}
                      </a>

                      <div className="text-center">
                        {finished ? (
                          <div className="inline-flex min-w-24 justify-center rounded-xl bg-blue-500/15 px-5 py-2 text-xl font-black text-blue-300">
                            {match.homeGoals} : {match.awayGoals}
                          </div>
                        ) : (
                          <div className="inline-flex min-w-24 justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2 text-sm font-bold text-white/35">
                            VS
                          </div>
                        )}
                      </div>

                      <a
                        href={`/players/${match.away}?season=${season}`}
                        className="text-center font-bold transition hover:text-blue-300 md:text-left"
                      >
                        {away?.nickname ?? match.away}
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}