import { players } from "../data/players";
import { supabase } from "../lib/supabase";

type Props = {
  season: 1 | 2 | 3 | 4;

  competition:
    | "division-1-cup"
    | "division-2-cup"
    | "division-3-cup"
    | "division-4-cup";
};

type Match = {
  id: string;

  stage: string | null;

  round: number | null;

  home_id: string;
  away_id: string;

  home_goals: number | null;
  away_goals: number | null;

  status: string;
};

const stages = [
  {
    id: "round-of-16",
    name: "1/8 фіналу",
    slots: 8,
  },
  {
    id: "quarterfinal",
    name: "1/4 фіналу",
    slots: 4,
  },
  {
    id: "semifinal",
    name: "1/2 фіналу",
    slots: 2,
  },
  {
    id: "final",
    name: "Фінал",
    slots: 1,
  },
] as const;

function getPlayerName(
  playerId: string | null
) {
  if (!playerId) {
    return "Ще не визначено";
  }

  return (
    players.find(
      (player) =>
        player.id === playerId
    )?.nickname ?? playerId
  );
}

function getWinner(
  match: Match | undefined
) {
  if (
    !match ||
    match.status !== "finished" ||
    match.home_goals === null ||
    match.away_goals === null ||
    match.home_goals ===
      match.away_goals
  ) {
    return null;
  }

  return match.home_goals >
    match.away_goals
    ? match.home_id
    : match.away_id;
}

export default async function DivisionCupPlayoffBracket({
  season,
  competition,
}: Props) {
  const {
    data,
    error,
  } = await supabase
    .from("matches")
    .select(
      `
        id,
        stage,
        round,
        home_id,
        away_id,
        home_goals,
        away_goals,
        status
      `
    )
    .eq(
      "season",
      season
    )
    .eq(
      "competition",
      competition
    )
    .in(
      "stage",
      stages.map(
        (stage) =>
          stage.id
      )
    );

  if (error) {
    return (
      <div className="mt-6 rounded-xl border border-red-400/20 bg-red-500/10 p-5 text-sm text-red-200">
        Не вдалося завантажити
        турнірну сітку.
      </div>
    );
  }

  const matches =
    (data ?? []) as Match[];

  /*
    Якщо жеребкування ще
    взагалі не почалося.
  */

  if (matches.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.025] p-5 text-sm font-bold text-blue-300">
        Сітка плей-оф буде
        доступна після жеребкування.
      </div>
    );
  }

  /*
    ========================================
    ПОШУК МАТЧУ ПО СТАДІЇ ТА СЛОТУ
    ========================================
  */

  function findMatch(
    stage: string,
    slot: number
  ) {
    return matches.find(
      (match) =>
        match.stage === stage &&
        match.round === slot
    );
  }

  /*
    ========================================
    ДЖЕРЕЛО УЧАСНИКА

    Якщо матч наступної стадії
    ще не створено, показуємо
    потенційного суперника.
    ========================================
  */

  function getSourceLabel(
    previousStage: string,
    previousSlot: number
  ) {
    const source =
      findMatch(
        previousStage,
        previousSlot
      );

    if (!source) {
      return `Переможець пари №${previousSlot}`;
    }

    const winner =
      getWinner(source);

    if (winner) {
      return getPlayerName(
        winner
      );
    }

    return `Переможець: ${getPlayerName(
      source.home_id
    )} — ${getPlayerName(
      source.away_id
    )}`;
  }

  return (
    <div className="mt-7 overflow-x-auto pb-2">
      <div className="grid min-w-[900px] grid-cols-4 gap-5">
        {stages.map(
          (
            stage,
            stageIndex
          ) => {
            const previousStage =
              stageIndex > 0
                ? stages[
                    stageIndex - 1
                  ]
                : null;

            return (
              <div
                key={stage.id}
                className="space-y-4"
              >
                {/* HEADER */}

                <div className="rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-center font-black text-blue-300">
                  {stage.name}
                </div>

                {/* SLOTS */}

                {Array.from(
                  {
                    length:
                      stage.slots,
                  },
                  (_, index) => {
                    const slot =
                      index + 1;

                    const match =
                      findMatch(
                        stage.id,
                        slot
                      );

                    /*
                      ==================================
                      МАТЧ УЖЕ СТВОРЕНИЙ
                      ==================================
                    */

                    if (match) {
                      const winner =
                        getWinner(
                          match
                        );

                      const finished =
                        match.status ===
                          "finished" &&
                        match.home_goals !==
                          null &&
                        match.away_goals !==
                          null;

                      return (
                        <div
                          key={
                            slot
                          }
                          className="overflow-hidden rounded-xl border border-white/10 bg-[#030711]"
                        >
                          <div className="border-b border-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/25">
                            Пара №
                            {slot}
                          </div>

                          <div
                            className={`flex items-center justify-between gap-2 border-b border-white/5 px-4 py-3 ${
                              winner ===
                              match.home_id
                                ? "bg-blue-500/10"
                                : ""
                            }`}
                          >
                            <span className="truncate text-sm font-bold">
                              {getPlayerName(
                                match.home_id
                              )}
                            </span>

                            <span className="font-black">
                              {finished
                                ? match.home_goals
                                : "—"}
                            </span>
                          </div>

                          <div
                            className={`flex items-center justify-between gap-2 px-4 py-3 ${
                              winner ===
                              match.away_id
                                ? "bg-blue-500/10"
                                : ""
                            }`}
                          >
                            <span className="truncate text-sm font-bold">
                              {getPlayerName(
                                match.away_id
                              )}
                            </span>

                            <span className="font-black">
                              {finished
                                ? match.away_goals
                                : "—"}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    /*
                      ==================================
                      1/8 ЩЕ НЕ СФОРМОВАНА
                      ==================================
                    */

                    if (
                      !previousStage
                    ) {
                      return (
                        <div
                          key={
                            slot
                          }
                          className="rounded-xl border border-dashed border-white/10 bg-white/[0.015] p-4"
                        >
                          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/20">
                            Пара №
                            {slot}
                          </div>

                          <div className="mt-3 text-sm text-white/25">
                            Ще не
                            визначена
                          </div>
                        </div>
                      );
                    }

                    /*
                      ==================================
                      ПОТЕНЦІЙНІ УЧАСНИКИ
                      ==================================

                      №1 + №2 → №1
                      №3 + №4 → №2
                    */

                    const sourceA =
                      slot * 2 - 1;

                    const sourceB =
                      slot * 2;

                    return (
                      <div
                        key={
                          slot
                        }
                        className="overflow-hidden rounded-xl border border-dashed border-white/10 bg-white/[0.015]"
                      >
                        <div className="border-b border-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/20">
                          {stage.id ===
                          "final"
                            ? "Фінал"
                            : `Пара №${slot}`}
                        </div>

                        <div className="border-b border-white/5 px-4 py-3 text-sm font-bold text-white/45">
                          {getSourceLabel(
                            previousStage.id,
                            sourceA
                          )}
                        </div>

                        <div className="px-4 py-3 text-sm font-bold text-white/45">
                          {getSourceLabel(
                            previousStage.id,
                            sourceB
                          )}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}