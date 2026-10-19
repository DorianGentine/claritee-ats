/**
 * Brouillon de la nouvelle note du widget de notes rapides, conservé dans le navigateur
 * jusqu'à sa création (fermeture du widget) : il survit à un rechargement ou à la
 * fermeture de l'onglet. Clé par utilisateur ; repli en mémoire si le stockage local
 * est indisponible (navigation privée, stockage bloqué).
 */
const DRAFT_KEY_PREFIX = "claritee:note-draft:";

const memoryDrafts = new Map<string, string>();

const getDraftKey = (userId: string) => `${DRAFT_KEY_PREFIX}${userId}`;

export const readNoteDraft = (userId: string): string | null => {
  const key = getDraftKey(userId);
  try {
    return window.localStorage.getItem(key) ?? memoryDrafts.get(key) ?? null;
  } catch {
    return memoryDrafts.get(key) ?? null;
  }
};

export const writeNoteDraft = (userId: string, content: string): void => {
  const key = getDraftKey(userId);
  try {
    window.localStorage.setItem(key, content);
    memoryDrafts.delete(key);
  } catch {
    // Stockage indisponible ou plein : repli en mémoire pour la session
    memoryDrafts.set(key, content);
  }
};

export const clearNoteDraft = (userId: string): void => {
  const key = getDraftKey(userId);
  memoryDrafts.delete(key);
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Stockage indisponible : le repli en mémoire est déjà vidé
  }
};

/** Supprime tous les brouillons de ce navigateur (à la déconnexion : poste partagé). */
export const clearAllNoteDrafts = (): void => {
  memoryDrafts.clear();
  try {
    const draftKeys = Object.keys(window.localStorage).filter((key) =>
      key.startsWith(DRAFT_KEY_PREFIX)
    );
    for (const key of draftKeys) window.localStorage.removeItem(key);
  } catch {
    // Stockage indisponible : seul le repli en mémoire existait
  }
};
