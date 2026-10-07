const table = [
  {
    position: 1,
    player: "Andrew_SM",
    played: 10,
    wins: 8,
    draws: 1,
    losses: 1,
    goals: "29:14",
    difference: "+15",
    points: 25,
  },
  {
    position: 2,
    player: "Valdemar",
    played: 10,
    wins: 7,
    draws: 2,
    losses: 1,
    goals: "25:13",
    difference: "+12",
    points: 23,
  },
  {
    position: 3,
    player: "TheLP9",
    played: 10,
    wins: 6,
    draws: 2,
    losses: 2,
    goals: "22:16",
    difference: "+6",
    points: 20,
  },
  {
    position: 4,
    player: "Soga",
    played: 10,
    wins: 5,
    draws: 2,
    losses: 3,
    goals: "19:17",
    difference: "+2",
    points: 17,
  },
];

export default function DivisionOnePage() {
  return (
    <main className="min-h-screen bg-[#030711] text-white">
      <header className="border-b border-white/10 bg-[#030711]/95">
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
                4 Дивізіон
              </div>
            </div>
          </a>

          <a
            href="/divisions"
            className="text-sm font-bold text-blue-400 hover:text-blue-300"
          >
            ← Усі дивізіони
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Iron League Championship
          </div>

          <h1 className="mt-3 text-5xl font-black">
            4 Дивізіон
          </h1>

          <p className="mt-4 text-white/45">
            Турнірна таблиця сезону
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-3xl border border-white/10 bg-[#07101d]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px]">
              <thead className="border-b border-white/10 bg-white/[0.03]">
                <tr className="text-left text-xs uppercase tracking-wider text-white/35">
                  <th className="px-5 py-4">#</th>
                  <th className="px-5 py-4">Гравець</th>
                  <th className="px-5 py-4 text-center">І</th>
                  <th className="px-5 py-4 text-center">В</th>
                  <th className="px-5 py-4 text-center">Н</th>
                  <th className="px-5 py-4 text-center">П</th>
                  <th className="px-5 py-4 text-center">Голи</th>
                  <th className="px-5 py-4 text-center">РМ</th>
                  <th className="px-5 py-4 text-center">О</th>
                </tr>
              </thead>

              <tbody>
                {table.map((player) => (
                  <tr
                    key={player.player}
                    className="border-b border-white/5 transition hover:bg-white/[0.04]"
                  >
                    <td className="px-5 py-5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 font-black text-blue-300">
                        {player.position}
                      </div>
                    </td>

                    <td className="px-5 py-5 text-lg font-bold">
                      {player.player}
                    </td>

                    <td className="px-5 py-5 text-center text-white/60">
                      {player.played}
                    </td>

                    <td className="px-5 py-5 text-center text-white/60">
                      {player.wins}
                    </td>

                    <td className="px-5 py-5 text-center text-white/60">
                      {player.draws}
                    </td>

                    <td className="px-5 py-5 text-center text-white/60">
                      {player.losses}
                    </td>

                    <td className="px-5 py-5 text-center text-white/60">
                      {player.goals}
                    </td>

                    <td className="px-5 py-5 text-center font-semibold text-green-400">
                      {player.difference}
                    </td>

                    <td className="px-5 py-5 text-center text-xl font-black">
                      {player.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}