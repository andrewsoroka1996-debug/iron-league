import type {
  AssociationLeagueResult,
  AssociationLeagueRow,
} from "./association-league";

/*
  Pure, deterministic checks. No Supabase access here.
  Completing the Association Cup does NOT finalize the League.
*/

export type AssociationFinalizationAssessment = {
  ready: boolean;
  blockers: string[];
  champion: AssociationLeagueRow | null;
};

export function assessAssociationLeagueFinalization(
  league: AssociationLeagueResult,
  unresolvedMatches: number,
  recordedMatches: number
): AssociationFinalizationAssessment {
  const blockers: string[] = [];

  if (!league.cupComplete) {
    blockers.push("Кубок асоціацій ще не завершено для всіх учасників.");
  }

  if (league.rows.length !== 8) {
    blockers.push(`Очікується 8 асоціацій, знайдено ${league.rows.length}.`);
  }

  if (recordedMatches === 0) {
    blockers.push("У сезоні немає жодного зареєстрованого матчу коефіцієнтних турнірів.");
  }

  if (unresolvedMatches > 0) {
    blockers.push(`Є незавершені матчі коефіцієнтних турнірів: ${unresolvedMatches}.`);
  }

  const allPlayerIds: string[] = [];
  for (const row of league.rows) {
    if (row.members.length !== 6) {
      blockers.push(`Асоціація ${row.associationName}: потрібен склад із 6 гравців.`);
    }
    allPlayerIds.push(...row.members.map((m) => m.playerId));

    if (
      row.leaguePlace === null ||
      row.leaguePoints === null ||
      !Number.isFinite(row.leaguePoints)
    ) {
      blockers.push(`Асоціація ${row.associationName}: ще немає коректного місця/очок.`);
    }
  }

  if (new Set(allPlayerIds).size !== allPlayerIds.length) {
    blockers.push("У складах асоціацій є дублікати playerId.");
  }

  const winners = league.rows.filter((row) => row.leaguePlace === 1);
  if (winners.length !== 1) {
    blockers.push(
      winners.length === 0
        ? "Переможця Ліги асоціацій не визначено."
        : "Перше місце розділяють кілька асоціацій. Потрібне рішення за регламентом."
    );
  }

  return {
    ready: blockers.length === 0,
    blockers,
    champion: winners.length === 1 ? winners[0] : null,
  };
}
