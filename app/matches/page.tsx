import { players } from "../../data/players";
import { supabase } from "../../lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SeasonNumber = 1 | 2 | 3 | 4;

type PageProps = {
  searchParams: Promise<{
    season?: string;
  }>;
};

type Match = {
  id: string;

  season: number;
  competition: string;

  division: number | null;

  stage: string | null;
  group_name: string | null;

  round: number | null;
  leg: number | null;

  participant_type: string;

  home_id: string;
  away_id: string;

  home_goals: number | null;
  away_goals: number | null;

  status: string;

  played_at: string | null;
};

type CoopTeam = {
  id: string;
  name: string;
};

function getPlayerName(
  playerId: string
) {
  return (
    players.find(
      (player) =>
        player.id === playerId
    )?.nickname ?? playerId
  );
}

function getTournamentName(
  match: Match
) {
  if (
    match.competition === "division" &&
    match.division
  ) {
    return `${match.division} Дивізіон`;
  }

  if (
    match.competition ===
    "champions-league"
  ) {
    return "Ліга чемпіонів";
  }

  if (
    match.competition ===
    "europa-league"
  ) {
    return "Ліга Європи";
  }

  if (
    match.competition ===
    "conference-league"
  ) {
    return "Ліга конференцій";
  }

  if (
    match.competition ===
    "european-super-cup"
  ) {
    return "Суперкубок Європи";
  }

  if (
    match.competition ===
    "associations-cup"
  ) {
    return "Кубок асоціацій";
  }

  if (
    match.competition ===
    "iron-coop-cup"
  ) {
    return "Iron Co-op Cup";
  }

  const divisionCup =
    match.competition.match(
      /^division-(\d)-cup$/
    );

  if (divisionCup) {
    return `Кубок ${divisionCup[1]} Дивізіону`;
  }

  return match.competition;
}

function getStageName(
  stage: string | null
) {
  if (!stage) {
    return null;
  }

  if (stage === "group") {
    return "Груповий етап";
  }

  if (
    stage ===
    "round-of-16"
  ) {
    return "1/8 фіналу";
  }

  if (
    stage ===
    "quarterfinal"
  ) {
    return "1/4 фіналу";
  }

  if (
    stage ===
    "semifinal"
  ) {
    return "1/2 фіналу";
  }

  if (stage === "final") {
    return "Фінал";
  }

  if (
    stage === "third-place"
  ) {
    return "Матч за 3 місце";
  }

  return stage;
}

function getStatusName(
  status: string
) {
  if (status === "finished") {
    return "Завершено";
  }

  if (status === "scheduled") {
    return "Заплановано";
  }

  return status;
}

