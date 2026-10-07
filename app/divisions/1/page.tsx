const table = [
  {
    position: 1,
    player: "EverlasT_UA",
    account: "everlast_ua",
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  },
  {
    position: 2,
    player: "Andrew_SM",
    account: "andrew_sm_",
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  },
  {
    position: 3,
    player: "ProEvolution10",
    account: "olesvokal10",
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  },
  {
    position: 4,
    player: "VolodyaBES",
    account: "volodya_bes_",
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  },
  {
    position: 5,
    player: "VolodyaTheGooner",
    account: "the_chemodan_clan1991",
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  },
  {
    position: 6,
    player: "Roma_zubrik",
    account: "roma_zubrik",
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  },
  {
    position: 7,
    player: "SaimonSpy",
    account: "saimonspy",
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  },
  {
    position: 8,
    player: "holy-",
    account: "holy28",
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  },
  {
    position: 9,
    player: "Burdey1992",
    account: "burdey1992",
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  },
  {
    position: 10,
    player: "AlexLiv",
    account: "alex_530",
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  },
  {
    position: 11,
    player: "19lenya19",
    account: "19lenya19",
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  },
  {
    position: 12,
    player: "GLORYtoUkraine",
    account: "serginho1927",
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  },
  {
    position: 13,
    player: "MykhaOK",
    account: "mykhaok_99447",
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  },
  {
    position: 14,
    player: "TheLP9",
    account: "thelp9",
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  },
  {
    position: 15,
    player: "SenatoreUA",
    account: "ruslan045945",
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  },
  {
    position: 16,
    player: "gadyuka_88",
    account: "gadyuka_88",
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  },
];

export default function DivisionOnePage() {
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
                1 Дивізіон
              </div>
            </div>
          </a>

          <a
            href="/divisions"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-blue-300 transition hover:border-blue-400/30 hover:bg-blue-500/10"
          >
            ← Усі дивізіони
          </a>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{
            backgroundImage: "url('/stadium-bg.jpg')",
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#030711] via-[#030711]/85 to-[#030711]/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#030711] via-transparent to-[#030711]/70" />

        <div className="relative mx-auto max-w-7xl px-6 py-20">
          <div className="text-xs font-bold uppercase tracking-[0.28em] text-blue-400">
            Iron League Championship
          </div>

          <h1 className="mt-4 text-5xl font-black sm:text-6xl">
            1 Дивізіон
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/55">
            Турнірна таблиця, статистика та результати учасників
            найвищого дивізіону Iron League.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3">
              <span className="text-sm text-white/40">Учасників </span>
              <span className="ml-2 font-black">16</span>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3">
              <span className="text-sm text-white/40">Статус </span>
              <span className="ml-2 font-black text-blue-300">
                Поточний сезон
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* TABLE */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Чемпіонат
          </div>

          <h2 className="mt-3 text-3xl font-black">
            Турнірна таблиця
          </h2>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#07101d] shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="border-b border-white/10 bg-white/[0.035]">
                <tr className="text-xs font-bold uppercase tracking-wider text-white/35">
                  <th className="px-5 py-4 text-center">#</th>
                  <th className="px-5 py-4 text-left">Гравець</th>
                  <th className="px-4 py-4 text-center">І</th>
                  <th className="px-4 py-4 text-center">В</th>
                  <th className="px-4 py-4 text-center">Н</th>
                  <th className="px-4 py-4 text-center">П</th>
                  <th className="px-4 py-4 text-center">ЗМ</th>
                  <th className="px-4 py-4 text-center">ПМ</th>
                  <th className="px-4 py-4 text-center">РМ</th>
                  <th className="px-5 py-4 text-center">О</th>
                </tr>
              </thead>

              <tbody>
                {table.map((player) => {
                  const difference =
                    player.goalsFor - player.goalsAgainst;

                  return (
                    <tr
                      key={player.player}
                      className="border-b border-white/5 transition last:border-b-0 hover:bg-white/[0.04]"
                    >
                      <td className="px-5 py-4 text-center">
                        <div
                          className={`mx-auto flex h-9 w-9 items-center justify-center rounded-lg font-black ${
                            player.position <= 3
                              ? "bg-blue-500/20 text-blue-300"
                              : "bg-white/[0.05] text-white/60"
                          }`}
                        >
                          {player.position}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-bold">
                          {player.player}
                        </div>

                        <div className="mt-1 text-xs text-white/35">
                          ({player.account})
                        </div>
                      </td>

                      <td className="px-4 py-4 text-center text-white/60">
                        {player.played}
                      </td>

                      <td className="px-4 py-4 text-center text-white/60">
                        {player.wins}
                      </td>

                      <td className="px-4 py-4 text-center text-white/60">
                        {player.draws}
                      </td>

                      <td className="px-4 py-4 text-center text-white/60">
                        {player.losses}
                      </td>

                      <td className="px-4 py-4 text-center text-white/60">
                        {player.goalsFor}
                      </td>

                      <td className="px-4 py-4 text-center text-white/60">
                        {player.goalsAgainst}
                      </td>

                      <td
                        className={`px-4 py-4 text-center font-semibold ${
                          difference > 0
                            ? "text-green-400"
                            : difference < 0
                              ? "text-red-400"
                              : "text-white/50"
                        }`}
                      >
                        {difference > 0 ? `+${difference}` : difference}
                      </td>

                      <td className="px-5 py-4 text-center text-xl font-black">
                        {player.points}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* LEGEND */}
        <div className="mt-6 flex flex-wrap gap-6 text-xs text-white/35">
          <span>
            <b className="text-white/60">І</b> — ігри
          </span>

          <span>
            <b className="text-white/60">В</b> — перемоги
          </span>

          <span>
            <b className="text-white/60">Н</b> — нічиї
          </span>

          <span>
            <b className="text-white/60">П</b> — поразки
          </span>

          <span>
            <b className="text-white/60">ЗМ</b> — забиті м&apos;ячі
          </span>

          <span>
            <b className="text-white/60">ПМ</b> — пропущені м&apos;ячі
          </span>

          <span>
            <b className="text-white/60">РМ</b> — різниця м&apos;ячів
          </span>

          <span>
            <b className="text-white/60">О</b> — очки
          </span>
        </div>
      </section>
    </main>
  );
}