"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { api } from "@/lib/trpc/client"
import { JobOfferForm } from "@/components/offers/JobOfferForm"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"

const EditOfferPage = () => {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params?.id

  const utils = api.useUtils()

  const offerQuery = api.offer.getById.useQuery(
    { id: typeof id === "string" ? id : "" },
    { enabled: typeof id === "string" && id.length > 0 },
  )

  const deleteMutation = api.offer.delete.useMutation({
    onSuccess: async () => {
      await utils.offer.list.invalidate()
      toast.success("Offre supprimée.")
      router.push("/offers")
    },
  })

  useEffect(() => {
    if (offerQuery.isError && !offerQuery.isLoading) {
      router.push("/offers")
    }
  }, [offerQuery.isError, offerQuery.isLoading, router])

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  if (offerQuery.isLoading || !id || typeof id !== "string") {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] bg-background p-6">
        <div className="mx-auto max-w-2xl">
          <p className="text-sm text-muted-foreground">Chargement…</p>
        </div>
      </main>
    )
  }

  if (!offerQuery.data) {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] bg-background p-6">
        <div className="mx-auto max-w-2xl">
          <p className="text-sm text-muted-foreground">
            Offre introuvable ou non accessible.
          </p>
        </div>
      </main>
    )
  }

  const offer = offerQuery.data as typeof offerQuery.data & {
    clientContactId?: string | null
  }

  const handleConfirmDelete = () => {
    if (!offer?.id) return
    deleteMutation.mutate({ id: offer.id })
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background p-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Modifier l'offre
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajustez les informations de l'offre existante.
        </p>
        <JobOfferForm
          mode="edit"
          initialOffer={{
            id: offer.id,
            title: offer.title,
            description: offer.description ?? "",
            location: offer.location ?? "",
            salaryMin: offer.salaryMin ?? undefined,
            salaryMax: offer.salaryMax ?? undefined,
            status: offer.status,
            clientCompanyId: offer.clientCompanyId ?? undefined,
            clientContactId: offer.clientContactId ?? undefined,
          }}
        />
        <section className="mt-8 border-t border-border pt-4">
          <h2 className="text-sm font-medium text-foreground">Suppression</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            La suppression est définitive et supprime aussi les candidatures
            associées.
          </p>
          <Button
            type="button"
            variant="destructive"
            className="mt-3"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={deleteMutation.isPending}
            aria-busy={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Suppression…" : "Supprimer l'offre"}
          </Button>
          <ConfirmDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            title="Supprimer cette offre ?"
            description="Cette action supprimera aussi les candidatures associées. Elle est définitive."
            confirmLabel="Supprimer"
            cancelLabel="Annuler"
            pendingLabel="Suppression…"
            onConfirm={handleConfirmDelete}
            pending={deleteMutation.isPending}
          />
        </section>
      </div>
    </main>
  )
}

export default EditOfferPage


