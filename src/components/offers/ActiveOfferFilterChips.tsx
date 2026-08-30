"use client"

import { api } from "@/lib/trpc/client"
import { FilterChipsBar, type FilterChipDescriptor } from "@/components/shared/FilterChipsBar"
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
  onRemoveCity: () => void
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
  onRemoveCity,
  onRemoveClientCompany,
  className,
}: ActiveOfferFilterChipsProps) => {
  const { data: tags = [] } = api.tag.list.useQuery()
  const tagById = Object.fromEntries(tags.map((t) => [t.id, t]))

  const { data: clients = [] } = api.clientCompany.list.useQuery()
  const clientById = Object.fromEntries(clients.map((c) => [c.id, c]))

  if (!hasActiveOfferFilters(filters)) return null

  const chips: FilterChipDescriptor[] = [
    ...filters.statuses.map((status) => {
      const label = STATUS_LABELS[status] ?? status
      return {
        key: `status-${status}`,
        label: `Statut: ${label}`,
        onRemove: () => onRemoveStatus(status),
        removeAriaLabel: `Retirer le filtre statut ${label}`,
      }
    }),
    ...filters.tagIds.map((tagId) => {
      const label = tagById[tagId]?.name ?? tagId
      return {
        key: `tag-${tagId}`,
        label: `Tag: ${label}`,
        onRemove: () => onRemoveTag(tagId),
        removeAriaLabel: `Retirer le filtre tag ${label}`,
      }
    }),
    ...(filters.salaryMin !== undefined
      ? [
          {
            key: "salary-min",
            label: `Salaire min: ${filters.salaryMin}`,
            onRemove: onRemoveSalaryMin,
            removeAriaLabel: "Retirer le filtre salaire minimum",
          },
        ]
      : []),
    ...(filters.salaryMax !== undefined
      ? [
          {
            key: "salary-max",
            label: `Salaire max: ${filters.salaryMax}`,
            onRemove: onRemoveSalaryMax,
            removeAriaLabel: "Retirer le filtre salaire maximum",
          },
        ]
      : []),
    ...(filters.city
      ? [
          {
            key: "city",
            label: `Ville: ${filters.city.name}`,
            onRemove: onRemoveCity,
            removeAriaLabel: `Retirer le filtre ville ${filters.city.name}`,
          },
        ]
      : []),
    ...(filters.clientCompanyId
      ? [
          {
            key: "client",
            label: `Client: ${clientById[filters.clientCompanyId]?.name ?? filters.clientCompanyId}`,
            onRemove: onRemoveClientCompany,
            removeAriaLabel: "Retirer le filtre client",
          },
        ]
      : []),
  ]

  return (
    <FilterChipsBar
      chips={chips}
      isLoading={isLoading}
      countLabel={`${totalCount} offre${totalCount !== 1 ? "s" : ""} trouvée${totalCount !== 1 ? "s" : ""}`}
      className={className}
    />
  )
}
