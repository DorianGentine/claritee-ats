"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { api } from "@/lib/trpc/client"
import { NotesSection } from "@/components/shared/NotesSection"

type Props = { offerId: string }

export const OfferNotesSection = ({ offerId }: Props) => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const utils = api.useUtils()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id ?? null)
    })
  }, [])

  const notesQuery = api.note.listByOffer.useQuery({ offerId })

  const createMutation = api.note.create.useMutation({
    onSuccess: () => {
      toast.success("Note ajoutée.")
      void utils.note.listByOffer.invalidate({ offerId })
    },
    onError: () => toast.error("Impossible d'ajouter la note."),
  })
  const updateMutation = api.note.update.useMutation({
    onSuccess: () => {
      toast.success("Note mise à jour.")
      void utils.note.listByOffer.invalidate({ offerId })
    },
    onError: () => toast.error("Impossible de modifier la note."),
  })
  const deleteMutation = api.note.delete.useMutation({
    onSuccess: () => {
      toast.success("Note supprimée.")
      void utils.note.listByOffer.invalidate({ offerId })
    },
    onError: () => toast.error("Impossible de supprimer la note."),
  })

  return (
    <NotesSection
      notes={notesQuery.data ?? []}
      isLoading={notesQuery.isLoading}
      currentUserId={currentUserId}
      onCreateNote={(content, onSuccess) =>
        createMutation.mutate({ offerId, content }, { onSuccess })
      }
      onUpdateNote={(id, content, onSuccess) =>
        updateMutation.mutate({ id, content }, { onSuccess })
      }
      onDeleteNote={(id, onSuccess) =>
        deleteMutation.mutate({ id }, { onSuccess })
      }
      createPending={createMutation.isPending}
      updatePending={updateMutation.isPending}
      deletePending={deleteMutation.isPending}
    />
  )
}
