export type MatchStatusInput = {
  status: string;

  home_goals: number | null;
  away_goals: number | null;
};

/*
  Матч зіграно з результатом.
  Враховується у статистиці.
*/
export function hasMatchResult(
  match: MatchStatusInput
): boolean {
  return (
    match.status === "finished" &&
    match.home_goals !== null &&
    match.away_goals !== null
  );
}

/*
  Матч закрито адміністративно.
  Рахунку немає.
  Очки та голи не нараховуються.
*/
export function isClosedUnplayed(
  match: MatchStatusInput
): boolean {
  return (
    match.status === "closed_unplayed" &&
    match.home_goals === null &&
    match.away_goals === null
  );
}

/*
  Чи більше матч не блокує
  завершення відповідного етапу.

  ВАЖЛИВО:
  Це НЕ визначає переможця плейоф.
*/
export function countsAsCompletedMatch(
  match: MatchStatusInput
): boolean {
  return (
    hasMatchResult(match) ||
    isClosedUnplayed(match)
  );
}