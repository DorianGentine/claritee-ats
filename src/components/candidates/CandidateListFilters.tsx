"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Filter } from "lucide-react"
import { api } from "@/lib/trpc/client"
import { useDebounce } from "@/hooks/useDebounce"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MultiSelectPopover } from "@/components/shared/MultiSelectPopover"

export type CandidateFilters = {
  tagIds: string[]
  city?: string
  languageNames: string[]
}

export const hasActiveCandidateFilters = (filters: CandidateFilters): boolean =>
  filters.tagIds.length > 0 ||
  (filters.city?.trim() ?? "").length > 0 ||
  filters.languageNames.length > 0

export const EMPTY_CANDIDATE_FILTERS: CandidateFilters = {
  tagIds: [],
  city: undefined,
  languageNames: [],
}

type CandidateListFiltersProps = {
  filters: CandidateFilters
  onFiltersChange: (filters: CandidateFilters) => void
  onClear: () => void
}

export const CandidateListFilters = ({
  filters,
  onFiltersChange,
  onClear,
}: CandidateListFiltersProps) => {
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false)
  const [languagePopoverOpen, setLanguagePopoverOpen] = useState(false)
  const [cityInput, setCityInput] = useState(filters.city ?? "")

  const debouncedCity = useDebounce(cityInput.trim(), 300)
  const prevDebouncedCityRef = useRef(debouncedCity)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync props → state
    setCityInput(filters.city ?? "")
  }, [filters.city])

  useEffect(() => {
    if (debouncedCity === prevDebouncedCityRef.current) return
    prevDebouncedCityRef.current = debouncedCity
    const nextCity = debouncedCity || undefined
    const currentCity = filters.city ?? undefined
    if (nextCity !== currentCity) {
      onFiltersChange({ ...filters, city: nextCity })
    }
  }, [debouncedCity, filters, onFiltersChange])

  const { data: tags = [] } = api.tag.list.useQuery()
  const { data: cities = [] } = api.candidate.listDistinctCities.useQuery()
  const { data: languageNames = [] } =
    api.candidate.listDistinctLanguageNames.useQuery()

  const hasActiveFilters = hasActiveCandidateFilters(filters)

  const tagItems = useMemo(
    () => tags.map((t) => ({ value: t.id, label: t.name, color: t.color })),
    [tags]
  )

  const languageItems = useMemo(
    () => languageNames.map((name) => ({ value: name, label: name })),
    [languageNames]
  )

  const cityOptions = useMemo(() => {
    const value = cityInput.trim().toLowerCase()
    if (!value) return cities
    return cities.filter((c) => c.toLowerCase().includes(value))
  }, [cities, cityInput])

  const toggleTag = (tagId: string) => {
    const next = filters.tagIds.includes(tagId)
      ? filters.tagIds.filter((id) => id !== tagId)
      : [...filters.tagIds, tagId]
    onFiltersChange({ ...filters, tagIds: next })
  }

  const toggleLanguage = (name: string) => {
    const next = filters.languageNames.includes(name)
      ? filters.languageNames.filter((n) => n !== name)
      : [...filters.languageNames, name]
    onFiltersChange({ ...filters, languageNames: next })
  }

  const handleCityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      ;(e.target as HTMLInputElement).blur()
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Filter className="size-4" aria-hidden />
        Filtres
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
        {/* Tags */}
        <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor="filter-tags" className="text-xs text-muted-foreground">
            Tags
          </label>
          <MultiSelectPopover
            triggerId="filter-tags"
            items={tagItems}
            selectedValues={filters.tagIds}
            onToggle={toggleTag}
            open={tagPopoverOpen}
            onOpenChange={setTagPopoverOpen}
            placeholder="Sélectionner des tags"
            selectedLabel={(n) => `${n} tag(s) sélectionné(s)`}
            emptyMessage="Aucun tag disponible"
          />
        </div>

        {/* Langues */}
        <div className="flex min-w-0 flex-col gap-2">
          <label
            htmlFor="filter-languages"
            className="text-xs text-muted-foreground"
          >
            Langues
          </label>
          <MultiSelectPopover
            triggerId="filter-languages"
            items={languageItems}
            selectedValues={filters.languageNames}
            onToggle={toggleLanguage}
            open={languagePopoverOpen}
            onOpenChange={setLanguagePopoverOpen}
            placeholder="Sélectionner des langues"
            selectedLabel={(n) => `${n} langue(s) sélectionnée(s)`}
            emptyMessage="Aucune langue disponible"
          />
        </div>

        {/* Ville */}
        <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor="filter-city" className="text-xs text-muted-foreground">
            Ville
          </label>
          <div className="relative" suppressHydrationWarning>
            <Input
              id="filter-city"
              type="text"
              placeholder="Ex: Paris"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              onKeyDown={handleCityKeyDown}
              list="filter-city-datalist"
              className="w-full sm:w-40"
              aria-autocomplete="list"
            />
            <datalist id="filter-city-datalist">
              {cityOptions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Effacer */}
        {hasActiveFilters && (
          <div className="flex items-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="text-muted-foreground hover:text-foreground"
            >
              Effacer filtres
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
