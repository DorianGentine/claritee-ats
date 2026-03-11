"use client"

import { useState } from "react"
import Link from "next/link"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/trpc/client"
import type { CandidatureStatus } from "@prisma/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { CandidatureStatusDropdown } from "@/components/shared/CandidatureStatusDropdown"
import {
  getCandidatureStatusStyle,
  CANDIDATURE_STATUS_LABELS,
  CANDIDATURE_STATUS_ORDER,
} from "@/lib/candidature-status-style"
import { getInitials } from "@/lib/candidate-utils"
import { useCandidatureUpdateStatus } from "@/hooks/useCandidatureUpdateStatus"
import { CandidateSelectDialog } from "./CandidateSelectDialog"

export type CandidatureItem = {
  id: string
  candidate: {
    id: string
    firstName: string
    lastName: string
    title: string | null
    photoUrl: string | null
  }
  status: CandidatureStatus
}

export type OfferCandidatesSectionProps = {
  offerId: string
  candidatures: CandidatureItem[]
  candidatureCountByStatus: Partial<Record<CandidatureStatus, number>>
}

const computeCountByStatus = (
  items: { status: CandidatureStatus }[],
): Partial<Record<CandidatureStatus, number>> =>
  items.reduce<Partial<Record<CandidatureStatus, number>>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1
    return acc
  }, {})

export const OfferCandidatesSection = ({
  offerId,
  candidatures,
  candidatureCountByStatus,
}: OfferCandidatesSectionProps) => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<CandidatureStatus | null>(null)
  const utils = api.useUtils()

  const existingCandidateIds = candidatures.map((c) => c.candidate.id)

  const handleSuccess = () => {
    void utils.offer.getById.invalidate({ id: offerId })
  }

  const updateStatusMutation = useCandidatureUpdateStatus({
    cancelQuery: () => utils.offer.getById.cancel({ id: offerId }),
    getSnapshot: () => utils.offer.getById.getData({ id: offerId }),
    applyOptimistic: (candidatureId, status) => {
      utils.offer.getById.setData({ id: offerId }, (old) => {
        if (!old) return old
        const newCandidatures = old.candidatures.map((c) =>
          c.id === candidatureId ? { ...c, status } : c,
        )
        return {
          ...old,
          candidatures: newCandidatures,
          candidatureCountByStatus: computeCountByStatus(newCandidatures),
        }
      })
    },
    revertSnapshot: (snapshot) => {
      utils.offer.getById.setData({ id: offerId }, snapshot)
    },
    invalidate: () => {
      void utils.offer.getById.invalidate({ id: offerId })
      void utils.candidate.getById.invalidate()
    },
  })

  const deleteMutation = api.candidature.delete.useMutation({
    networkMode: "always",
    onMutate: async ({ candidatureId }) => {
      await utils.offer.getById.cancel({ id: offerId })
      const previous = utils.offer.getById.getData({ id: offerId })
      utils.offer.getById.setData({ id: offerId }, (old) => {
        if (!old) return old
        const newCandidatures = old.candidatures.filter((c) => c.id !== candidatureId)
        return {
          ...old,
          candidatures: newCandidatures,
          candidatureCountByStatus: computeCountByStatus(newCandidatures),
        }
      })
      return { previous }
    },
    onError: (_err, _input, context) => {
      if (context?.previous) {
        utils.offer.getById.setData({ id: offerId }, context.previous)
      }
      toast.error("Une erreur est survenue.")
    },
    onSuccess: () => {
      toast.success("Candidat dissocié.")
    },
    onSettled: () => {
      setDeleteTargetId(null)
      void utils.offer.getById.invalidate({ id: offerId })
      void utils.candidate.getById.invalidate()
    },
  })

  const presentStatuses = CANDIDATURE_STATUS_ORDER.filter(
    (s) => (candidatureCountByStatus[s] ?? 0) > 0,
  )

  const filteredCandidatures =
    statusFilter !== null
      ? candidatures.filter((c) => c.status === statusFilter)
      : candidatures

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">Candidats associés</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setDialogOpen(true)}
        >
          Associer un candidat
        </Button>
      </div>

      {candidatures.length === 0 ? (
        <div className="py-6 text-center">
          <p className="font-medium text-muted-foreground">Aucun candidat associé</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Cliquez sur "Associer un candidat" pour commencer.
          </p>
        </div>
      ) : (
        <>
          {/* Compteurs par statut */}
          {presentStatuses.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {presentStatuses.map((status) => {
                const { badgeClassName } = getCandidatureStatusStyle(status)
                return (
                  <Badge key={status} variant="outline" className={badgeClassName}>
                    {CANDIDATURE_STATUS_LABELS[status]} ({candidatureCountByStatus[status]})
                  </Badge>
                )
              })}
            </div>
          )}

          {/* Filtre par statut */}
          {presentStatuses.length > 1 && (
            <div
              className="mb-4 flex flex-wrap gap-1.5"
              role="group"
              aria-label="Filtrer par statut"
            >
              <button
                type="button"
                onClick={() => setStatusFilter(null)}
                className={[
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  statusFilter === null
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-transparent text-muted-foreground hover:bg-muted/60",
                ].join(" ")}
              >
                Tous
              </button>
              {presentStatuses.map((status) => {
                const { label, badgeClassName } = getCandidatureStatusStyle(status)
                const isActive = statusFilter === status
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(isActive ? null : status)}
                    className={[
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      isActive
                        ? `${badgeClassName} border-transparent`
                        : "border-border bg-transparent text-muted-foreground hover:bg-muted/60",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          )}

          {/* Liste des candidatures */}
          <ul className="divide-y divide-border">
            {filteredCandidatures.length === 0 ? (
              <li className="py-4 text-center text-sm text-muted-foreground">
                Aucun candidat pour ce statut.
              </li>
            ) : (
              filteredCandidatures.map((c) => {
                const fullName = `${c.candidate.firstName} ${c.candidate.lastName}`
                const initials = getInitials(c.candidate.firstName, c.candidate.lastName)

                return (
                  <li key={c.id} className="flex items-center gap-3 py-3">
                    <Avatar className="size-9 shrink-0">
                      {c.candidate.photoUrl && (
                        <AvatarImage src={c.candidate.photoUrl} alt={fullName} />
                      )}
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/candidates/${c.candidate.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {fullName}
                      </Link>
                      {c.candidate.title && (
                        <p className="truncate text-sm text-muted-foreground">
                          {c.candidate.title}
                        </p>
                      )}
                    </div>

                    <CandidatureStatusDropdown
                      currentStatus={c.status}
                      onSelect={(status) =>
                        updateStatusMutation.mutate({ candidatureId: c.id, status })
                      }
                    />

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Dissocier ${fullName}`}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteTargetId(c.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                )
              })
            )}
          </ul>
        </>
      )}

      <CandidateSelectDialog
        offerId={offerId}
        existingCandidateIds={existingCandidateIds}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleSuccess}
      />

      <ConfirmDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetId(null)
        }}
        title="Dissocier ce candidat ?"
        description="Le candidat sera retiré de cette offre. Cette action est réversible en réassociant le candidat."
        confirmLabel="Dissocier"
        pendingLabel="Dissociation…"
        onConfirm={() => {
          if (deleteTargetId) {
            deleteMutation.mutate({ candidatureId: deleteTargetId })
          }
        }}
        pending={deleteMutation.isPending}
        confirmVariant="destructive"
      />
    </section>
  )
}
