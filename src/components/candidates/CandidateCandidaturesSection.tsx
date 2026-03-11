"use client"

import Link from "next/link"
import { api } from "@/lib/trpc/client"
import type { CandidatureStatus } from "@prisma/client"
import { CandidatureStatusDropdown } from "@/components/shared/CandidatureStatusDropdown"
import { useCandidatureUpdateStatus } from "@/hooks/useCandidatureUpdateStatus"

type CandidatureEntry = {
  id: string
  status: CandidatureStatus
  createdAt: Date | string
  jobOffer: {
    id: string
    title: string
  }
}

type Props = {
  candidateId: string
  candidatures: CandidatureEntry[]
}

export const CandidateCandidaturesSection = ({ candidateId, candidatures }: Props) => {
  const utils = api.useUtils()

  const updateStatusMutation = useCandidatureUpdateStatus({
    cancelQuery: () => utils.candidate.getById.cancel({ id: candidateId }),
    getSnapshot: () => utils.candidate.getById.getData({ id: candidateId }),
    applyOptimistic: (candidatureId, status) => {
      utils.candidate.getById.setData({ id: candidateId }, (old) => {
        if (!old) return old
        return {
          ...old,
          candidatures: old.candidatures.map((c) =>
            c.id === candidatureId ? { ...c, status } : c,
          ),
        }
      })
    },
    revertSnapshot: (snapshot) => {
      utils.candidate.getById.setData({ id: candidateId }, snapshot)
    },
    invalidate: () => {
      void utils.candidate.getById.invalidate({ id: candidateId })
      void utils.offer.getById.invalidate()
    },
  })

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-foreground">Offres associées</h2>

      {candidatures.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-sm text-muted-foreground">Aucune offre associée</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {candidatures.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/offers/${c.jobOffer.id}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {c.jobOffer.title}
                </Link>
                <p className="text-xs text-muted-foreground">
                  Associé le{" "}
                  {new Date(c.createdAt).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>

              <CandidatureStatusDropdown
                currentStatus={c.status}
                onSelect={(status) =>
                  updateStatusMutation.mutate({ candidatureId: c.id, status })
                }
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
