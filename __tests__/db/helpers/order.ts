/**
 * Ids triés comme les listes de l'app : `createdAt` desc puis `id` desc en
 * départage (lignes créées à la même milliseconde). Les UUID en minuscules se
 * comparent comme en Postgres.
 */
export const idsNewestFirst = (
  rows: { id: string; createdAt: Date }[]
): string[] =>
  [...rows]
    .sort(
      (first, second) =>
        second.createdAt.getTime() - first.createdAt.getTime() ||
        (second.id > first.id ? 1 : second.id < first.id ? -1 : 0)
    )
    .map((row) => row.id)
