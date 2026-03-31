"use client"

import { X } from "lucide-react"
import { api } from "@/lib/trpc/client"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { hasActiveOfferFilters, type OfferFilters } from "./OfferListFilters"

const STATUS_LABELS: Record<string, string> = {
  TODO: "À faire",
  IN_PROGRESS: "En cours",
  DONE: "Terminé",
}

type ActiveOfferFilterChipsProps = {
  filters: OfferFilters
  totalCount: number
  isLoading?: boolean
  onRemoveStatus: (status: string) => void
  onRemoveTag: (tagId: string) => void
  onRemoveSalaryMin: () => void
  onRemoveSalaryMax: () => void
  onRemoveLocation: () => void
  onRemoveClientCompany: () => void
  className?: string
}

export const ActiveOfferFilterChips = ({
  filters,
  totalCount,
  isLoading,
  onRemoveStatus,
  onRemoveTag,
  onRemoveSalaryMin,
  onRemoveSalaryMax,
  onRemoveLocation,
  onRemoveClientCompany,
  className,
}: ActiveOfferFilterChipsProps) => {
  const { data: tags = [] } = api.tag.list.useQuery()
  const tagById = Object.fromEntries(tags.map((t) => [t.id, t]))

  const { data: clients = [] } = api.clientCompany.list.useQuery()
  const clientById = Object.fromEntries(clients.map((c) => [c.id, c]))

  if (!hasActiveOfferFilters(filters)) return null

  return (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      role="list"
      aria-label="Filtres actifs"
    >
      {filters.statuses.map((status) => (
        <Badge
          key={status}
          variant="secondary"
          className="gap-1 py-1 pl-2 pr-1"
          role="listitem"
        >
          <span className="truncate">
            Statut: {STATUS_LABELS[status] ?? status}
          </span>
          <button
            type="button"
            onClick={() => onRemoveStatus(status)}
            className="rounded-sm p-0.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Retirer le filtre statut ${STATUS_LABELS[status] ?? status}`}
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}

      {filters.tagIds.map((tagId) => {
        const tag = tagById[tagId]
        const label = tag?.name ?? tagId
        return (
          <Badge
            key={tagId}
            variant="secondary"
            className="gap-1 py-1 pl-2 pr-1"
            role="listitem"
          >
            <span className="truncate">Tag: {label}</span>
            <button
              type="button"
              onClick={() => onRemoveTag(tagId)}
              className="rounded-sm p-0.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Retirer le filtre tag ${label}`}
            >
              <X className="size-3" />
            </button>
          </Badge>
        )
      })}

      {filters.salaryMin !== undefined && (
        <Badge
          variant="secondary"
          className="gap-1 py-1 pl-2 pr-1"
          role="listitem"
        >
          <span className="truncate">Salaire min: {filters.salaryMin}</span>
          <button
            type="button"
            onClick={onRemoveSalaryMin}
            className="rounded-sm p-0.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Retirer le filtre salaire minimum"
          >
            <X className="size-3" />
          </button>
        </Badge>
      )}

      {filters.salaryMax !== undefined && (
        <Badge
          variant="secondary"
          className="gap-1 py-1 pl-2 pr-1"
          role="listitem"
        >
          <span className="truncate">Salaire max: {filters.salaryMax}</span>
          <button
            type="button"
            onClick={onRemoveSalaryMax}
            className="rounded-sm p-0.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Retirer le filtre salaire maximum"
          >
            <X className="size-3" />
          </button>
        </Badge>
      )}

      {filters.location?.trim() && (
        <Badge
          variant="secondary"
          className="gap-1 py-1 pl-2 pr-1"
          role="listitem"
        >
          <span className="truncate">Ville: {filters.location}</span>
          <button
            type="button"
            onClick={onRemoveLocation}
            className="rounded-sm p-0.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Retirer le filtre ville ${filters.location}`}
          >
            <X className="size-3" />
          </button>
        </Badge>
      )}

      {filters.clientCompanyId && (
        <Badge
          variant="secondary"
          className="gap-1 py-1 pl-2 pr-1"
          role="listitem"
        >
          <span className="truncate">
            Client:{" "}
            {clientById[filters.clientCompanyId]?.name ??
              filters.clientCompanyId}
          </span>
          <button
            type="button"
            onClick={onRemoveClientCompany}
            className="rounded-sm p-0.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Retirer le filtre client"
          >
            <X className="size-3" />
          </button>
        </Badge>
      )}

      <span
        className="text-sm text-muted-foreground"
        aria-live="polite"
        aria-busy={isLoading}
      >
        {isLoading
          ? "Chargement…"
          : `${totalCount} offre${totalCount !== 1 ? "s" : ""} trouvée${totalCount !== 1 ? "s" : ""}`}
      </span>
    </div>
  )
}
