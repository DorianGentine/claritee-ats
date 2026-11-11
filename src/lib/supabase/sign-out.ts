import { createClient } from "@/lib/supabase/client";
import { clearAllNoteDrafts } from "@/lib/note-draft";

/**
 * Déconnecte le navigateur. Les brouillons de notes rapides sont effacés pour ne
 * pas rester sur un poste partagé. `local` : session effacée côté navigateur
 * seulement, pour un compte déjà supprimé côté serveur.
 */
export const signOutBrowser = async (scope: "global" | "local" = "global") => {
  clearAllNoteDrafts();
  const { error } = await createClient().auth.signOut({ scope });
  if (error) {
    console.warn("[signOutBrowser] Sign out failed:", error);
  }
};
