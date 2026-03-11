import { toast } from "sonner"
import type { CandidatureStatus } from "@prisma/client"
import { api } from "@/lib/trpc/client"

type Options<T> = {
  /** Annule les requêtes en cours pour éviter les race conditions */
  cancelQuery: () => Promise<void>
  /** Capture l'état actuel du cache (pour le revert en cas d'erreur) */
  getSnapshot: () => T | undefined
  /** Applique la mise à jour optimiste dans le cache */
  applyOptimistic: (candidatureId: string, status: CandidatureStatus) => void
  /** Restaure le snapshot en cas d'erreur */
  revertSnapshot: (snapshot: T) => void
  /** Invalide les caches pertinents après la mutation */
  invalidate: () => void
}

/**
 * Hook générique pour la mise à jour optimiste du statut d'une candidature.
 * Le pattern onMutate / onError / onSettled est partagé ; les opérations
 * sur le cache sont déléguées aux callbacks pour gérer les deux contextes
 * (fiche offre et fiche candidat).
 */
export const useCandidatureUpdateStatus = <T>({
  cancelQuery,
  getSnapshot,
  applyOptimistic,
  revertSnapshot,
  invalidate,
}: Options<T>) =>
  api.candidature.updateStatus.useMutation({
    networkMode: "always",
    onMutate: async ({ candidatureId, status }) => {
      await cancelQuery()
      const snapshot = getSnapshot()
      applyOptimistic(candidatureId, status)
      return { snapshot }
    },
    onError: (_err, _input, context) => {
      const snapshot = context?.snapshot
      if (snapshot !== undefined) {
        revertSnapshot(snapshot)
      }
      toast.error("Une erreur est survenue.")
    },
    onSettled: () => {
      invalidate()
    },
  })
