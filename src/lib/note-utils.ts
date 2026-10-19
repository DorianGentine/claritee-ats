import type { JSONContent } from "@tiptap/core";

const DISPLAY_TITLE_MAX_LEN = 30;
const EXCERPT_MAX_LEN = 80;

/**
 * Vérifie la forme d'un nœud Tiptap (récursif) : `type` chaîne, `text` chaîne,
 * `content` tableau de nœuds. Un document mal formé envoyé à l'API ferait sinon
 * planter l'extraction de texte des listes de notes.
 */
/** Bien au-delà de toute note réelle ; borne la récursion (sinon débordement de pile → 500). */
const MAX_NODE_DEPTH = 50;

const isNoteNode = (value: unknown, depth = 0): value is JSONContent => {
  if (depth > MAX_NODE_DEPTH) return false;
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const { type, text, content } = value as Record<string, unknown>;
  if (typeof type !== "string") return false;
  if (text !== undefined && typeof text !== "string") return false;
  if (content === undefined) return true;
  return (
    Array.isArray(content) &&
    content.every((child) => isNoteNode(child, depth + 1))
  );
};

const isNoteDocument = (value: unknown): value is JSONContent =>
  isNoteNode(value) && value.type === "doc";

/**
 * Parse le contenu d'une note (document Tiptap sérialisé en JSON).
 * Renvoie null si le contenu est vide, invalide ou dans un autre format.
 */
export const parseNoteContent = (
  content: string | null | undefined
): JSONContent | null => {
  if (!content?.trim()) return null;
  try {
    const parsed: unknown = JSON.parse(content);
    return isNoteDocument(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

/** Texte d'un nœud : inline concaténé, blocs séparés par un espace. */
const getNodeText = (node: JSONContent): string => {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return " ";
  const children = Array.isArray(node.content) ? node.content : [];
  const hasInlineChildren = children.some(
    (child) => child.type === "text" || child.type === "hardBreak"
  );
  return children.map(getNodeText).join(hasInlineChildren ? "" : " ");
};

/** Texte brut de la note, espaces normalisés. */
export const getNoteText = (content: string): string => {
  const document = parseNoteContent(content);
  return document ? getNodeText(document).replace(/\s+/g, " ").trim() : "";
};

/** Vérifie si la note ne contient aucun texte significatif. */
export const isNoteContentEmpty = (content: string): boolean =>
  getNoteText(content) === "";

const truncate = (text: string, maxLength: number): string =>
  text.length > maxLength ? text.slice(0, maxLength) + "…" : text;

/**
 * Retourne un extrait du contenu (texte brut tronqué) pour l'affichage en liste.
 */
export const getNoteExcerpt = (content: string): string =>
  truncate(getNoteText(content), EXCERPT_MAX_LEN);

/**
 * Retourne le titre d'affichage d'une note : title si fourni, sinon 30 premiers caractères du contenu.
 */
export const getNoteDisplayTitle = (
  title: string | null | undefined,
  content: string
): string => {
  const trimmedTitle = title?.trim();
  if (trimmedTitle) return truncate(trimmedTitle, DISPLAY_TITLE_MAX_LEN);
  const text = getNoteText(content);
  return text ? truncate(text, DISPLAY_TITLE_MAX_LEN) : "Sans titre";
};
