"use client"

import { useMemo, useState } from "react"
import { Filter } from "lucide-react"
import { api } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { MultiSelectPopover } from "@/components/shared/MultiSelectPopover"

export type CandidateFilters = {
  tagIds: string[]
  languageNames: string[]
}

export const hasActiveCandidateFilters = (filters: CandidateFilters): boolean =>
  filters.tagIds.length > 0 ||
  filters.languageNames.length > 0

export const EMPTY_CANDIDATE_FILTERS: CandidateFilters = {
  tagIds: [],
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
  const { data: tags = [] } = api.tag.list.useQuery()
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
