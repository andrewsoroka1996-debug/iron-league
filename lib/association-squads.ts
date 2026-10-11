import "server-only";

import {
  getCompetitionAssociations,
  type CompetitionAssociation,
} from "../data/competitions/get-competition-associations";

import {
  associationCatalog,
} from "../data/associations/catalog";

import {
  getSeasonAssociationRanks,
} from "./association-ranks";

/*
  ========================================
  СКЛАДИ АСОЦІАЦІЙ
  ========================================

  Сезони 1–3:
  використовуємо старі
  історичні файли.

  Сезон 4+:
  склад автоматично
  будується з Supabase:

  association_seed_ranks
        ↓
  association_id
        ↓
  R1–R6
        ↓
  готова Асоціація
*/

export async function getSeasonAssociationSquads(
  season: number
):
  Promise<CompetitionAssociation[]> {

  /*
    ========================================
    ІСТОРИЧНІ СЕЗОНИ
    ========================================
  */

  if (
    season <= 3
  ) {
    return getCompetitionAssociations({
      season:
        season as 1 | 2 | 3,

      competition:
        "associations-cup",
    });
  }

  /*
    ========================================
    НОВІ СЕЗОНИ
    ========================================
  */

  const ranks =
    await getSeasonAssociationRanks(
      season
    );

  /*
    Якщо ранги нового сезону
    ще не зафіксовані —
    показуємо 8 Асоціацій
    з порожніми складами.
  */

  if (
    ranks.length === 0
  ) {
    return associationCatalog.map(
      (association) => ({
        id:
          association.id,

        name:
          association.name,

        players: [],
      })
    );
  }

  /*
    ========================================
    ГРУПУЄМО ПО ASSOCIATION_ID
    ========================================
  */

  return associationCatalog.map(
    (association) => {

      const members =
        ranks
          .filter(
            (row) =>
              row.associationId ===
              association.id
          )

          /*
            Завжди показуємо:

            R1
            R2
            R3
            R4
            R5
            R6
          */

          .sort(
            (a, b) =>
              a.rank -
              b.rank
          )

          .map(
            (row) =>
              row.playerId
          );

      return {
        id:
          association.id,

        name:
          association.name,

        players:
          members,
      };
    }
  );
}