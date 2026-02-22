export const formatDate = (d: Date | string): string => {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR", {
    month: "short",
    year: "numeric",
  });
};

/** Date complète (ex. 22 févr. 2026) pour notes, metadata, etc. */
export const formatDateLong = (d: Date | string): string => {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};
