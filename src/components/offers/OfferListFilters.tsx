"use client"

import { useEffect, useRef, useState } from "react"
import { Check, Filter } from "lucide-react"
import { api } from "@/lib/trpc/client"
import { useDebounce } from "@/hooks/useDebounce"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
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
  location?: string
  clientCompanyId?: string
}

export const hasActiveOfferFilters = (filters: OfferFilters): boolean =>
  filters.statuses.length > 0 ||
  filters.tagIds.length > 0 ||
  filters.salaryMin !== undefined ||
  filters.salaryMax !== undefined ||
  (filters.location?.trim() ?? "").length > 0 ||
  filters.clientCompanyId !== undefined

export const EMPTY_OFFER_FILTERS: OfferFilters = {
  statuses: [],
  tagIds: [],
  salaryMin: undefined,
  salaryMax: undefined,
  location: undefined,
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
  const [locationInput, setLocationInput] = useState(filters.location ?? "")
  const [salaryMinInput, setSalaryMinInput] = useState(
    filters.salaryMin?.toString() ?? ""
  )
  const [salaryMaxInput, setSalaryMaxInput] = useState(
    filters.salaryMax?.toString() ?? ""
  )

  const debouncedLocation = useDebounce(locationInput.trim(), 300)
  const filtersRef = useRef(filters)
  filtersRef.current = filters

  useEffect(() => {
    setLocationInput(filters.location ?? "")
  }, [filters.location])

  useEffect(() => {
    setSalaryMinInput(filters.salaryMin?.toString() ?? "")
  }, [filters.salaryMin])

  useEffect(() => {
    setSalaryMaxInput(filters.salaryMax?.toString() ?? "")
  }, [filters.salaryMax])

  useEffect(() => {
    const nextLocation = debouncedLocation || undefined
    const currentLocation = filtersRef.current.location ?? undefined
    if (nextLocation !== currentLocation) {
      onFiltersChange({ ...filtersRef.current, location: nextLocation })
    }
  }, [debouncedLocation, onFiltersChange])

  const { data: tags = [] } = api.tag.list.useQuery()
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
          <Popover open={statusPopoverOpen} onOpenChange={setStatusPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                id="filter-offer-statuses"
                variant="outline"
                size="sm"
                className="w-full justify-between text-left font-normal sm:w-48"
                aria-expanded={statusPopoverOpen}
                aria-haspopup="listbox"
              >
                {filters.statuses.length > 0
                  ? `${filters.statuses.length} statut(s)`
                  : "Tous les statuts"}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-2">
              <ul
                role="listbox"
                aria-multiselectable
                className="max-h-60 overflow-y-auto"
              >
                {STATUS_OPTIONS.map((opt) => {
                  const selected = filters.statuses.includes(opt.value)
                  return (
                    <li
                      key={opt.value}
                      role="option"
                      aria-selected={selected}
                    >
                      <button
                        type="button"
                        className={cn(
                          "flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                          selected && "bg-accent/80"
                        )}
                        onClick={() => toggleStatus(opt.value)}
                      >
                        <span
                          className="flex size-4 shrink-0 items-center justify-center rounded border border-border"
                          aria-hidden
                        >
                          {selected ? (
                            <Check className="size-3 text-foreground" />
                          ) : null}
                        </span>
                        <span className="truncate">{opt.label}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </PopoverContent>
          </Popover>
        </div>

        {/* Tags */}
        <div className="flex min-w-0 flex-col gap-2">
          <label
            htmlFor="filter-offer-tags"
            className="text-xs text-muted-foreground"
          >
            Tags
          </label>
          <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                id="filter-offer-tags"
                variant="outline"
                size="sm"
                className="w-full justify-between text-left font-normal sm:w-48"
                aria-expanded={tagPopoverOpen}
                aria-haspopup="listbox"
              >
                {filters.tagIds.length > 0
                  ? `${filters.tagIds.length} tag(s) sélectionné(s)`
                  : "Sélectionner des tags"}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-2">
              {tags.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Aucun tag disponible
                </p>
              ) : (
                <ul
                  role="listbox"
                  aria-multiselectable
                  className="max-h-60 overflow-y-auto"
                >
                  {tags.map((tag) => {
                    const selected = filters.tagIds.includes(tag.id)
                    return (
                      <li
                        key={tag.id}
                        role="option"
                        aria-selected={selected}
                      >
                        <button
                          type="button"
                          className={cn(
                            "flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                            selected && "bg-accent/80"
                          )}
                          onClick={() => toggleTag(tag.id)}
                        >
                          <span
                            className="flex size-4 shrink-0 items-center justify-center rounded border border-border"
                            aria-hidden
                          >
                            {selected ? (
                              <Check className="size-3 text-foreground" />
                            ) : null}
                          </span>
                          <span
                            className="inline-block size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="truncate">{tag.name}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </PopoverContent>
          </Popover>
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

        {/* Location */}
        <div className="flex min-w-0 flex-col gap-2">
          <label
            htmlFor="filter-offer-location"
            className="text-xs text-muted-foreground"
          >
            Ville
          </label>
          <Input
            id="filter-offer-location"
            type="text"
            placeholder="Ex: Paris"
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            className="w-full sm:w-40"
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
