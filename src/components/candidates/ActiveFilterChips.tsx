"use client"

import { api } from "@/lib/trpc/client"
import { FilterChipsBar, type FilterChipDescriptor } from "@/components/shared/FilterChipsBar"
import type { CityOption } from "@/components/shared/CityAutocomplete"
import { hasActiveCandidateFilters, type CandidateFilters } from "./CandidateListFilters"

type ActiveFilterChipsProps = {
  filters: CandidateFilters
  totalCount: number
  isLoading?: boolean
  /** Villes sélectionnées (objets complets), pour résoudre le nom affiché sur le chip. */
  selectedCities: CityOption[]
  onRemoveTag: (tagId: string) => void
  onRemoveCity: (cityId: string) => void
  onRemoveLanguage: (name: string) => void
  className?: string
}

export const ActiveFilterChips = ({
  filters,
  totalCount,
  isLoading,
  selectedCities,
  onRemoveTag,
  onRemoveCity,
  onRemoveLanguage,
  className,
}: ActiveFilterChipsProps) => {
  const { data: tags = [] } = api.tag.list.useQuery()
  const tagById = Object.fromEntries(tags.map((t) => [t.id, t]))
  const cityById = Object.fromEntries(selectedCities.map((city) => [city.id, city]))

  if (!hasActiveCandidateFilters(filters)) return null

  const chips: FilterChipDescriptor[] = [
    ...filters.tagIds.map((tagId) => {
      const label = tagById[tagId]?.name ?? tagId
      return {
        key: `tag-${tagId}`,
        label: `Tag: ${label}`,
        onRemove: () => onRemoveTag(tagId),
        removeAriaLabel: `Retirer le filtre tag ${label}`,
      }
    }),
    ...filters.cityIds.map((cityId) => {
      const city = cityById[cityId]
      // `city` peut être absent le temps que `city.getByIds` résolve le nom
      // (arrivée depuis l'URL) — le filtre reste actif sur les résultats dans
      // tous les cas, donc le chip doit rester visible et retirable même sans
      // nom résolu, plutôt que de disparaître silencieusement.
      return {
        key: `city-${cityId}`,
        label: city ? `Ville: ${city.name}` : "Ville : résolution…",
        onRemove: () => onRemoveCity(cityId),
        removeAriaLabel: city
          ? `Retirer le filtre ville ${city.name}`
          : "Retirer le filtre ville",
      }
    }),
    ...filters.languageNames.map((name) => ({
      key: `lang-${name}`,
      label: `Langue: ${name}`,
      onRemove: () => onRemoveLanguage(name),
      removeAriaLabel: `Retirer le filtre langue ${name}`,
    })),
  ]

  return (
    <FilterChipsBar
      chips={chips}
      isLoading={isLoading}
      countLabel={`${totalCount} candidat${totalCount !== 1 ? "s" : ""} trouvé${totalCount !== 1 ? "s" : ""}`}
      className={className}
    />
  )
}
