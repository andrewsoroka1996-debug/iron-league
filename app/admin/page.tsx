"use client";

import { useMemo, useState } from "react";
import { players } from "../../data/players";
import { divisionSchedule } from "../../data/division-schedule";

type SeasonNumber = 1 | 2 | 3 | 4;
type DivisionNumber = 1 | 2 | 3 | 4;

export default function AdminPage() {
  const [password, setPassword] = useState("");

  const [season, setSeason] =
    useState<SeasonNumber>(3);

  const [division, setDivision] =
    useState<DivisionNumber>(1);

  const [round, setRound] = useState(1);

  const [matchId, setMatchId] =
    useState("");

  const [homeGoals, setHomeGoals] =
    useState("");

  const [awayGoals, setAwayGoals] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const rounds =
    divisionSchedule[season][division];

  const selectedRound =
    rounds.find(
      (item) => item.round === round
    );

  const matches =
    selectedRound?.matches ?? [];

  const selectedMatch = useMemo(
    () =>
      matches.find(
        (match) => match.id === matchId
      ),
    [matches, matchId]
  );

  function getNickname(playerId: string) {
    return (
      players.find(
        (player) => player.id === playerId
      )?.nickname ?? playerId
    );
  }

  function resetSelection() {
    setRound(1);
    setMatchId("");
    setHomeGoals("");
    setAwayGoals("");
    setMessage("");
  }

  async function saveResult(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (!password) {
      setMessage(
        "Введіть пароль адміністратора"
      );
      return;
    }

    if (!selectedMatch) {
      setMessage("Оберіть матч");
      return;
    }

    if (
      homeGoals === "" ||
      awayGoals === ""
    ) {
      setMessage("Введіть рахунок");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        "/api/admin/result",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            password,
            season,
            division,
            round,

            home_id:
              selectedMatch.home,

            away_id:
              selectedMatch.away,

            home_goals:
              Number(homeGoals),

            away_goals:
              Number(awayGoals),
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result.error ??
            "Не вдалося зберегти результат"
        );
        return;
      }

      setMessage(
        "✅ Результат успішно збережено"
      );

      setHomeGoals("");
      setAwayGoals("");
    } catch {
      setMessage(
        "Помилка з'єднання із сервером"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#030711] text-white">
      {/* HEADER */}
      <header className="border-b border-white/10 bg-[#030711]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div>
            <div className="font-black tracking-[0.18em]">
              IRON LEAGUE
            </div>

            <div className="mt-1 text-xs text-white/40">
              Адмін-панель
            </div>
          </div>

          <a
            href="/"
            className="text-sm font-bold text-blue-300"
          >
            ← На сайт
          </a>
        </div>
      </header>

      {/* CONTENT */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
          Match Control
        </div>

        <h1 className="mt-3 text-4xl font-black">
          Внести результат
        </h1>

        <p className="mt-4 text-white/40">
          Обери сезон, дивізіон, тур і матч.
          Після збереження результат буде записано
          в Supabase.
        </p>

        <form
          onSubmit={saveResult}
          className="mt-10 space-y-6 rounded-3xl border border-white/10 bg-[#07101d] p-7"
        >
          {/* PASSWORD */}
          <div>
            <label className="text-sm font-bold text-white/60">
              Пароль адміністратора
            </label>

            <p className="mt-2 text-xs leading-5 text-white/30">
              Тут вводиш справжній пароль,
              який записаний у .env.local після
              ADMIN_PASSWORD=
            </p>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              placeholder="Пароль адміністратора"
              className="mt-3 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3 outline-none focus:border-blue-400/50"
            />
          </div>

          {/* SEASON */}
          <div>
            <label className="text-sm font-bold text-white/60">
              Сезон
            </label>

            <select
              value={season}
              onChange={(event) => {
                setSeason(
                  Number(
                    event.target.value
                  ) as SeasonNumber
                );

                resetSelection();
              }}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
            >
              <option value={1}>
                Сезон 1
              </option>

              <option value={2}>
                Сезон 2
              </option>

              <option value={3}>
                Сезон 3
              </option>

              <option value={4}>
                Сезон 4
              </option>
            </select>
          </div>

          {/* DIVISION */}
          <div>
            <label className="text-sm font-bold text-white/60">
              Дивізіон
            </label>

            <select
              value={division}
              onChange={(event) => {
                setDivision(
                  Number(
                    event.target.value
                  ) as DivisionNumber
                );

                resetSelection();
              }}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
            >
              <option value={1}>
                1 Дивізіон
              </option>

              <option value={2}>
                2 Дивізіон
              </option>

              <option value={3}>
                3 Дивізіон
              </option>

              <option value={4}>
                4 Дивізіон
              </option>
            </select>
          </div>

          {/* ROUND */}
          <div>
            <label className="text-sm font-bold text-white/60">
              Тур
            </label>

            {rounds.length === 0 ? (
              <div className="mt-2 rounded-xl border border-yellow-400/20 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
                Для цього дивізіону календар
                ще не сформовано.
              </div>
            ) : (
              <select
                value={round}
                onChange={(event) => {
                  setRound(
                    Number(
                      event.target.value
                    )
                  );

                  setMatchId("");
                  setHomeGoals("");
                  setAwayGoals("");
                  setMessage("");
                }}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
              >
                {rounds.map(
                  (item) => (
                    <option
                      key={item.round}
                      value={item.round}
                    >
                      Тур {item.round}
                    </option>
                  )
                )}
              </select>
            )}
          </div>

          {/* MATCH */}
          {rounds.length > 0 && (
            <div>
              <label className="text-sm font-bold text-white/60">
                Матч
              </label>

              <select
                value={matchId}
                onChange={(event) => {
                  setMatchId(
                    event.target.value
                  );

                  setHomeGoals("");
                  setAwayGoals("");
                  setMessage("");
                }}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"
              >
                <option value="">
                  Оберіть матч
                </option>

                {matches.map(
                  (match) => (
                    <option
                      key={match.id}
                      value={match.id}
                    >
                      {getNickname(
                        match.home
                      )}
                      {" — "}
                      {getNickname(
                        match.away
                      )}
                    </option>
                  )
                )}
              </select>
            </div>
          )}

          {/* SCORE */}
          {selectedMatch && (
            <div>
              <div className="mb-5 text-center text-xl font-black">
                {getNickname(
                  selectedMatch.home
                )}
                {" — "}
                {getNickname(
                  selectedMatch.away
                )}
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                <div>
                  <div className="mb-2 text-center text-xs text-white/40">
                    {getNickname(
                      selectedMatch.home
                    )}
                  </div>

                  <input
                    type="number"
                    min="0"
                    value={homeGoals}
                    onChange={(event) =>
                      setHomeGoals(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-4 text-center text-2xl font-black"
                  />
                </div>

                <div className="mt-6 font-black text-white/30">
                  :
                </div>

                <div>
                  <div className="mb-2 text-center text-xs text-white/40">
                    {getNickname(
                      selectedMatch.away
                    )}
                  </div>

                  <input
                    type="number"
                    min="0"
                    value={awayGoals}
                    onChange={(event) =>
                      setAwayGoals(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-4 text-center text-2xl font-black"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SAVE */}
          <button
            type="submit"
            disabled={
              loading ||
              !selectedMatch
            }
            className="w-full rounded-xl bg-blue-500 px-6 py-4 font-black transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading
              ? "Збереження..."
              : "Зберегти результат"}
          </button>

          {/* MESSAGE */}
          {message && (
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm">
              {message}
            </div>
          )}
        </form>
      </section>
    </main>
  );
}