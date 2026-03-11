"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { getCandidatureStatusStyle } from "@/lib/candidature-status-style"
import type { CandidatureStatus } from "@prisma/client"

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
  candidatures: CandidatureEntry[]
}

export const CandidateCandidaturesSection = ({ candidatures }: Props) => {
  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-foreground">Offres associées</h2>

      {candidatures.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-sm text-muted-foreground">Aucune offre associée</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {candidatures.map((c) => {
            const { label, badgeClassName } = getCandidatureStatusStyle(c.status)
            return (
              <li key={c.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/offers/${c.jobOffer.id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {c.jobOffer.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    Associé le {new Date(c.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
                <Badge variant="outline" className={badgeClassName}>
                  {label}
                </Badge>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
