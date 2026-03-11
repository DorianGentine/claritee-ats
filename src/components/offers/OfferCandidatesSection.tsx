"use client"

import Link from "next/link"
import type { CandidatureStatus } from "@prisma/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  getCandidatureStatusStyle,
  CANDIDATURE_STATUS_LABELS,
  CANDIDATURE_STATUS_ORDER,
} from "@/lib/candidature-status-style"

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
  candidatures: CandidatureItem[]
  candidatureCountByStatus: Partial<Record<CandidatureStatus, number>>
}

const getInitials = (firstName: string, lastName: string): string => {
  const f = firstName.trim().charAt(0).toUpperCase()
  const l = lastName.trim().charAt(0).toUpperCase()
  return `${f}${l}`
}

export const OfferCandidatesSection = ({
  candidatures,
  candidatureCountByStatus,
}: OfferCandidatesSectionProps) => {
  const statusesWithCount = CANDIDATURE_STATUS_ORDER.filter(
    (s) => (candidatureCountByStatus[s] ?? 0) > 0,
  )

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">Candidats associés</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled
          title="Disponible dans la Story 3.7"
        >
          Associer un candidat
        </Button>
      </div>

      {candidatures.length === 0 ? (
        <div className="py-6 text-center">
          <p className="font-medium text-muted-foreground">Aucun candidat associé</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Vous pourrez associer des candidats à cette offre depuis le bouton dédié.
          </p>
        </div>
      ) : (
        <>
          {statusesWithCount.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {statusesWithCount.map((status) => {
                const { badgeClassName } = getCandidatureStatusStyle(status)
                return (
                  <Badge key={status} variant="outline" className={badgeClassName}>
                    {CANDIDATURE_STATUS_LABELS[status]} ({candidatureCountByStatus[status]})
                  </Badge>
                )
              })}
            </div>
          )}

          <ul className="divide-y divide-border">
            {candidatures.map((c) => {
              const { label, badgeClassName } = getCandidatureStatusStyle(c.status)
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
                      <p className="truncate text-sm text-muted-foreground">{c.candidate.title}</p>
                    )}
                  </div>

                  <Badge variant="outline" className={badgeClassName}>
                    {label}
                  </Badge>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