export default async function MatchesPage({
  searchParams,
}: PageProps) {
  const params =
    await searchParams;

  const requestedSeason =
    Number(params.season);

  const season: SeasonNumber =
    requestedSeason >= 1 &&
    requestedSeason <= 4
      ? (requestedSeason as SeasonNumber)
      : 3;

  const [
    matchesResult,
    coopTeamsResult,
  ] = await Promise.all([
    supabase
      .from("matches")
      .select(
        `
          id,
          season,
          competition,
          division,
          stage,
          group_name,
          round,
          leg,
          participant_type,
          home_id,
          away_id,
          home_goals,
          away_goals,
          status,
          played_at
        `
      )
      .eq("season", season)
      .order(
        "competition",
        {
          ascending: true,
        }
      )
      .order(
        "round",
        {
          ascending: true,
          nullsFirst: true,
        }
      ),

    supabase
      .from("coop_teams")
      .select(
        `
          id,
          name
        `
      )
      .eq("season", season),
  ]);

  if (matchesResult.error) {
    console.error(
      "MATCHES PAGE ERROR:",
      matchesResult.error
    );
  }

  if (coopTeamsResult.error) {
    console.error(
      "MATCHES COOP TEAMS ERROR:",
      coopTeamsResult.error
    );
  }

  const matches =
    (matchesResult.data ??
      []) as Match[];

  const coopTeams =
    (coopTeamsResult.data ??
      []) as CoopTeam[];

  function getParticipantName(
    id: string,
    type: string
  ) {
    if (type === "team") {
      return (
        coopTeams.find(
          (team) =>
            team.id === id ||
            team.name === id
        )?.name ?? id
      );
    }

    return getPlayerName(id);
  }

  return (
    <main className="min-h-screen bg-[#030711] text-white">
      {/* HEADER */}

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#030711]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a
            href="/"
            className="flex items-center gap-4"
          >
            <img
              src="/iron-league-logo.jpg"
              alt="Iron League"
              className="h-14 w-auto object-contain"
            />

            <div>
              <div className="font-black tracking-[0.18em]">
                IRON LEAGUE
              </div>

              <div className="text-xs text-white/35">
                Матч-центр
              </div>
            </div>
          </a>

          <a
            href="/"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white/60 transition hover:bg-white/[0.05] hover:text-white"
          >
            ← Головна
          </a>
        </div>
      </header>

      {/* HERO */}

      <section className="border-b border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Iron League
          </div>

          <h1 className="mt-3 text-5xl font-black">
            Матчі
          </h1>

          <p className="mt-4 max-w-2xl leading-7 text-white/40">
            Календар, результати та
            матчі всіх турнірів Iron
            League.
          </p>

          {/* SEASONS */}

          <div className="mt-8 flex flex-wrap gap-3">
            {[1, 2, 3, 4].map(
              (item) => (
                <a
                  key={item}
                  href={`/matches?season=${item}`}
                  className={`rounded-xl border px-5 py-2.5 text-sm font-black transition ${
                    season === item
                      ? "border-blue-400/40 bg-blue-500/15 text-blue-300"
                      : "border-white/10 bg-white/[0.03] text-white/45 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  Сезон {item}
                </a>
              )
            )}
          </div>
        </div>
      </section>

      {/* MATCHES */}

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
              Матч-центр
            </div>

            <h2 className="mt-3 text-3xl font-black">
              Сезон {season}
            </h2>
          </div>

          <div className="text-sm text-white/35">
            Матчів:{" "}
            <span className="font-black text-white">
              {matches.length}
            </span>
          </div>
        </div>

        {matches.length === 0 ? (
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] px-8 py-16 text-center">
            <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-[90px]" />

            <div className="relative">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-2xl font-black text-blue-300">
                VS
              </div>

              <h3 className="mt-6 text-2xl font-black">
                Матчів поки немає
              </h3>

              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-white/40">
                Після створення матчів
                цього сезону вони
                автоматично з&apos;являться
                у Матч-центрі.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {matches.map(
              (match) => {
                const finished =
                  match.status ===
                    "finished" &&
                  match.home_goals !==
                    null &&
                  match.away_goals !==
                    null;

                const stageName =
                  getStageName(
                    match.stage
                  );

                return (
                  <article
                    key={match.id}
                    className="rounded-2xl border border-white/10 bg-[#07101d] p-5 transition hover:border-blue-400/25"
                  >
                    <div className="grid items-center gap-5 lg:grid-cols-[190px_1fr_auto_1fr_160px]">
                      {/* TOURNAMENT */}

                      <div>
                        <div className="text-sm font-black text-blue-300">
                          {getTournamentName(
                            match
                          )}
                        </div>

                        <div className="mt-1 text-xs text-white/30">
                          {stageName}

                          {match.group_name
                            ? ` • Група ${match.group_name}`
                            : ""}

                          {match.round
                            ? ` • №${match.round}`
                            : ""}

                          {match.leg
                            ? ` • Матч ${match.leg}`
                            : ""}
                        </div>
                      </div>

                      {/* HOME */}

                      <div className="text-right text-lg font-black">
                        {getParticipantName(
                          match.home_id,
                          match.participant_type
                        )}
                      </div>

                      {/* SCORE */}

                      <div className="min-w-[90px] text-center">
                        {finished ? (
                          <div className="rounded-xl bg-blue-500/15 px-4 py-2 text-2xl font-black text-blue-300">
                            {
                              match.home_goals
                            }
                            {" : "}
                            {
                              match.away_goals
                            }
                          </div>
                        ) : (
                          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xl font-black text-white/35">
                            VS
                          </div>
                        )}
                      </div>

                      {/* AWAY */}

                      <div className="text-lg font-black">
                        {getParticipantName(
                          match.away_id,
                          match.participant_type
                        )}
                      </div>

                      {/* STATUS */}

                      <div className="text-right">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                            finished
                              ? "border-green-400/20 bg-green-500/10 text-green-300"
                              : "border-blue-400/20 bg-blue-500/10 text-blue-300"
                          }`}
                        >
                          {getStatusName(
                            match.status
                          )}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>

      {/* FOOTER */}

      <footer className="border-t border-white/10 bg-[#02050b]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-10">
          <div>
            <div className="font-black tracking-[0.16em]">
              IRON LEAGUE
            </div>

            <div className="mt-1 text-xs text-white/30">
              Більше ніж гра
            </div>
          </div>

          <div className="text-sm text-white/30">
            © 2026 Iron League
          </div>
        </div>
      </footer>
    </main>
  );
}