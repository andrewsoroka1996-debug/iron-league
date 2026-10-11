import {
  season3,
} from "../seasons/season-3";

/*
  ========================================
  ПОСТІЙНІ АСОЦІАЦІЇ IRON LEAGUE
  ========================================

  Назви та ID Асоціацій
  між сезонами НЕ змінюються.

  Змінюється тільки склад гравців.

  Джерелом назв та ID беремо
  вже правильний Сезон 3.
*/

export type AssociationCatalogItem = {
  id: string;

  name: string;
};

export const associationCatalog:
  readonly AssociationCatalogItem[] =
  Object.entries(
    season3.associations
  ).map(
    ([
      id,
      association,
    ]) => ({
      id,

      name:
        association.name,
    })
  );

/*
  ========================================
  ШВИДКИЙ ПОШУК
  ========================================
*/

export function getAssociationCatalogItem(
  associationId: string
) {
  return (
    associationCatalog.find(
      (association) =>
        association.id ===
        associationId
    ) ?? null
  );
}

export function getAssociationName(
  associationId: string
) {
  return (
    getAssociationCatalogItem(
      associationId
    )?.name ??
    associationId
  );
}

/*
  ========================================
  ID ВСІХ АСОЦІАЦІЙ
  ========================================
*/

export const associationIds =
  associationCatalog.map(
    (association) =>
      association.id
  );