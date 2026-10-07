import { notFound } from "next/navigation";
import { players } from "../../../data/players";
import { season3 } from "../../../data/seasons/season-3";
import { season4 } from "../../../data/seasons/season-4";

type SeasonNumber = 1 | 2 | 3 | 4;

type PageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    season?: string;
  }>;
};

type SeasonData = typeof season3 | typeof season4;

type CoopTeam = {
  id: string;
  name: string;
  players: string[];
};

const associationCodes: Record<string, string> = {
  fra: "FRA",
  bra: "BRA",
  esp: "ESP",
  eng: "ENG",
  ned: "NED",
  ita: "ITA",
  arg: "ARG",
  por: "POR",
};

function getSeasonData(
  season: SeasonNumber
): SeasonData | null {
  if (season === 3) {
    return season3;
  }

  if (season === 4) {
    return season4;
  }

  return null;
}

function getDivision(
  data: SeasonData,
  playerId: string
) {
  const divisions = [
    {
      number: 1,
      name: "1 Дивізіон",
      players: data.division1.players as readonly string[],
    },
    {
      number: 2,
      name: "2 Дивізіон",
      players: data.division2.players as readonly string[],
    },
    {
      number: 3,
      name: "3 Дивізіон",
      players: data.division3.players as readonly string[],
    },
    {
      number: 4,
      name: "4 Дивізіон",
      players: data.division4.players as readonly string[],
    },
  ];

  return divisions.find((division) =>
    division.players.includes(playerId)
  );
}

function getDivisionCup(
  data: SeasonData,
  playerId: string
) {
  const cups = [
    {
      number: 1,
      name: "Кубок 1 Дивізіону",
      players:
        data.division1Cup.players as readonly string[],
    },
    {
      number: 2,
      name: "Кубок 2 Дивізіону",
      players:
        data.division2Cup.players as readonly string[],
    },
    {
      number: 3,
      name: "Кубок 3 Дивізіону",
      players:
        data.division3Cup.players as readonly string[],
    },
    {
      number: 4,
      name: "Кубок 4 Дивізіону",
      players:
        data.division4Cup.players as readonly string[],
    },
  ];

  return cups.find((cup) =>
    cup.players.includes(playerId)
  );
}

function findGroup(
  groups: Record<string, readonly string[]>,
  playerId: string
) {
  const result = Object.entries(groups).find(
    ([, playerIds]) => playerIds.includes(playerId)
  );

  return result?.[0] ?? null;
}

function getEuropeanCompetitions(
  data: SeasonData,
  playerId: string
) {
  const competitions = [
    {
      name: "Ліга чемпіонів",
      href: "/tournaments/champions-league",
      groups:
        data.championsLeague.groups as Record<
          string,
          readonly string[]
        >,
    },
    {
      name: "Ліга Європи",
      href: "/tournaments/europa-league",
      groups:
        data.europaLeague.groups as Record<
          string,
          readonly string[]
        >,
    },
    {
      name: "Ліга конференцій",
      href: "/tournaments/conference-league",
      groups:
        data.conferenceLeague.groups as Record<
          string,
          readonly string[]
        >,
    },
  ];

  return competitions
    .map((competition) => ({
      ...competition,
      group: findGroup(
        competition.groups,
        playerId
      ),
    }))
    .filter(
      (competition) => competition.group !== null
    );
}

function getAssociation(
  data: SeasonData,
  playerId: string
) {
  const entries = Object.entries(
    data.associationsLeague.associations
  ) as [
    string,
    {
      name: string;
      players: readonly string[];
    },
  ][];

  const result = entries.find(
    ([, association]) =>
      association.players.includes(playerId)
  );

  if (!result) {
    return null;
  }

  const [id, association] = result;

  return {
    id,
    code:
      associationCodes[id] ?? id.toUpperCase(),
    name: association.name,
  };
}

function playsAssociationsCup(
  data: SeasonData,
  associationId: string | undefined
) {
  if (!associationId) {
    return false;
  }

  const matches =
    data.associationsCup.quarterfinals as {
      home: string;
      away: string;
    }[];

  return matches.some(
    (match) =>
      match.home === associationId ||
      match.away === associationId
  );
}

