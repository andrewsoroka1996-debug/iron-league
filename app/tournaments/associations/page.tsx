"use client";

import { useMemo, useState } from "react";

import { players } from "../../../data/players";

import { season2AssociationsCup } from "../../../data/seasons/season-2-associations-cup";
import { season3 } from "../../../data/seasons/season-3";

import AssociationCupPlayoffBracket from "../../../components/AssociationCupPlayoffBracket";

type SeasonNumber = 2 | 3;

type Association = {
  name: string;
  players: readonly string[];
};

type AssociationsMap = Record<
  string,
  Association
>;

function getAssociationsBySeason(
  season: SeasonNumber
): AssociationsMap {
  if (season === 2) {
    return season2AssociationsCup.associations;
  }

  return season3.associations;
}

function getPlayerName(
  playerId: string
) {
  return (
    players.find(
      (player) =>
        player.id === playerId
    )?.nickname ?? playerId
  );
}

export default function AssociationsPage() {
  const [season, setSeason] =
    useState<SeasonNumber>(3);

  const associations =
    useMemo(
      () =>
        getAssociationsBySeason(
          season
        ),
      [season]
    );

  const associationEntries =
    Object.entries(
      associations
    ) as [
      string,
      Association,
    ][];

  return (
    <main className="min-h-screen bg-[#030711] text-white">
      {/* HEADER */}

      <header className="border-b border-white/10 bg-[#030711]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <a
            href="/"
            className="font-black tracking-[0.18em]"
          >
            IRON LEAGUE
          </a>

          <div className="flex items-center gap-5">
            <a
              href="/"
              className="text-sm font-bold text-white/40 transition hover:text-white"
            >
              Головна
            </a>

            <a
              href="#cup"
              className="text-sm font-bold text-blue-300"
            >
              Кубок асоціацій
            </a>
          </div>
        </div>
      </header>

      {/* HERO */}

      <section className="border-b border-white/10 bg-gradient-to-b from-blue-500/10 to-transparent">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Iron League
          </div>

          <h1 className="mt-3 text-5xl font-black">
            Кубок асоціацій
          </h1>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-white/50">
            Командний турнір
            асоціацій Iron League.
            Кожна асоціація
            складається з шести
            гравців.
          </p>

          {/* SEASON */}

          <div className="mt-8 max-w-xs">
            <label className="text-sm font-bold text-white/60">
              Сезон
            </label>

            <select
              value={season}
              onChange={(event) =>
                setSeason(
                  Number(
                    event.target.value
                  ) as SeasonNumber
                )
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#07101d] px-4 py-3"
            >
              <option value={2}>
                Сезон 2
              </option>

              <option value={3}>
                Сезон 3
              </option>
            </select>
          </div>
        </div>
      </section>

      {/* ASSOCIATIONS */}

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Сезон {season}
          </div>

          <h2 className="mt-3 text-4xl font-black">
            Асоціації
          </h2>

          <p className="mt-3 text-white/40">
            Склад асоціацій
            відображається окремо
            для кожного сезону.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {associationEntries.map(
            ([
              associationId,
              association,
            ]) => (
              <div
                key={
                  associationId
                }
                className="overflow-hidden rounded-3xl border border-white/10 bg-[#07101d]"
              >
                {/* CARD HEADER */}

                <div className="border-b border-white/10 bg-blue-500/10 p-6">
                  <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
                    {associationId}
                  </div>

                  <div className="mt-2 text-2xl font-black">
                    {
                      association.name
                    }
                  </div>

                  <div className="mt-2 text-sm text-white/35">
                    {
                      association
                        .players
                        .length
                    }{" "}
                    гравців
                  </div>
                </div>

                {/* PLAYERS */}

                <div className="space-y-2 p-5">
                  {association.players.map(
                    (
                      playerId,
                      index
                    ) => (
                      <div
                        key={
                          playerId
                        }
                        className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-xs font-black text-blue-300">
                          {index +
                            1}
                        </div>

                        <div className="min-w-0 font-bold">
                          {getPlayerName(
                            playerId
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )
          )}
        </div>
      </section>

      {/* FORMAT */}

      <section
        id="cup"
        className="border-y border-white/10 bg-white/[0.02]"
      >
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Формат
          </div>

          <h2 className="mt-3 text-4xl font-black">
            Як визначається
            переможець
          </h2>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-[#07101d] p-7">
              <div className="text-4xl font-black text-blue-400">
                6×6
              </div>

              <div className="mt-4 text-xl font-black">
                Шість матчів
              </div>

              <p className="mt-3 leading-7 text-white/40">
                Кожен із шести
                гравців однієї
                асоціації проводить
                один матч проти
                гравця іншої
                асоціації.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#07101d] p-7">
              <div className="text-4xl font-black text-blue-400">
                3–1–0
              </div>

              <div className="mt-4 text-xl font-black">
                Система очок
              </div>

              <p className="mt-3 leading-7 text-white/40">
                Перемога — 3 очки,
                нічия — 1,
                поразка — 0.
                Перемагає асоціація
                з більшою сумою
                очок.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#07101d] p-7">
              <div className="text-4xl font-black text-blue-400">
                7
              </div>

              <div className="mt-4 text-xl font-black">
                Вирішальний матч
              </div>

              <p className="mt-3 leading-7 text-white/40">
                При рівності очок
                враховується
                загальна різниця
                голів. Якщо й вона
                однакова —
                проводиться окрема
                сьома гра.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PLAYOFF BRACKET */}

<section className="mx-auto max-w-7xl px-6 py-16">
  <div className="mb-8">
    <div className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
      Кубок асоціацій
    </div>

    <h2 className="mt-3 text-4xl font-black">
      Турнірна сітка
    </h2>

    <p className="mt-3 max-w-2xl leading-7 text-white/40">
      Шлях асоціацій від
      чвертьфіналу до фіналу.
      Сітка оновлюється
      автоматично після
      внесення результатів.
    </p>
  </div>

  <AssociationCupPlayoffBracket
    season={season}
  />
</section>

      {/* FOOTER */}

      <footer className="border-t border-white/10 bg-[#02050b]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-10">
          <div>
            <div className="font-black tracking-[0.16em]">
              IRON LEAGUE
            </div>

            <div className="mt-1 text-xs text-white/30">
              Більше ніж гра
            </div>
          </div>

          <div className="text-sm text-white/30">
            © 2026 Iron League
          </div>
        </div>
      </footer>
    </main>
  );
}