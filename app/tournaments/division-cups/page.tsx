import { players } from "../../../data/players";
import { season3 } from "../../../data/seasons/season-3";

const cups = [
  {
    number: 1,
    name: "Кубок 1 Дивізіону",
    playerIds: season3.division1Cup.players,
  },
  {
    number: 2,
    name: "Кубок 2 Дивізіону",
    playerIds: season3.division2Cup.players,
  },
  {
    number: 3,
    name: "Кубок 3 Дивізіону",
    playerIds: season3.division3Cup.players,
  },
  {
    number: 4,
    name: "Кубок 4 Дивізіону",
    playerIds: season3.division4Cup.players,
  },
];

export default function DivisionCupsPage() {
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
                Кубки дивізіонів
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
            Кубки дивізіонів
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/55">
            Чотири окремі турніри на вибування для учасників
            1, 2, 3 та 4 Дивізіонів Iron League.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3">
              <span className="text-sm text-white/40">
                Кубків
              </span>

              <span className="ml-2 font-black">
                4
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3">
              <span className="text-sm text-white/40">
                Формат
              </span>

              <span className="ml-2 font-black text-blue-300">
                Плей-оф
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* CUPS */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Турніри
          </div>

          <h2 className="mt-3 text-3xl font-black">
            Кубки
          </h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {cups.map((cup) => {
            const cupPlayers = cup.playerIds
              .map((id) =>
                players.find((player) => player.id === id)
              )
              .filter(
                (player): player is (typeof players)[number] =>
                  player !== undefined
              );

            return (
              <div
                key={cup.number}
                className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] shadow-xl"
              >
                <div className="absolute right-4 top-0 text-[110px] font-black text-white/[0.025]">
                  {cup.number}
                </div>

                <div className="relative border-b border-white/10 bg-gradient-to-r from-blue-500/15 to-transparent px-7 py-6">
                  <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
                    Knockout Tournament
                  </div>

                  <h3 className="mt-2 text-3xl font-black">
                    {cup.name}
                  </h3>

                  <div className="mt-3 text-sm text-white/40">
                    {cupPlayers.length} учасників
                  </div>
                </div>

                <div className="grid gap-px bg-white/5 sm:grid-cols-2">
                  {cupPlayers.map((player, index) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-3 bg-[#07101d] px-5 py-4"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-xs font-black text-white/40">
                        {index + 1}
                      </div>

                      <div className="min-w-0">
                        <div className="truncate font-bold">
                          {player.nickname}
                        </div>

                        {player.account && (
                          <div className="mt-1 truncate text-xs text-white/35">
                            ({player.account})
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-white/10 px-7 py-5">
                  <div className="text-sm font-bold text-blue-300">
                    Сітку плей-оф буде сформовано перед стартом сезону
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}