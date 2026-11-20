/** Public placeholder for approved players who have not joined a tournament. */
export default function NewPlayerPublicProfile({ nickname }: { nickname: string }) {
  return (
    <>
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10" aria-label="Статус нового гравця">
        <div className="rounded-2xl border border-blue-400/20 bg-gradient-to-br from-[#102741] via-[#0a172a] to-[#08121f] p-4 sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.17em] text-blue-300">IRON LEAGUE · НОВИЙ ГРАВЕЦЬ</p>
          <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">Профіль зареєстровано</h2>
          <p className="mt-3 text-sm leading-6 text-white/60">
            {nickname} уже має профіль Iron League. Участь у дивізіонах і турнірах ще не зафіксована.
            Реєстрація профілю сама по собі не додає гравця до жодного сезону.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6" aria-label="Статистика нового гравця">
        <h2 className="mb-4 text-xl font-black text-white sm:text-2xl">Кар'єра Iron League</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { title: "Матчів", number: 0 },
            { title: "Перемог", number: 0 },
            { title: "Голів", number: 0 },
            { title: "Трофеїв", number: 0 },
          ].map((stat) => (
            <div key={stat.title} className="rounded-xl border border-white/10 bg-[#07101d] p-4">
              <div className="text-xs font-semibold text-white/45">{stat.title}</div>
              <div className="mt-2 text-2xl font-black text-white">{stat.number}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-[#07101d] p-5 text-sm leading-6 text-white/55">
          Турнірів і завершених матчів поки немає. Історична статистика та турнірні результати не змінювалися.
        </div>
      </section>
    </>
  );
}
