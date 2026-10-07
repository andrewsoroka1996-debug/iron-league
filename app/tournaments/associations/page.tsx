import { players } from "../../../data/players";
import { season3 } from "../../../data/seasons/season-3";

const associations = season3.associationsLeague.associations;

type AssociationKey = keyof typeof associations;

const associationCodes: Record<AssociationKey, string> = {
  fra: "FRA",
  bra: "BRA",
  esp: "ESP",
  eng: "ENG",
  ned: "NED",
  ita: "ITA",
  arg: "ARG",
  por: "POR",
};

export default function AssociationsPage() {
  const associationEntries = Object.entries(associations) as [
    AssociationKey,
    (typeof associations)[AssociationKey],
  ][];

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
                Асоціації
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
            Ліга асоціацій
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/55">
            Командний турнір Iron League. Вісім асоціацій,
            кожна з яких складається із шести гравців.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3">
              <span className="text-sm text-white/40">
                Асоціацій
              </span>
              <span className="ml-2 font-black">8</span>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3">
              <span className="text-sm text-white/40">
                Гравців у команді
              </span>
              <span className="ml-2 font-black text-blue-300">
                6
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ASSOCIATIONS */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Склади
          </div>

          <h2 className="mt-3 text-3xl font-black">
            Асоціації
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {associationEntries.map(([associationId, association]) => {
            const associationPlayers = association.players
              .map((id) =>
                players.find((player) => player.id === id)
              )
              .filter(
                (player): player is (typeof players)[number] =>
                  player !== undefined
              );

            return (
              <div
                key={associationId}
                className="overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] shadow-xl"
              >
                <div className="border-b border-white/10 bg-gradient-to-r from-blue-500/15 to-transparent px-6 py-6">
                  <div className="text-sm font-black tracking-[0.25em] text-blue-400">
                    {associationCodes[associationId]}
                  </div>

                  <h3 className="mt-3 text-2xl font-black">
                    {association.name}
                  </h3>

                  <div className="mt-2 text-xs uppercase tracking-[0.2em] text-white/35">
                    {associationPlayers.length} гравців
                  </div>
                </div>

                <div>
                  {associationPlayers.map((player, index) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-3 border-b border-white/5 px-5 py-4 last:border-b-0"
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
              </div>
            );
          })}
        </div>
      </section>

      {/* ASSOCIATIONS CUP */}
      <section className="border-t border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="mb-10">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
              Плей-оф
            </div>

            <h2 className="mt-3 text-4xl font-black">
              Кубок асоціацій
            </h2>

            <p className="mt-4 max-w-2xl text-white/45">
              Стартова стадія турніру — 1/4 фіналу.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {season3.associationsCup.quarterfinals.map(
              (match, index) => {
                const homeId = match.home as AssociationKey;
                const awayId = match.away as AssociationKey;

                const home = associations[homeId];
                const away = associations[awayId];

                return (
                  <div
                    key={`${match.home}-${match.away}`}
                    className="overflow-hidden rounded-3xl border border-white/10 bg-[#07101d]"
                  >
                    <div className="border-b border-white/10 bg-white/[0.03] px-6 py-4">
                      <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
                        1/4 фіналу • Пара {index + 1}
                      </div>
                    </div>

                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 py-9">
                      {/* HOME */}
                      <div className="text-center">
                        <div className="text-sm font-black tracking-[0.25em] text-blue-400">
                          {associationCodes[homeId]}
                        </div>

                        <div className="mt-3 text-2xl font-black">
                          {home.name}
                        </div>
                      </div>

                      {/* VS */}
                      <div className="text-center">
                        <div className="text-xs uppercase tracking-[0.25em] text-white/25">
                          versus
                        </div>

                        <div className="mt-2 text-3xl font-black text-blue-400">
                          VS
                        </div>
                      </div>

                      {/* AWAY */}
                      <div className="text-center">
                        <div className="text-sm font-black tracking-[0.25em] text-blue-400">
                          {associationCodes[awayId]}
                        </div>

                        <div className="mt-3 text-2xl font-black">
                          {away.name}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>

          <div className="mt-8 rounded-2xl border border-blue-400/15 bg-blue-500/[0.06] px-6 py-5 text-sm text-blue-200/70">
            Півфінали та фінал будуть формуватися після визначення
            переможців матчів 1/4 фіналу.
          </div>
        </div>
      </section>
    </main>
  );
}