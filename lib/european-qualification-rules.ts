/**
 * Правила кваліфікації з груп єврокубків (сезон 3 і наступні).
 * Чисті функції: не звертаються до БД та не змінюють результати матчів.
 */

export type EuropeanCompetition =
  | "champions-league"
  | "europa-league"
  | "conference-league";

export type GroupPlace = {
  player_id: string;
  source_competition: EuropeanCompetition;
  group_name: string;
  position: number;
  points: number;
  goal_difference: number;
  goals_for: number;
};

export function filterZeroPointGroupPlaces(
  places: readonly GroupPlace[],
  enforceRule: boolean
): { eligible: GroupPlace[]; excluded: GroupPlace[] } {
  if (!enforceRule) {
    return { eligible: [...places], excluded: [] };
  }

  return {
    eligible: places.filter((place) => place.points > 0),
    excluded: places.filter((place) => place.points <= 0),
  };
}

/**
 * Порівняння 4-х місць різних груп ЛЧ:
 * 1) очки, 2) різниця голів, 3) забиті голи.
 * Особистих зустрічей між гравцями різних груп немає.
 */
export function compareFourthPlaces(a: GroupPlace, b: GroupPlace): number {
  return (
    b.points - a.points ||
    b.goal_difference - a.goal_difference ||
    b.goals_for - a.goals_for
  );
}

export type FourthPlaceSelection = {
  selected: GroupPlace[];
  missing: number;
  tied_at_cutoff: GroupPlace[];
};

/**
 * Додаткові путівки з ЛЧ до ЛЄ дозволені лише замість третіх
 * місць ЛЧ з нулем очок. Якщо є невирішена рівність за всіма
 * затвердженими показниками, не вибираємо довільно за назвою/ID.
 */
export function selectBestFourthPlaces({
  vacantThirdPlaces,
  candidates,
  alreadyQualifiedIds = [],
}: {
  vacantThirdPlaces: number;
  candidates: readonly GroupPlace[];
  alreadyQualifiedIds?: readonly string[];
}): FourthPlaceSelection {
  if (!Number.isInteger(vacantThirdPlaces) || vacantThirdPlaces <= 0) {
    return { selected: [], missing: 0, tied_at_cutoff: [] };
  }

  const usedIds = new Set(alreadyQualifiedIds);
  const seenIds = new Set<string>();
  const eligible = candidates
    .filter((candidate) => {
      if (
        candidate.source_competition !== "champions-league" ||
        candidate.position !== 4 ||
        candidate.points <= 0 ||
        usedIds.has(candidate.player_id) ||
        seenIds.has(candidate.player_id)
      ) {
        return false;
      }
      seenIds.add(candidate.player_id);
      return true;
    })
    .sort(compareFourthPlaces);

  const count = Math.min(vacantThirdPlaces, eligible.length);
  const lastSelected = eligible[count - 1];
  const firstNotSelected = eligible[count];

  if (
    lastSelected &&
    firstNotSelected &&
    compareFourthPlaces(lastSelected, firstNotSelected) === 0
  ) {
    const tied = eligible.filter(
      (place) => compareFourthPlaces(place, lastSelected) === 0
    );
    return {
      selected: [],
      missing: vacantThirdPlaces,
      tied_at_cutoff: tied,
    };
  }

  return {
    selected: eligible.slice(0, count),
    missing: vacantThirdPlaces - count,
    tied_at_cutoff: [],
  };
}