function getCoopTeam(
  data: SeasonData,
  playerId: string
) {
  const teams =
    data.ironCoopCup.teams as CoopTeam[];

  return teams.find((team) =>
    team.players.includes(playerId)
  );
}

export default async function PlayerPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const query = await searchParams;

  const requestedSeason = Number(query.season);

  const season: SeasonNumber =
    requestedSeason >= 1 &&
    requestedSeason <= 4
      ? (requestedSeason as SeasonNumber)
      : 3;

  const player = players.find(
    (player) => player.id === id
  );

  if (!player) {
    notFound();
  }

  const seasonData = getSeasonData(season);

  const division = seasonData
    ? getDivision(seasonData, player.id)
    : null;

  const divisionCup = seasonData
    ? getDivisionCup(seasonData, player.id)
    : null;

  const europeanCompetitions = seasonData
    ? getEuropeanCompetitions(
        seasonData,
        player.id
      )
    : [];

  const association = seasonData
    ? getAssociation(seasonData, player.id)
    : null;

  const associationCup =
    seasonData && association
      ? playsAssociationsCup(
          seasonData,
          association.id
        )
      : false;

  const coopTeam = seasonData
    ? getCoopTeam(seasonData, player.id)
    : null;

  const hasParticipation =
    Boolean(division) ||
    Boolean(divisionCup) ||
    europeanCompetitions.length > 0 ||
    Boolean(association) ||
    Boolean(coopTeam);

  const initials = player.nickname
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 2)
    .toUpperCase();

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

              <div className="text-xs text-white/40">
                Профіль гравця
              </div>
            </div>
          </a>

          <a
            href="/players"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-blue-300"
          >
            ← Усі гравці
          </a>
        </div>
      </header>

      {/* PLAYER HERO */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25"
          style={{
            backgroundImage:
              "url('/stadium-bg.jpg')",
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#030711] via-[#030711]/85 to-[#030711]/60" />

        <div className="relative mx-auto max-w-7xl px-6 py-20">
          <div className="flex flex-col gap-8 md:flex-row md:items-center">
            <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-[32px] border border-blue-400/25 bg-blue-500/10 text-4xl font-black text-blue-300">
              {initials}
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-[0.28em] text-blue-400">
                Iron League
              </div>

              <h1 className="mt-3 break-words text-5xl font-black sm:text-6xl">
                {player.nickname}
              </h1>

              {player.account && (
                <div className="mt-3 text-lg text-white/40">
                  ({player.account})
                </div>
              )}
            </div>
          </div>

          {/* SEASON SWITCHER */}
          <div className="mt-10">
            <div className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/35">
              Кар&apos;єра за сезонами
            </div>

            <div className="inline-flex flex-wrap rounded-xl border border-white/10 bg-[#07101d] p-1">
              {([1, 2, 3, 4] as const).map(
                (seasonNumber) => (
                  <a
                    key={seasonNumber}
                    href={`/players/${player.id}?season=${seasonNumber}`}
                    className={`rounded-lg px-5 py-2.5 text-sm font-bold transition ${
                      season === seasonNumber
                        ? "bg-blue-500 text-white"
                        : "text-white/45 hover:text-white"
                    }`}
                  >
                    Сезон {seasonNumber}
                  </a>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SEASON */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Кар&apos;єра
          </div>

          <h2 className="mt-3 text-3xl font-black">
            Сезон {season}
          </h2>
        </div>

        {/* SEASONS 1-2 NOT IMPORTED */}
        {!seasonData ? (
          <div className="rounded-3xl border border-white/10 bg-[#07101d] px-8 py-14">
            <h3 className="text-3xl font-black">
              Архівні дані ще не внесені
            </h3>

            <p className="mt-4 max-w-2xl leading-7 text-white/45">
              Дані про участь {player.nickname} у
              Сезоні {season} ще не перенесені до
              архіву Iron League.
            </p>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/30">
              Це не означає, що гравець не брав
              участі в цьому сезоні. Інформація буде
              визначена після внесення історичних
              складів і результатів.
            </p>
          </div>
        ) : !hasParticipation ? (
          /* PLAYER DID NOT PARTICIPATE */
          <div className="rounded-3xl border border-white/10 bg-[#07101d] px-8 py-14">
            <h3 className="text-3xl font-black">
              Участь у сезоні не зафіксована
            </h3>

            <p className="mt-4 max-w-2xl leading-7 text-white/45">
              {season === 4
                ? `${player.nickname} поки не заявлений до жодного турніру Сезону 4.`
                : `${player.nickname} не знайдений у складах турнірів Сезону ${season}.`}
            </p>
          </div>
        ) : (
          /* PARTICIPATION */
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {division && (
              <a
                href={`/divisions/${division.number}?season=${season}`}
                className="rounded-3xl border border-white/10 bg-[#07101d] p-7 transition hover:-translate-y-1 hover:border-blue-400/40"
              >
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-blue-400">
                  Чемпіонат
                </div>

                <div className="mt-4 text-2xl font-black">
                  {division.name}
                </div>
              </a>
            )}

            {divisionCup && (
              <a
                href={`/tournaments/division-cups?season=${season}`}
                className="rounded-3xl border border-white/10 bg-[#07101d] p-7 transition hover:-translate-y-1 hover:border-blue-400/40"
              >
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-blue-400">
                  Кубок
                </div>

                <div className="mt-4 text-2xl font-black">
                  {divisionCup.name}
                </div>
              </a>
            )}

            {europeanCompetitions.map(
              (competition) => (
                <a
                  key={competition.name}
                  href={`${competition.href}?season=${season}`}
                  className="rounded-3xl border border-white/10 bg-[#07101d] p-7 transition hover:-translate-y-1 hover:border-blue-400/40"
                >
                  <div className="text-xs font-bold uppercase tracking-[0.22em] text-blue-400">
                    Єврокубок
                  </div>

                  <div className="mt-4 text-2xl font-black">
                    {competition.name}
                  </div>

                  <div className="mt-3 text-sm text-white/40">
                    Група {competition.group}
                  </div>
                </a>
              )
            )}

            {association && (
              <a
                href={`/tournaments/associations?season=${season}`}
                className="rounded-3xl border border-white/10 bg-[#07101d] p-7 transition hover:-translate-y-1 hover:border-blue-400/40"
              >
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-blue-400">
                  Ліга асоціацій
                </div>

                <div className="mt-4 text-2xl font-black">
                  {association.code} •{" "}
                  {association.name}
                </div>
              </a>
            )}

            {associationCup && association && (
              <a
                href={`/tournaments/associations?season=${season}`}
                className="rounded-3xl border border-white/10 bg-[#07101d] p-7 transition hover:-translate-y-1 hover:border-blue-400/40"
              >
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-blue-400">
                  Кубок асоціацій
                </div>

                <div className="mt-4 text-2xl font-black">
                  {association.code} •{" "}
                  {association.name}
                </div>
              </a>
            )}

            {coopTeam && (
              <a
                href={`/tournaments/coop-cup?season=${season}`}
                className="rounded-3xl border border-white/10 bg-[#07101d] p-7 transition hover:-translate-y-1 hover:border-blue-400/40"
              >
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-blue-400">
                  Iron Co-op Cup
                </div>

                <div className="mt-4 text-2xl font-black">
                  {coopTeam.name}
                </div>

                <div className="mt-3 text-sm text-white/40">
                  Командний турнір 2 × 2
                </div>
              </a>
            )}
          </div>
        )}
      </section>

      {/* CAREER */}
      <section className="border-t border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Кар&apos;єра Iron League
          </div>

          <h2 className="mt-3 text-3xl font-black">
            Загальна статистика
          </h2>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-[#07101d] p-6">
              <div className="text-sm text-white/35">
                Сезонів
              </div>

              <div className="mt-2 text-4xl font-black">
                —
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#07101d] p-6">
              <div className="text-sm text-white/35">
                Матчів
              </div>

              <div className="mt-2 text-4xl font-black">
                —
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#07101d] p-6">
              <div className="text-sm text-white/35">
                Перемог
              </div>

              <div className="mt-2 text-4xl font-black">
                —
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#07101d] p-6">
              <div className="text-sm text-white/35">
                Трофеїв
              </div>

              <div className="mt-2 text-4xl font-black">
                —
              </div>
            </div>
          </div>

          <p className="mt-6 text-sm text-white/30">
            Загальна кар&apos;єрна статистика буде
            обчислюватися автоматично після внесення
            результатів усіх сезонів.
          </p>
        </div>
      </section>
    </main>
  );
}