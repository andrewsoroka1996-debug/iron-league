import { supabase } from "../../lib/supabase";

export default async function TestSupabasePage() {
  const { data: matches, error } = await supabase
    .from("matches")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-[#030711] p-10 text-white">
        <h1 className="text-3xl font-black text-red-400">
          Помилка Supabase
        </h1>

        <pre className="mt-6 whitespace-pre-wrap rounded-xl bg-red-500/10 p-6 text-red-200">
          {error.message}
        </pre>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#030711] p-10 text-white">
      <h1 className="text-4xl font-black">
        Supabase працює
      </h1>

      <p className="mt-3 text-white/50">
        Знайдено матчів: {matches?.length ?? 0}
      </p>

      <div className="mt-10 space-y-4">
        {matches?.map((match) => (
          <div
            key={match.id}
            className="rounded-2xl border border-white/10 bg-[#07101d] p-6"
          >
            <div className="text-sm text-blue-400">
              Сезон {match.season} • Дивізіон {match.division}
              {" • "}
              Тур {match.round}
            </div>

            <div className="mt-4 text-2xl font-black">
              {match.home_id}
              {" "}
              {match.home_goals}
              {" : "}
              {match.away_goals}
              {" "}
              {match.away_id}
            </div>

            <div className="mt-3 text-sm text-white/40">
              Статус: {match.status}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}