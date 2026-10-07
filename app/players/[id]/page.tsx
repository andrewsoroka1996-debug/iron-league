import { notFound } from "next/navigation";
import { players } from "../../../data/players";
import { season3 } from "../../../data/seasons/season-3";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
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

function getDivision(playerId: string) {
  const divisions = [
    {
      number: 1,
      name: "1 Дивізіон",
      players: season3.division1.players,
      cup: "Кубок 1 Дивізіону",
    },
    {
      number: 2,
      name: "2 Дивізіон",
      players: season3.division2.players,
      cup: "Кубок 2 Дивізіону",
    },
    {
      number: 3,
      name: "3 Дивізіон",
      players: season3.division3.players,
      cup: "Кубок 3 Дивізіону",
    },
    {
      number: 4,
      name: "4 Дивізіон",
      players: season3.division4.players,
      cup: "Кубок 4 Дивізіону",
    },
  ];

  return divisions.find((division) =>
    division.players.includes(playerId)
  );
}

function findGroup(
  groups: Record<string, readonly string[]>,
  playerId: string
) {
  const group = Object.entries(groups).find(([, playerIds]) =>
    playerIds.includes(playerId)
  );

  return group?.[0] ?? null;
}

function getEuropeanCompetitions(playerId: string) {
  const competitions = [
    {
      name: "Ліга чемпіонів",
      href: "/tournaments/champions-league",
      groups: season3.championsLeague.groups,
    },
    {
      name: "Ліга Європи",
      href: "/tournaments/europa-league",
      groups: season3.europaLeague.groups,
    },
    {
      name: "Ліга конференцій",
      href: "/tournaments/conference-league",
      groups: season3.conferenceLeague.groups,
    },
  ];

  return competitions
    .map((competition) => ({
      ...competition,
      group: findGroup(
        competition.groups as Record<string, readonly string[]>,
        playerId
      ),
    }))
    .filter((competition) => competition.group !== null);
}

function getAssociation(playerId: string) {
  const entries = Object.entries(
    season3.associationsLeague.associations
  );

  const result = entries.find(([, association]) =>
    association.players.includes(playerId)
  );

  if (!result) {
    return null;
  }

  const [id, association] = result;

  return {
    id,
    code: associationCodes[id] ?? id.toUpperCase(),
    name: association.name,
  };
}

function getCoopTeam(playerId: string) {
  const teams = season3.ironCoopCup.teams as {
    id: string;
    name: string;
    players: string[];
  }[];

  return teams.find((team) =>
    team.players.includes(playerId)
  );
}

export default async function PlayerPage({
  params,
}: PageProps) {
  const { id } = await params;

  const player = players.find((player) => player.id === id);

  if (!player) {
    notFound();
  }

  const division = getDivision(player.id);
  const europeanCompetitions =
    getEuropeanCompetitions(player.id);
  const association = getAssociation(player.id);
  const coopTeam = getCoopTeam(player.id);

  const initials = player.nickname
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 2)
    .toUpperCase();

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
                Профіль гравця
              </div>
            </div>
          </a>

          <a
            href="/players"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-blue-300 transition hover:border-blue-400/30 hover:bg-blue-500/10"
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
            backgroundImage: "url('/stadium-bg.jpg')",
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#030711] via-[#030711]/85 to-[#030711]/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#030711] via-transparent to-[#030711]/70" />

        <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-6 py-20 md:flex-row md:items-center">
          <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-[32px] border border-blue-400/25 bg-blue-500/10 text-4xl font-black text-blue-300 shadow-[0_0_60px_rgba(59,130,246,0.15)]">
            {initials}
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-[0.28em] text-blue-400">
              Iron League • Сезон 3
            </div>

            <h1 className="mt-3 break-words text-5xl font-black sm:text-6xl">
              {player.nickname}
            </h1>

            {player.account && (
              <div className="mt-3 text-lg text-white/40">
                ({player.account})
              </div>
            )}

            <div className="mt-7 flex flex-wrap gap-3">
              {division && (
                <a
                  href={`/divisions/${division.number}`}
                  className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-sm font-bold text-blue-300"
                >
                  {division.name}
                </a>
              )}

              {association && (
                <a
                  href="/tournaments/associations"
                  className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-bold text-white/70"
                >
                  {association.code} • {association.name}
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SEASON PARTICIPATION */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Сезон 3
          </div>

          <h2 className="mt-3 text-3xl font-black">
            Участь у турнірах
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {/* DIVISION */}
          {division && (
            <a
              href={`/divisions/${division.number}`}
              className="rounded-3xl border border-white/10 bg-[#07101d] p-7 transition hover:-translate-y-1 hover:border-blue-400/40"
            >
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-blue-400">
                Чемпіонат
              </div>

              <div className="mt-4 text-2xl font-black">
                {division.name}
              </div>

              <div className="mt-3 text-sm text-white/40">
                Перейти до дивізіону →
              </div>
            </a>
          )}

          {/* DIVISION CUP */}
          {division && (
            <a
              href="/tournaments/division-cups"
              className="rounded-3xl border border-white/10 bg-[#07101d] p-7 transition hover:-translate-y-1 hover:border-blue-400/40"
            >
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-blue-400">
                Кубок
              </div>

              <div className="mt-4 text-2xl font-black">
                {division.cup}
              </div>

              <div className="mt-3 text-sm text-white/40">
                Турнір на вибування →
              </div>
            </a>
          )}

          {/* EUROPE */}
          {europeanCompetitions.map((competition) => (
            <a
              key={competition.name}
              href={competition.href}
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
          ))}

          {/* ASSOCIATION */}
          {association && (
            <a
              href="/tournaments/associations"
              className="rounded-3xl border border-white/10 bg-[#07101d] p-7 transition hover:-translate-y-1 hover:border-blue-400/40"
            >
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-blue-400">
                Асоціація
              </div>

              <div className="mt-4 text-2xl font-black">
                {association.code} • {association.name}
              </div>

              <div className="mt-3 text-sm text-white/40">
                Ліга та Кубок асоціацій →
              </div>
            </a>
          )}

          {/* CO-OP */}
          {coopTeam && (
            <a
              href="/tournaments/coop-cup"
              className="rounded-3xl border border-white/10 bg-[#07101d] p-7 transition hover:-translate-y-1 hover:border-blue-400/40"
            >
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-blue-400">
                Iron Co-op Cup
              </div>

              <div className="mt-4 text-2xl font-black">
                {coopTeam.name}
              </div>

              <div className="mt-3 text-sm text-white/40">
                Командний турнір 2 × 2 →
              </div>
            </a>
          )}
        </div>
      </section>

      {/* STATS PLACEHOLDER */}
      <section className="border-t border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="mb-8">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
              Статистика
            </div>

            <h2 className="mt-3 text-3xl font-black">
              Сезон 3
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-[#07101d] p-6">
              <div className="text-sm text-white/35">
                Матчі
              </div>
              <div className="mt-2 text-4xl font-black">0</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#07101d] p-6">
              <div className="text-sm text-white/35">
                Перемоги
              </div>
              <div className="mt-2 text-4xl font-black">0</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#07101d] p-6">
              <div className="text-sm text-white/35">
                Голи
              </div>
              <div className="mt-2 text-4xl font-black">0</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#07101d] p-6">
              <div className="text-sm text-white/35">
                Трофеї
              </div>
              <div className="mt-2 text-4xl font-black">0</div>
            </div>
          </div>

          <p className="mt-6 text-sm text-white/30">
            Статистика буде підключена до результатів матчів після
            запуску системи нового сезону.
          </p>
        </div>
      </section>
    </main>
  );
}