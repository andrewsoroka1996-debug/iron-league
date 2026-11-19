/**
 * Administrative completion of a division fixture for final awards.
 * A closed_unplayed match closes the calendar without contributing
 * a result, goals, points or a played match to standings.
 *
 * This helper must NOT replace the strict `isFinished` predicate
 * used to decide cup-final winners and finalists.
 */
export type DivisionCalendarMatch = {
  status: string | null;
  home_goals: number | null;
  away_goals: number | null;
};

export function isDivisionCalendarMatchComplete(match: DivisionCalendarMatch): boolean {
  if (match.status === "finished") {
    return match.home_goals !== null && match.away_goals !== null;
  }

  return match.status === "closed_unplayed" &&
    match.home_goals === null &&
    match.away_goals === null;
}
