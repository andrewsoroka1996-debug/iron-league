import { season2AssociationsCup } from "../seasons/season-2-associations-cup";
import { season3 } from "../seasons/season-3";

type SeasonNumber = 1 | 2 | 3 | 4;

export type CompetitionAssociation = {
  id: string;
  name: string;
  players: readonly string[];
};

export function getCompetitionAssociations({
  season,
  competition,
}: {
  season: SeasonNumber;
  competition: string;
}): CompetitionAssociation[] {
  /*
    ========================================
    СЕЗОН 2
    ========================================
  */

  if (
    season === 2 &&
    competition === "associations-cup"
  ) {
    return Object.entries(
      season2AssociationsCup.associations
    ).map(([id, association]) => ({
      id,
      name: association.name,
      players: association.players,
    }));
  }

  /*
    ========================================
    СЕЗОН 3
    ========================================
  */

  if (
    season === 3 &&
    competition === "associations-cup"
  ) {
    return Object.entries(
      season3.associations
    ).map(([id, association]) => ({
      id,
      name: association.name,
      players: association.players,
    }));
  }

  return [];
}