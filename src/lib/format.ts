export const formatDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("fr-FR", {
    month: "short",
    year: "numeric",
  });
