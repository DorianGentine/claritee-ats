/**
 * Palette de couleurs pour les tags (design-system §2).
 * Assignation : colorIndex = hash(tagName) % 8.
 */
export const TAG_PALETTE: readonly [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
] = [
  "#D4A5A5", // Terracotta clair
  "#8FA89E", // Vert sauge clair
  "#C9B896", // Beige chaud
  "#9B8BA8", // Lavande
  "#E8C4A8", // Pêche
  "#7A9B8E", // Teal doux
  "#A67B5B", // Terre
  "#8B8478", // Gris chaud
];

const hashString = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h = h & h;
  }
  return Math.abs(h);
};

export const getTagColor = (tagName: string): string => {
  const index = hashString(tagName.trim()) % TAG_PALETTE.length;
  return TAG_PALETTE[index];
};
