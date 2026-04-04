"use client"

import { api } from "@/lib/trpc/client"
import { cn } from "@/lib/utils"
import { FilterChip } from "@/components/shared/FilterChip"
import { hasActiveCandidateFilters, type CandidateFilters } from "./CandidateListFilters"

type ActiveFilterChipsProps = {
  filters: CandidateFilters
  totalCount: number
  isLoading?: boolean
  onRemoveTag: (tagId: string) => void
  onRemoveCity: () => void
  onRemoveLanguage: (name: string) => void
  className?: string
}

export const ActiveFilterChips = ({
  filters,
  totalCount,
  isLoading,
  onRemoveTag,
  onRemoveCity,
  onRemoveLanguage,
  className,
}: ActiveFilterChipsProps) => {
  const { data: tags = [] } = api.tag.list.useQuery()
  const tagById = Object.fromEntries(tags.map((t) => [t.id, t]))

  if (!hasActiveCandidateFilters(filters)) return null

  return (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      role="list"
      aria-label="Filtres actifs"
    >
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
      {filters.languageNames.map((name) => (
        <FilterChip
          key={name}
          label={`Langue: ${name}`}
          onRemove={() => onRemoveLanguage(name)}
          removeAriaLabel={`Retirer le filtre langue ${name}`}
        />
      ))}
      {filters.city?.trim() && (
        <FilterChip
          label={`Ville: ${filters.city}`}
          onRemove={onRemoveCity}
          removeAriaLabel={`Retirer le filtre ville ${filters.city}`}
        />
      )}
      <span
        className="text-sm text-muted-foreground"
        aria-live="polite"
        aria-busy={isLoading}
      >
        {isLoading
          ? "Chargement…"
          : `${totalCount} candidat${totalCount !== 1 ? "s" : ""} trouvé${totalCount !== 1 ? "s" : ""}`}
      </span>
    </div>
  )
}
