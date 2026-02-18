export const formatDate = (d: Date | string): string => {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR", {
    month: "short",
    year: "numeric",
  });
};
