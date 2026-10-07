import { players } from "../../../data/players";
import { season3 } from "../../../data/seasons/season-3";
import { season4 } from "../../../data/seasons/season-4";

type SeasonNumber = 1 | 2 | 3 | 4;

type AssociationKey =
  | "fra"
  | "bra"
  | "esp"
  | "eng"
  | "ned"
  | "ita"
  | "arg"
  | "por";

type PageProps = {
  searchParams: Promise<{
    season?: string;
  }>;
};

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

export default async function AssociationsPage({
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

  const associations = seasonData
    ? seasonData.associationsLeague.associations
    : null;

  const associationEntries = associations
    ? (Object.entries(associations) as [
        AssociationKey,
        {
          name: string;
          players: readonly string[];
        },
      ][])
    : [];

  const totalPlayers = associationEntries.reduce(
    (total, [, association]) =>
      total + association.players.length,
    0
  );

  const quarterfinals = seasonData
    ? (seasonData.associationsCup.quarterfinals as {
        home: AssociationKey;
        away: AssociationKey;
      }[])
    : [];

  const seasonStatus =
    season === 1 || season === 2
      ? "Архів — дані буде додано"
      : season === 3
        ? "Поточний сезон"
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
            Iron League
          </div>

          <h1 className="mt-4 text-5xl font-black sm:text-6xl">
            Ліга асоціацій
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/55">
            Командний турнір Iron League. Склади асоціацій та
            Кубок асоціацій зберігаються окремо для кожного сезону.
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
                  href={`/tournaments/associations?season=${seasonNumber}`}
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
                Асоціацій
              </span>

              <span className="ml-2 font-black">
                {associationEntries.length}
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3">
              <span className="text-sm text-white/40">
                Гравців
              </span>

              <span className="ml-2 font-black">
                {totalPlayers}
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

        {season === 1 || season === 2 ? (
          <div className="rounded-3xl border border-white/10 bg-[#07101d] px-8 py-16 text-center">
            <h3 className="text-3xl font-black">
              Дані сезону ще не додано
            </h3>

            <p className="mx-auto mt-4 max-w-xl leading-7 text-white/40">
              Склади асоціацій Сезону {season} будуть внесені
              пізніше разом з історичними даними.
            </p>
          </div>
        ) : totalPlayers === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-[#07101d] px-8 py-16 text-center">
            <h3 className="text-3xl font-black">
              Асоціації ще не сформовано
            </h3>

            <p className="mx-auto mt-4 max-w-xl leading-7 text-white/40">
              Склади асоціацій Сезону {season} будуть додані
              після формування нового сезону.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {associationEntries.map(
              ([associationId, association]) => {
                const associationPlayers =
                  association.players
                    .map((id) =>
                      players.find(
                        (player) => player.id === id
                      )
                    )
                    .filter(
                      (
                        player
                      ): player is (typeof players)[number] =>
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
                      {associationPlayers.map(
                        (player, index) => (
                          <a
                            key={player.id}
                            href={`/players/${player.id}`}
                            className="flex items-center gap-3 border-b border-white/5 px-5 py-4 transition last:border-b-0 hover:bg-white/[0.04]"
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
                          </a>
                        )
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
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
          </div>

          {season === 1 || season === 2 ? (
            <div className="rounded-3xl border border-white/10 bg-[#07101d] px-8 py-12 text-center">
              <p className="text-white/45">
                Сітка Кубка асоціацій Сезону {season} буде
                додана пізніше.
              </p>
            </div>
          ) : quarterfinals.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-[#07101d] px-8 py-12 text-center">
              <h3 className="text-2xl font-black">
                Жеребкування ще не проведено
              </h3>

              <p className="mt-3 text-white/40">
                Пари Кубка асоціацій Сезону {season} з&apos;являться
                після жеребкування.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {quarterfinals.map((match, index) => {
                if (!associations) {
                  return null;
                }

                const home = associations[match.home];
                const away = associations[match.away];

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
                      <div className="text-center">
                        <div className="text-sm font-black tracking-[0.25em] text-blue-400">
                          {associationCodes[match.home]}
                        </div>

                        <div className="mt-3 text-2xl font-black">
                          {home.name}
                        </div>
                      </div>

                      <div className="text-center">
                        <div className="text-xs uppercase tracking-[0.25em] text-white/25">
                          versus
                        </div>

                        <div className="mt-2 text-3xl font-black text-blue-400">
                          VS
                        </div>
                      </div>

                      <div className="text-center">
                        <div className="text-sm font-black tracking-[0.25em] text-blue-400">
                          {associationCodes[match.away]}
                        </div>

                        <div className="mt-3 text-2xl font-black">
                          {away.name}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}