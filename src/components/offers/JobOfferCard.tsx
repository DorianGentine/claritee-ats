"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getOfferStatusStyle } from "@/lib/offer-status-style"
import type { JobOfferStatus } from "@prisma/client"

export type JobOfferCardItem = {
  id: string
  title: string
  location: string | null
  salaryMin: number | null
  salaryMax: number | null
  status: JobOfferStatus
  clientCompanyName: string | null
}

const formatSalaryRange = (
  salaryMin: number | null,
  salaryMax: number | null
): string => {
  if (salaryMin == null && salaryMax == null) return "Salaire non précisé"
  const min = salaryMin != null ? salaryMin : null
  const max = salaryMax != null ? salaryMax : null
  if (min != null && max != null) return `${min}–${max} k€`
  if (min != null) return `À partir de ${min} k€`
  if (max != null) return `Jusqu'à ${max} k€`
  return "Salaire non précisé"
}

export const JobOfferCard = ({ offer }: { offer: JobOfferCardItem }) => {
  const { label, badgeClassName } = getOfferStatusStyle(offer.status)
  const salaryText = formatSalaryRange(offer.salaryMin, offer.salaryMax)
  const clientName = offer.clientCompanyName ?? "Client non défini"

  return (
    <Link
      href={`/offers/${offer.id}`}
      aria-label={`Voir l'offre : ${offer.title}`}
      className="flex h-full flex-col rounded-lg border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h2 className="truncate font-medium text-foreground">{offer.title}</h2>
          <Badge
            variant="outline"
            className={cn("shrink-0 border", badgeClassName)}
          >
            {label}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{clientName}</p>
        {offer.location ? (
          <p className="text-sm text-muted-foreground">{offer.location}</p>
        ) : null}
        <p className="text-sm text-muted-foreground">{salaryText}</p>
      </div>
    </Link>
  )
}
