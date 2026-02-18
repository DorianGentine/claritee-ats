/** Noms des mois en français pour les sélecteurs date */
export const MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
] as const;

const currentYear = new Date().getFullYear();
/** Plage d'années pour les sélecteurs (50 ans avant → année courante + 1) */
export const YEARS = Array.from(
  { length: 52 },
  (_, i) => currentYear - 50 + i
);
