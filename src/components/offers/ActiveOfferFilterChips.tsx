"use client"

import { api } from "@/lib/trpc/client"
import { cn } from "@/lib/utils"
import { FilterChip } from "@/components/shared/FilterChip"
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
      {filters.statuses.map((status) => {
        const label = STATUS_LABELS[status] ?? status
        return (
          <FilterChip
            key={status}
            label={`Statut: ${label}`}
            onRemove={() => onRemoveStatus(status)}
            removeAriaLabel={`Retirer le filtre statut ${label}`}
          />
        )
      })}
      {filters.tagIds.map((tagId) => {
        const label = tagById[tagId]?.name ?? tagId
        return (
          <FilterChip
            key={tagId}
            label={`Tag: ${label}`}
            onRemove={() => onRemoveTag(tagId)}
            removeAriaLabel={`Retirer le filtre tag ${label}`}
          />
        )
      })}
      {filters.salaryMin !== undefined && (
        <FilterChip
          label={`Salaire min: ${filters.salaryMin}`}
          onRemove={onRemoveSalaryMin}
          removeAriaLabel="Retirer le filtre salaire minimum"
        />
      )}
      {filters.salaryMax !== undefined && (
        <FilterChip
          label={`Salaire max: ${filters.salaryMax}`}
          onRemove={onRemoveSalaryMax}
          removeAriaLabel="Retirer le filtre salaire maximum"
        />
      )}
      {filters.location?.trim() && (
        <FilterChip
          label={`Ville: ${filters.location}`}
          onRemove={onRemoveLocation}
          removeAriaLabel={`Retirer le filtre ville ${filters.location}`}
        />
      )}
      {filters.clientCompanyId && (
        <FilterChip
          label={`Client: ${clientById[filters.clientCompanyId]?.name ?? filters.clientCompanyId}`}
          onRemove={onRemoveClientCompany}
          removeAriaLabel="Retirer le filtre client"
        />
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
