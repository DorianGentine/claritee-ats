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

/** SIREN 9 chiffres → "123 456 789" pour affichage */
export const formatSiren = (siren: string): string => {
  if (!/^\d{9}$/.test(siren)) return siren;
  return siren.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3");
};
