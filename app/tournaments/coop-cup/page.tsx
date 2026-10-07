import { players } from "../../../data/players";
import { season3 } from "../../../data/seasons/season-3";

type CoopTeam = {
  id: string;
  name: string;
  players: string[];
};

export default function CoopCupPage() {
  const teams = season3.ironCoopCup.teams as CoopTeam[];

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
            Команди отримають назви футбольних клубів УПЛ,
            а кожну команду представлятимуть два гравці.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
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
                Статус
              </span>

              <span className="ml-2 font-black">
                Підготовка
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
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Учасники
          </div>

          <h2 className="mt-3 text-3xl font-black">
            Команди
          </h2>
        </div>

        {teams.length === 0 ? (
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] px-8 py-16 text-center">
            <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-[80px]" />

            <div className="relative">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-2xl font-black text-blue-300">
                2×2
              </div>

              <h3 className="mt-6 text-3xl font-black">
                Формування команд ще не розпочалось
              </h3>

              <p className="mx-auto mt-4 max-w-xl leading-7 text-white/45">
                Команди будуть додані перед стартом нового сезону.
                Кожна команда матиме назву клубу УПЛ і складатиметься
                з двох гравців Iron League.
              </p>
            </div>
          </div>
        ) : (
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
                      <div
                        key={player.id}
                        className="flex items-center gap-4 border-b border-white/5 px-6 py-5 last:border-b-0"
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
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* FORMAT */}
      <section className="border-t border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Формат турніру
          </div>

          <h2 className="mt-3 text-3xl font-black">
            Як працюватиме Iron Co-op Cup
          </h2>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-[#07101d] p-6">
              <div className="text-4xl font-black text-blue-400">
                01
              </div>

              <h3 className="mt-5 text-xl font-black">
                Команда
              </h3>

              <p className="mt-3 text-sm leading-6 text-white/40">
                Кожна команда отримує назву футбольного клубу УПЛ.
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
                До складу кожної команди входять два учасники Iron League.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#07101d] p-6">
              <div className="text-4xl font-black text-blue-400">
                03
              </div>

              <h3 className="mt-5 text-xl font-black">
                Турнір
              </h3>

              <p className="mt-3 text-sm leading-6 text-white/40">
                Формат змагання та турнірна сітка будуть додані
                після формування команд.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}