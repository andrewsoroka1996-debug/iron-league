import { players } from "../../../data/players";
import { season3 } from "../../../data/seasons/season-3";
import { season4 } from "../../../data/seasons/season-4";

type SeasonNumber = 1 | 2 | 3 | 4;

type PageProps = {
  searchParams: Promise<{
    season?: string;
  }>;
};

type CoopTeam = {
  id: string;
  name: string;
  players: string[];
};

export default async function CoopCupPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;

  const requestedSeason = Number(params.season);

  const season: SeasonNumber =
    requestedSeason >= 1 && requestedSeason <= 4
      ? (requestedSeason as SeasonNumber)
      : 3;

  const seasonData =
    season === 3
      ? season3
      : season === 4
        ? season4
        : null;

  const teams = seasonData
    ? (seasonData.ironCoopCup.teams as CoopTeam[])
    : [];

  const seasonStatus =
    season === 1 || season === 2
      ? "Турнір не проводився"
      : season === 3
        ? "Перший розіграш"
        : "Підготовка";

  return (
    <main className="min-h-screen bg-[#030711] text-white">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#030711]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-4">
            <img
              src="/iron-league-logo.jpg"
              alt="Iron League"
              className="h-14 w-auto object-contain"
            />

            <div>
              <div className="font-black tracking-[0.18em]">
                IRON LEAGUE
              </div>

              <div className="text-xs text-white/40">
                Iron Co-op Cup
              </div>
            </div>
          </a>

          <a
            href="/"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-blue-300 transition hover:border-blue-400/30 hover:bg-blue-500/10"
          >
            ← На головну
          </a>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25"
          style={{
            backgroundImage: "url('/stadium-bg.jpg')",
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#030711] via-[#030711]/85 to-[#030711]/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#030711] via-transparent to-[#030711]/70" />

        <div className="relative mx-auto max-w-7xl px-6 py-20">
          <div className="text-xs font-bold uppercase tracking-[0.28em] text-blue-400">
            Iron League
          </div>

          <h1 className="mt-4 text-5xl font-black sm:text-6xl">
            Iron Co-op Cup
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/55">
            Командний турнір Iron League у форматі 2 на 2.
            Кожну команду представляють два гравці, а команди
            отримують назви футбольних клубів УПЛ.
          </p>

          {/* SEASON SWITCHER */}
          <div className="mt-8">
            <div className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/35">
              Обрати сезон
            </div>

            <div className="inline-flex flex-wrap rounded-xl border border-white/10 bg-[#07101d] p-1">
              {([1, 2, 3, 4] as const).map((seasonNumber) => (
                <a
                  key={seasonNumber}
                  href={`/tournaments/coop-cup?season=${seasonNumber}`}
                  className={`rounded-lg px-5 py-2.5 text-sm font-bold transition ${
                    season === seasonNumber
                      ? "bg-blue-500 text-white"
                      : "text-white/45 hover:text-white"
                  }`}
                >
                  Сезон {seasonNumber}
                </a>
              ))}
            </div>
          </div>

          {/* INFO */}
          <div className="mt-8 flex flex-wrap gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3">
              <span className="text-sm text-white/40">
                Сезон
              </span>

              <span className="ml-2 font-black text-blue-300">
                {season}
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3">
              <span className="text-sm text-white/40">
                Формат
              </span>

              <span className="ml-2 font-black text-blue-300">
                2 × 2
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3">
              <span className="text-sm text-white/40">
                Команд
              </span>

              <span className="ml-2 font-black">
                {teams.length}
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3">
              <span className="text-sm text-white/40">
                Статус
              </span>

              <span className="ml-2 font-black text-blue-300">
                {seasonStatus}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* TEAMS */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Учасники
          </div>

          <h2 className="mt-3 text-3xl font-black">
            Команди
          </h2>
        </div>

        {/* SEASONS 1-2 */}
        {season === 1 || season === 2 ? (
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] px-8 py-16 text-center">
            <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.03] blur-[80px]" />

            <div className="relative">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-3xl font-black text-white/25">
                —
              </div>

              <h3 className="mt-6 text-3xl font-black">
                Iron Co-op Cup ще не проводився
              </h3>

              <p className="mx-auto mt-4 max-w-xl leading-7 text-white/40">
                У Сезонах 1 та 2 цього турніру ще не існувало.
                Iron Co-op Cup вперше з&apos;явився у Сезоні 3
                Iron League.
              </p>

              <a
                href="/tournaments/coop-cup?season=3"
                className="mt-8 inline-block rounded-xl bg-blue-500 px-6 py-3 font-bold transition hover:bg-blue-400"
              >
                Перейти до першого розіграшу →
              </a>
            </div>
          </div>
        ) : teams.length === 0 ? (
          /* SEASONS 3-4 WITHOUT TEAMS */
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] px-8 py-16 text-center">
            <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-[80px]" />

            <div className="relative">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-2xl font-black text-blue-300">
                2×2
              </div>

              <h3 className="mt-6 text-3xl font-black">
                Команди ще не сформовано
              </h3>

              <p className="mx-auto mt-4 max-w-xl leading-7 text-white/45">
                {season === 3
                  ? "Це перший розіграш Iron Co-op Cup. Команди та пари гравців будуть додані після їх формування."
                  : "Команди Iron Co-op Cup Сезону 4 будуть додані після формування складів нового сезону."}
              </p>
            </div>
          </div>
        ) : (
          /* TEAMS */
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {teams.map((team) => {
              const teamPlayers = team.players
                .map((id) =>
                  players.find((player) => player.id === id)
                )
                .filter(
                  (player): player is (typeof players)[number] =>
                    player !== undefined
                );

              return (
                <div
                  key={team.id}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-[#07101d]"
                >
                  <div className="border-b border-white/10 bg-gradient-to-r from-blue-500/15 to-transparent px-6 py-6">
                    <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
                      Iron Co-op Cup
                    </div>

                    <h3 className="mt-2 text-2xl font-black">
                      {team.name}
                    </h3>
                  </div>

                  <div>
                    {teamPlayers.map((player, index) => (
                      <a
                        key={player.id}
                        href={`/players/${player.id}`}
                        className="flex items-center gap-4 border-b border-white/5 px-6 py-5 transition last:border-b-0 hover:bg-white/[0.04]"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 font-black text-blue-300">
                          {index + 1}
                        </div>

                        <div>
                          <div className="font-bold">
                            {player.nickname}
                          </div>

                          {player.account && (
                            <div className="mt-1 text-xs text-white/35">
                              ({player.account})
                            </div>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* TOURNAMENT HISTORY */}
      <section className="border-t border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Історія турніру
          </div>

          <h2 className="mt-3 text-3xl font-black">
            Iron Co-op Cup
          </h2>

          <div className="mt-8 grid gap-5 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-[#07101d] p-6">
              <div className="text-sm font-bold text-white/30">
                Сезон 1
              </div>

              <div className="mt-4 text-lg font-black text-white/40">
                Не проводився
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#07101d] p-6">
              <div className="text-sm font-bold text-white/30">
                Сезон 2
              </div>

              <div className="mt-4 text-lg font-black text-white/40">
                Не проводився
              </div>
            </div>

            <div className="rounded-2xl border border-blue-400/20 bg-blue-500/[0.07] p-6">
              <div className="text-sm font-bold text-blue-300">
                Сезон 3
              </div>

              <div className="mt-4 text-lg font-black">
                Перший розіграш
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#07101d] p-6">
              <div className="text-sm font-bold text-white/30">
                Сезон 4
              </div>

              <div className="mt-4 text-lg font-black text-white/60">
                Підготовка
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FORMAT */}
      <section className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Формат
          </div>

          <h2 className="mt-3 text-3xl font-black">
            Формат Iron Co-op Cup
          </h2>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-[#07101d] p-6">
              <div className="text-4xl font-black text-blue-400">
                01
              </div>

              <h3 className="mt-5 text-xl font-black">
                Клуб УПЛ
              </h3>

              <p className="mt-3 text-sm leading-6 text-white/40">
                Кожна команда отримує назву футбольного клубу
                Української Прем&apos;єр-ліги.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#07101d] p-6">
              <div className="text-4xl font-black text-blue-400">
                02
              </div>

              <h3 className="mt-5 text-xl font-black">
                Два гравці
              </h3>

              <p className="mt-3 text-sm leading-6 text-white/40">
                Кожну команду представляють два учасники
                Iron League.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#07101d] p-6">
              <div className="text-4xl font-black text-blue-400">
                03
              </div>

              <h3 className="mt-5 text-xl font-black">
                2 × 2
              </h3>

              <p className="mt-3 text-sm leading-6 text-white/40">
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