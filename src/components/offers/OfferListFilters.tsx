"use client"

import { useEffect, useMemo, useState } from "react"
import { Filter } from "lucide-react"
import { api } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MultiSelectPopover } from "@/components/shared/MultiSelectPopover"
import { CityAutocomplete, type CityOption } from "@/components/shared/CityAutocomplete"
import type { JobOfferStatus } from "@/lib/validations/offer"

const STATUS_OPTIONS: { value: JobOfferStatus; label: string }[] = [
  { value: "TODO", label: "À faire" },
  { value: "IN_PROGRESS", label: "En cours" },
  { value: "DONE", label: "Terminé" },
]

export type OfferFilters = {
  statuses: JobOfferStatus[]
  tagIds: string[]
  salaryMin?: number
  salaryMax?: number
  city: CityOption | null
  clientCompanyId?: string
}

export const hasActiveOfferFilters = (filters: OfferFilters): boolean =>
  filters.statuses.length > 0 ||
  filters.tagIds.length > 0 ||
  filters.salaryMin !== undefined ||
  filters.salaryMax !== undefined ||
  filters.city !== null ||
  filters.clientCompanyId !== undefined

export const EMPTY_OFFER_FILTERS: OfferFilters = {
  statuses: [],
  tagIds: [],
  salaryMin: undefined,
  salaryMax: undefined,
  city: null,
  clientCompanyId: undefined,
}

type OfferListFiltersProps = {
  filters: OfferFilters
  onFiltersChange: (filters: OfferFilters) => void
  onClear: () => void
}

export const OfferListFilters = ({
  filters,
  onFiltersChange,
  onClear,
}: OfferListFiltersProps) => {
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false)
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false)

  const statusItems = useMemo(
    () => STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    []
  )
  const { data: tags = [] } = api.tag.list.useQuery()
  const tagItems = useMemo(
    () => tags.map((t) => ({ value: t.id, label: t.name, color: t.color })),
    [tags]
  )
  const [salaryMinInput, setSalaryMinInput] = useState(
    filters.salaryMin?.toString() ?? ""
  )
  const [salaryMaxInput, setSalaryMaxInput] = useState(
    filters.salaryMax?.toString() ?? ""
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync props → state
    setSalaryMinInput(filters.salaryMin?.toString() ?? "")
  }, [filters.salaryMin])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync props → state
    setSalaryMaxInput(filters.salaryMax?.toString() ?? "")
  }, [filters.salaryMax])

  const { data: clients = [] } = api.clientCompany.list.useQuery()

  const hasActiveFilters = hasActiveOfferFilters(filters)

  const toggleStatus = (status: JobOfferStatus) => {
    const next = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status]
    onFiltersChange({ ...filters, statuses: next })
  }

  const toggleTag = (tagId: string) => {
    const next = filters.tagIds.includes(tagId)
      ? filters.tagIds.filter((id) => id !== tagId)
      : [...filters.tagIds, tagId]
    onFiltersChange({ ...filters, tagIds: next })
  }

  const handleSalaryMinBlur = () => {
    const parsed = salaryMinInput.trim()
      ? parseInt(salaryMinInput.trim(), 10)
      : undefined
    const value =
      parsed !== undefined && !isNaN(parsed) && parsed >= 0
        ? parsed
        : undefined
    if (value !== filters.salaryMin) {
      onFiltersChange({ ...filters, salaryMin: value })
    }
  }

  const handleSalaryMaxBlur = () => {
    const parsed = salaryMaxInput.trim()
      ? parseInt(salaryMaxInput.trim(), 10)
      : undefined
    const value =
      parsed !== undefined && !isNaN(parsed) && parsed >= 0
        ? parsed
        : undefined
    if (value !== filters.salaryMax) {
      onFiltersChange({ ...filters, salaryMax: value })
    }
  }

  const handleSalaryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
        {/* Statuts */}
        <div className="flex min-w-0 flex-col gap-2">
          <label
            htmlFor="filter-offer-statuses"
            className="text-xs text-muted-foreground"
          >
            Statut
          </label>
          <MultiSelectPopover
            triggerId="filter-offer-statuses"
            items={statusItems}
            selectedValues={filters.statuses}
            onToggle={(v) => toggleStatus(v as JobOfferStatus)}
            open={statusPopoverOpen}
            onOpenChange={setStatusPopoverOpen}
            placeholder="Tous les statuts"
            selectedLabel={(n) => `${n} statut(s)`}
          />
        </div>

        {/* Tags */}
        <div className="flex min-w-0 flex-col gap-2">
          <label
            htmlFor="filter-offer-tags"
            className="text-xs text-muted-foreground"
          >
            Tags
          </label>
          <MultiSelectPopover
            triggerId="filter-offer-tags"
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

        {/* Salaire min / max */}
        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-xs text-muted-foreground">Salaire (€)</span>
          <div className="flex items-center gap-2">
            <Input
              id="filter-offer-salary-min"
              type="number"
              min={0}
              placeholder="Min"
              value={salaryMinInput}
              onChange={(e) => setSalaryMinInput(e.target.value)}
              onBlur={handleSalaryMinBlur}
              onKeyDown={handleSalaryKeyDown}
              className="w-24"
              aria-label="Salaire minimum"
            />
            <span className="text-muted-foreground">–</span>
            <Input
              id="filter-offer-salary-max"
              type="number"
              min={0}
              placeholder="Max"
              value={salaryMaxInput}
              onChange={(e) => setSalaryMaxInput(e.target.value)}
              onBlur={handleSalaryMaxBlur}
              onKeyDown={handleSalaryKeyDown}
              className="w-24"
              aria-label="Salaire maximum"
            />
          </div>
        </div>

        {/* Ville */}
        <div className="flex min-w-0 flex-col gap-2">
          <label
            htmlFor="filter-offer-city"
            className="text-xs text-muted-foreground"
          >
            Ville
          </label>
          <CityAutocomplete
            id="filter-offer-city"
            mode="single"
            showChips={false}
            value={filters.city}
            onChange={(city) => onFiltersChange({ ...filters, city })}
            placeholder="Toutes les villes"
          />
        </div>

        {/* Client company */}
        <div className="flex min-w-0 flex-col gap-2">
          <label
            htmlFor="filter-offer-client"
            className="text-xs text-muted-foreground"
          >
            Client
          </label>
          <Select
            value={filters.clientCompanyId ?? "__all__"}
            onValueChange={(v) =>
              onFiltersChange({
                ...filters,
                clientCompanyId: v === "__all__" ? undefined : v,
              })
            }
          >
            <SelectTrigger
              id="filter-offer-client"
              size="sm"
              className="w-full sm:w-48"
            >
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Clear */}
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
