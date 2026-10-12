
import StadiumBackground from "../../../components/StadiumBackground";
import SiteHeader from "../../../components/public/SiteHeader";
import { players } from "../../../data/players";
import { supabase } from "../../../lib/supabase";
import CoopCupPlayoffBracket from "../../../components/CoopCupPlayoffBracket";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SeasonNumber = 1 | 2 | 3 | 4;

type PageProps = {
  searchParams: Promise<{ season?: string }>;
};

type CoopTeam = {
  id: string;
  name: string;
  players: string[];
};

type DatabaseTeam = {
  id: string;
  name: string;
  player_1_id: string | null;
  player_2_id: string | null;
  created_at: string;
};

export default async function CoopCupPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const requestedSeason = Number(params.season);
  const season: SeasonNumber =
    requestedSeason >= 1 && requestedSeason <= 4
      ? (requestedSeason as SeasonNumber)
      : 3;

  // КОМАНДИ
  let teams: CoopTeam[] = [];
  let teamsLoadError = false;

  if (season === 3 || season === 4) {
    const { data, error } = await supabase
      .from("coop_teams")
      .select(`
        id,
        name,
        player_1_id,
        player_2_id,
        created_at
      `)
      .eq("season", season)
      .order("created_at", { ascending: true });

    if (error) {
      teamsLoadError = true;
      console.error("COOP TEAMS PUBLIC ERROR:", error);
    }

    const databaseTeams = (data ?? []) as DatabaseTeam[];

    teams = databaseTeams.map((team) => ({
      id: team.id,
      name: team.name,
      players: [team.player_1_id, team.player_2_id].filter(
        (playerId): playerId is string =>
          typeof playerId === "string" && playerId.length > 0
      ),
    }));
  }

  // ПЛЕЙ-ОФ ПОКАЗУЄМО ЛИШЕ ПІСЛЯ РЕАЛЬНОГО ЖЕРЕБКУВАННЯ
  let hasPlayoff = false;

  if (season === 3 || season === 4) {
    const { count, error } = await supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("season", season)
      .eq("competition", "iron-coop-cup")
      .not("series_id", "is", null);

    if (error) {
      console.error("COOP PLAYOFF PUBLIC ERROR:", error);
    } else {
      hasPlayoff = (count ?? 0) > 0;
    }
  }

  // СКЛАДИ
  const completeRosters = teams.filter(
    (team) => team.players.length === 2
  ).length;

  // СТАТУС СЕЗОНУ
  let seasonStatus = "Підготовка";

  if (season === 1 || season === 2) {
    seasonStatus = "Турнір не проводився";
  }

  if (season === 3) {
    if (hasPlayoff) {
      seasonStatus = "Плей-оф";
    } else if (teams.length === 16 && completeRosters === 16) {
      seasonStatus = "Готовий до жеребкування";
    } else if (teams.length === 16) {
      seasonStatus = "Формування складів";
    } else {
      seasonStatus = "Формування команд";
    }
  }

  if (season === 4) {
    seasonStatus = hasPlayoff ? "Плей-оф" : "Підготовка";
  }

  return (
    <main className="min-h-screen bg-[#030711] text-white">
      {/* HEADER */}
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/10">
        <StadiumBackground opacity="25" preload />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#030711] via-[#030711]/85 to-[#030711]/60" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#030711] via-transparent to-[#030711]/70" />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:py-14">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-blue-300 transition hover:text-blue-200 sm:text-sm"
          >
            <span aria-hidden="true">←</span>
            На головну
          </a>

          <div className="mt-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400 sm:text-xs">
              IRON LEAGUE · COOPERATIVE TOURNAMENT
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
              Iron Co-op Cup
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55 sm:text-base sm:leading-7">
              Командний турнір Iron League у форматі 2 на 2. Кожну команду
              представляють два гравці, а команди отримують назви
              футбольних клубів УПЛ.
            </p>
          </div>

          {/* SEASON SWITCHER */}
          <div className="mt-6 sm:mt-8">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-white/50">
              Обрати сезон
            </div>
            <nav
              aria-label="Вибір сезону"
              className="grid w-full max-w-lg grid-cols-4 gap-1 rounded-xl border border-white/10 bg-[#07101d] p-1"
            >
              {([1, 2, 3, 4] as const).map((seasonNumber) => (
                <a
                  key={seasonNumber}
                  href={`/tournaments/coop-cup?season=${seasonNumber}`}
                  aria-current={season === seasonNumber ? "page" : undefined}
                  className={`flex min-h-10 items-center justify-center rounded-lg px-1 py-2 text-center text-[11px] font-bold transition-colors sm:text-sm ${
                    season === seasonNumber
                      ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                      : "text-white/55 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  Сезон {seasonNumber}
                </a>
              ))}
            </nav>
          </div>

          {/* TOURNAMENT INFORMATION */}
          <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-6 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
            <div className="min-w-0 rounded-xl border border-white/10 bg-[#07101d]/90 px-3 py-3 backdrop-blur-sm sm:px-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/45 sm:text-xs">
                Сезон
              </div>
              <div className="mt-1 text-xl font-black text-blue-300 sm:text-2xl">
                {season}
              </div>
            </div>

            <div className="min-w-0 rounded-xl border border-white/10 bg-[#07101d]/90 px-3 py-3 backdrop-blur-sm sm:px-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/45 sm:text-xs">
                Формат
              </div>
              <div className="mt-1 text-xl font-black text-blue-300 sm:text-2xl">
                2 × 2
              </div>
            </div>

            <div className="min-w-0 rounded-xl border border-white/10 bg-[#07101d]/90 px-3 py-3 backdrop-blur-sm sm:px-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/45 sm:text-xs">
                Команд
              </div>
              <div className="mt-1 text-xl font-black text-white sm:text-2xl">
                {teams.length}
              </div>
            </div>

            {(season === 3 || season === 4) && teams.length > 0 && (
              <div className="min-w-0 rounded-xl border border-white/10 bg-[#07101d]/90 px-3 py-3 backdrop-blur-sm sm:px-4">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-white/45 sm:text-xs">
                  Складів
                </div>
                <div className="mt-1 text-xl font-black text-white sm:text-2xl">
                  {completeRosters}/16
                </div>
              </div>
            )}

            <div className="min-w-0 rounded-xl border border-white/10 bg-[#07101d]/90 px-3 py-3 backdrop-blur-sm sm:px-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/45 sm:text-xs">
                Статус
              </div>
              <div className="mt-1 break-words text-sm font-black leading-6 text-blue-300 sm:text-base">
                {seasonStatus}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TEAMS */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="mb-6 sm:mb-10">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Учасники
          </div>
          <h2 className="mt-3 text-3xl font-black">Команди</h2>

          {(season === 3 || season === 4) && teams.length > 0 && (
            <p className="mt-3 max-w-2xl leading-7 text-white/40">
              Клуби вже визначені. Склади команд будуть доповнюватися після
              призначення учасників.
            </p>
          )}
        </div>

        {season === 1 || season === 2 ? (
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] px-4 py-10 text-center sm:px-8 sm:py-16">
            <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.03] blur-[80px]" />
            <div className="relative">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-3xl font-black text-white/25">
                —
              </div>
              <h3 className="mt-6 text-2xl font-black sm:text-3xl">
                Iron Co-op Cup ще не проводився
              </h3>
              <p className="mx-auto mt-4 max-w-xl leading-7 text-white/40">
                У Сезонах 1 та 2 цього турніру ще не існувало. Iron Co-op Cup
                вперше з&apos;явився у Сезоні 3 Iron League.
              </p>
              <a
                href="/tournaments/coop-cup?season=3"
                className="mt-8 inline-block rounded-xl bg-blue-500 px-6 py-3 font-bold transition hover:bg-blue-400"
              >
                Перейти до першого розіграшу →
              </a>
            </div>
          </div>
        ) : teamsLoadError ? (
          <div className="rounded-3xl border border-red-400/20 bg-red-500/10 px-4 py-10 text-center text-red-200 sm:px-8 sm:py-12">
            Не вдалося завантажити команди Iron Co-op Cup.
          </div>
        ) : teams.length === 0 ? (
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] px-4 py-10 text-center sm:px-8 sm:py-16">
            <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-[80px]" />
            <div className="relative">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-2xl font-black text-blue-300">
                2×2
              </div>
              <h3 className="mt-6 text-2xl font-black sm:text-3xl">
                Команди ще не сформовано
              </h3>
              <p className="mx-auto mt-4 max-w-xl leading-7 text-white/45">
                {season === 3
                  ? "Команди першого розіграшу Iron Co-op Cup будуть додані після затвердження складу турніру."
                  : "Команди Iron Co-op Cup Сезону 4 будуть додані після формування нового сезону."}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
            {teams.map((team, teamIndex) => {
              const teamPlayers = team.players
                .map((playerId) =>
                  players.find((player) => player.id === playerId)
                )
                .filter(
                  (player): player is (typeof players)[number] =>
                    player !== undefined
                );

              const missingPlayers = Math.max(0, 2 - teamPlayers.length);

              return (
                <div
                  key={team.id}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-[#07101d] sm:rounded-3xl"
                >
                  {/* TEAM HEADER */}
                  <div className="border-b border-white/10 bg-gradient-to-r from-blue-500/15 to-transparent px-4 py-4 sm:px-6 sm:py-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-400 sm:text-xs sm:tracking-[0.25em]">
                          Iron Co-op Cup
                        </div>
                        <h3 className="mt-1 break-words text-xl font-black sm:mt-2 sm:text-2xl">
                          {team.name}
                        </h3>
                      </div>
                      <div className="shrink-0 text-xs font-black text-white/30">
                        {String(teamIndex + 1).padStart(2, "0")}
                      </div>
                    </div>
                  </div>

                  {/* TEAM PLAYERS */}
                  <div>
                    {teamPlayers.map((player, index) => (
                      <a
                        key={player.id}
                        href={`/players/${player.id}`}
                        className="flex min-w-0 items-center gap-3 border-b border-white/5 px-4 py-3 transition hover:bg-white/[0.04] sm:gap-4 sm:px-6 sm:py-5"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 font-black text-blue-300 sm:h-9 sm:w-9">
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-bold text-white">
                            {player.nickname}
                          </div>
                          {player.account && (
                            <div className="mt-0.5 truncate text-xs text-white/40 sm:mt-1">
                              ({player.account})
                            </div>
                          )}
                        </div>
                      </a>
                    ))}

                    {/* EMPTY PLAYER SLOTS */}
                    {Array.from({ length: missingPlayers }, (_, index) => (
                      <div
                        key={`empty-${index}`}
                        className="flex min-w-0 items-center gap-3 border-b border-white/5 px-4 py-3 last:border-b-0 sm:gap-4 sm:px-6 sm:py-5"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 font-black text-white/40 sm:h-9 sm:w-9">
                          {teamPlayers.length + index + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-white/65">
                            Ще не визначено
                          </div>
                          <div className="mt-0.5 text-xs text-white/40 sm:mt-1">
                            Учасник команди
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {teamPlayers.length === 0 && (
                    <div className="border-t border-blue-400/10 bg-blue-500/[0.04] px-4 py-2 text-xs font-bold text-blue-300/75 sm:px-6 sm:py-3">
                      Склад команди ще не визначено
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* PLAYOFF */}
      {hasPlayoff && (
        <section className="border-t border-white/10 bg-white/[0.015]">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
              Плей-оф
            </div>
            <h2 className="mt-3 text-3xl font-black">Турнірна сітка</h2>
            <p className="mt-4 max-w-2xl leading-7 text-white/40">
              Кожне протистояння складається з двох матчів. Переможці
              переходять у наступну стадію відповідно до турнірної сітки.
            </p>
            <div className="mt-8">
              <CoopCupPlayoffBracket season={season} teams={teams} />
            </div>
          </div>
        </section>
      )}


      {/* TOURNAMENT HISTORY */}
      <section className="border-t border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Історія турніру
          </div>

          <h2 className="mt-2 text-2xl font-black sm:mt-3 sm:text-3xl">
            Iron Co-op Cup
          </h2>

          <div className="mt-6 grid grid-cols-2 gap-2 sm:mt-8 sm:gap-5 lg:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-[#07101d] p-3 sm:rounded-2xl sm:p-6">
              <div className="text-xs font-bold text-white/40 sm:text-sm">
                Сезон 1
              </div>

              <div className="mt-2 text-sm font-black leading-5 text-white/50 sm:mt-4 sm:text-lg">
                Не проводився
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#07101d] p-3 sm:rounded-2xl sm:p-6">
              <div className="text-xs font-bold text-white/40 sm:text-sm">
                Сезон 2
              </div>

              <div className="mt-2 text-sm font-black leading-5 text-white/50 sm:mt-4 sm:text-lg">
                Не проводився
              </div>
            </div>

            <div className="rounded-xl border border-blue-400/20 bg-blue-500/[0.07] p-3 sm:rounded-2xl sm:p-6">
              <div className="text-xs font-bold text-blue-300 sm:text-sm">
                Сезон 3
              </div>

              <div className="mt-2 text-sm font-black leading-5 text-white sm:mt-4 sm:text-lg">
                Перший розіграш
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#07101d] p-3 sm:rounded-2xl sm:p-6">
              <div className="text-xs font-bold text-white/40 sm:text-sm">
                Сезон 4
              </div>

              <div className="mt-2 text-sm font-black leading-5 text-white/60 sm:mt-4 sm:text-lg">
                Підготовка
              </div>
            </div>
          </div>
        </div>
      </section>




      {/* FORMAT */}
      <section className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Формат
          </div>

          <h2 className="mt-2 text-2xl font-black sm:mt-3 sm:text-3xl">
            Формат Iron Co-op Cup
          </h2>

          <div className="mt-6 grid gap-3 sm:mt-8 sm:gap-5 md:grid-cols-3">
            {/* CLUB */}
            <div className="rounded-xl border border-white/10 bg-[#07101d] p-4 sm:rounded-2xl sm:p-6">
              <div className="text-3xl font-black text-blue-400 sm:text-4xl">
                01
              </div>

              <h3 className="mt-2 text-lg font-black sm:mt-5 sm:text-xl">
                Клуб УПЛ
              </h3>

              <p className="mt-2 text-sm leading-6 text-white/50 sm:mt-3">
                Кожна команда отримує назву футбольного клубу
                Української Прем&apos;єр-ліги.
              </p>
            </div>

            {/* PLAYERS */}
            <div className="rounded-xl border border-white/10 bg-[#07101d] p-4 sm:rounded-2xl sm:p-6">
              <div className="text-3xl font-black text-blue-400 sm:text-4xl">
                02
              </div>

              <h3 className="mt-2 text-lg font-black sm:mt-5 sm:text-xl">
                Два гравці
              </h3>

              <p className="mt-2 text-sm leading-6 text-white/50 sm:mt-3">
                Кожну команду представляють два учасники
                Iron League.
              </p>
            </div>

            {/* FORMAT 2 VS 2 */}
            <div className="rounded-xl border border-white/10 bg-[#07101d] p-4 sm:rounded-2xl sm:p-6">
              <div className="text-3xl font-black text-blue-400 sm:text-4xl">
                03
              </div>

              <h3 className="mt-2 text-lg font-black sm:mt-5 sm:text-xl">
                2 × 2
              </h3>

              <p className="mt-2 text-sm leading-6 text-white/50 sm:mt-3">
                Матчі проводяться у кооперативному форматі
                двоє проти двох.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
