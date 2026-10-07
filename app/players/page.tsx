import { players } from "../../data/players";
import { season3 } from "../../data/seasons/season-3";

function getDivision(playerId: string) {
  if (season3.division1.players.includes(playerId)) {
    return 1;
  }

  if (season3.division2.players.includes(playerId)) {
    return 2;
  }

  if (season3.division3.players.includes(playerId)) {
    return 3;
  }

  if (season3.division4.players.includes(playerId)) {
    return 4;
  }

  return null;
}

const playersWithDivision = players
  .map((player) => ({
    ...player,
    division: getDivision(player.id),
  }))
  .sort((a, b) => {
    if (a.division !== b.division) {
      return (a.division ?? 99) - (b.division ?? 99);
    }

    return a.nickname.localeCompare(b.nickname);
  });

export default function PlayersPage() {
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
                Гравці
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
            Iron League • Сезон 3
          </div>

          <h1 className="mt-4 text-5xl font-black sm:text-6xl">
            Гравці
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/55">
            Усі учасники Iron League. Тут зберігатимуться профілі,
            дивізіони, турніри, статистика та історія виступів гравців.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3">
              <span className="text-sm text-white/40">
                Гравців
              </span>

              <span className="ml-2 font-black">
                {playersWithDivision.length}
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3">
              <span className="text-sm text-white/40">
                Дивізіонів
              </span>

              <span className="ml-2 font-black text-blue-300">
                4
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* PLAYERS */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Учасники
          </div>

          <h2 className="mt-3 text-3xl font-black">
            Склад Iron League
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {playersWithDivision.map((player) => {
            const initials = player.nickname
              .replace(/[^a-zA-Z0-9]/g, "")
              .slice(0, 2)
              .toUpperCase();

            return (
              <a
                key={player.id}
                href={`/players/${player.id}`}
                className="group block overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] transition duration-300 hover:-translate-y-1 hover:border-blue-400/40 hover:shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
              >
                <div className="border-b border-white/10 bg-gradient-to-br from-blue-500/15 to-transparent p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-xl font-black text-blue-300 transition group-hover:border-blue-400/40 group-hover:bg-blue-500/15">
                      {initials}
                    </div>

                    {player.division && (
                      <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-bold text-white/50">
                        {player.division} Дивізіон
                      </div>
                    )}
                  </div>

                  <h3 className="mt-6 break-words text-xl font-black">
                    {player.nickname}
                  </h3>

                  {player.account && (
                    <div className="mt-2 break-words text-sm text-white/35">
                      ({player.account})
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <div className="text-xs uppercase tracking-[0.2em] text-white/30">
                    Поточний статус
                  </div>

                  <div className="mt-2 font-bold text-blue-300">
                    Учасник Iron League
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5 text-sm">
                    <span className="text-white/35">
                      Відкрити профіль
                    </span>

                    <span className="font-bold text-blue-400 transition group-hover:translate-x-1">
                      →
                    </span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </section>
    </main>
  );
}