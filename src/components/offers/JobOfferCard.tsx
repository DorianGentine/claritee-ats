"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getOfferStatusStyle } from "@/lib/offer-status-style"
import { getTagBadgeStyle } from "@/lib/tag-colors"
import type { JobOfferStatus } from "@prisma/client"
import type { TagItem } from "@/components/shared/TagsSection"

export type JobOfferCardItem = {
  id: string
  title: string
  cityName: string | null
  salaryMin: number | null
  salaryMax: number | null
  status: JobOfferStatus
  clientCompanyName: string | null
  tags?: TagItem[]
  tagCount?: number
}

const formatSalaryRange = (
  salaryMin: number | null,
  salaryMax: number | null
): string => {
  if (salaryMin == null && salaryMax == null) return "Salaire non précisé"
  const min = salaryMin != null && salaryMin > 0 ? salaryMin : null
  const max = salaryMax != null && salaryMax > 0 ? salaryMax : null
  if (min != null && max != null) return `${min}–${max} €`
  if (min != null) return `À partir de ${min} €`
  if (max != null) return `Jusqu'à ${max} €`
  return "Salaire non précisé"
}

export const JobOfferCard = ({ offer }: { offer: JobOfferCardItem }) => {
  const { label, badgeClassName } = getOfferStatusStyle(offer.status)
  const salaryText = formatSalaryRange(offer.salaryMin, offer.salaryMax)
  const clientName = offer.clientCompanyName ?? "Client non défini"
  const tags = offer.tags ?? []
  const visibleTags = tags.slice(0, 3)
  const totalCount = offer.tagCount ?? tags.length
  const remainingCount = totalCount > 3 ? totalCount - 3 : 0

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
        {offer.cityName ? (
          <p className="text-sm text-muted-foreground">{offer.cityName}</p>
        ) : null}
        <p className="text-sm text-muted-foreground">{salaryText}</p>
        {visibleTags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {visibleTags.map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="h-5 gap-1 px-1.5 text-[10px]"
                style={getTagBadgeStyle(tag.color)}
              >
                {tag.name}
              </Badge>
            ))}
            {remainingCount > 0 && (
              <Badge
                variant="outline"
                className="h-5 px-1.5 text-[10px] text-muted-foreground"
              >
                +{remainingCount}
              </Badge>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
