/** Pure, database-independent winner resolution for one-leg European finals. */
export type EuropeanFinalRecord = {
  competition: string;
  home_id: string;
  away_id: string;
  home_goals: number | null;
  away_goals: number | null;
  status: string;
  is_tiebreak: boolean | null;
};

export type EuropeanFinalResolution =
  | { winnerId: string; error: null }
  | { winnerId: null; error: string };

export function determineEuropeanFinalWinner(
  matches: readonly EuropeanFinalRecord[],
  competition: "champions-league" | "europa-league"
): EuropeanFinalResolution {
  const label = competition === "champions-league" ? "Ліги чемпіонів" : "Ліги Європи";
  const finals = matches.filter((m) => m.competition === competition);
  const regular = finals.filter((m) => !m.is_tiebreak);
  const deciders = finals.filter((m) => m.is_tiebreak);

  if (regular.length !== 1 || deciders.length > 1) {
    return {
      winnerId: null,
      error: regular.length === 0
        ? `Фінал ${label} ще не створено.`
        : `Неоднозначна кількість фінальних матчів ${label}.`,
    };
  }

  const primary = regular[0];
  const complete = (m: EuropeanFinalRecord) =>
    m.status === "finished" &&
    Number.isInteger(m.home_goals) && m.home_goals! >= 0 &&
    Number.isInteger(m.away_goals) && m.away_goals! >= 0 &&
    m.home_id !== m.away_id;

  if (!complete(primary)) {
    return { winnerId: null, error: `Фінал ${label} ще не має завершеного результату.` };
  }

  if (primary.home_goals !== primary.away_goals) {
    if (deciders.length > 0) {
      return { winnerId: null, error: `Суперечливі фінальні дані ${label}: зайвий додатковий матч.` };
    }
    return {
      winnerId: primary.home_goals! > primary.away_goals! ? primary.home_id : primary.away_id,
      error: null,
    };
  }

  if (deciders.length !== 1 || !complete(deciders[0])) {
    return { winnerId: null, error: `Нічия у фіналі ${label}: немає завершеного вирішального матчу.` };
  }

  const decider = deciders[0];
  const samePair = [decider.home_id, decider.away_id].sort().join("|") ===
    [primary.home_id, primary.away_id].sort().join("|");
  if (!samePair || decider.home_goals === decider.away_goals) {
    return { winnerId: null, error: `Неможливо однозначно встановити переможця ${label}.` };
  }
  return {
    winnerId: decider.home_goals! > decider.away_goals! ? decider.home_id : decider.away_id,
    error: null,
  };
}
