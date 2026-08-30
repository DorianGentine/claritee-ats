"use client"

import { useCallback, useState } from "react"
import Link from "next/link"
import { api } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { JobOfferCard } from "@/components/offers/JobOfferCard"
import {
  OfferListFilters,
  EMPTY_OFFER_FILTERS,
  hasActiveOfferFilters,
  type OfferFilters,
} from "@/components/offers/OfferListFilters"
import { ActiveOfferFilterChips } from "@/components/offers/ActiveOfferFilterChips"

type SortOption = "createdAt_desc" | "createdAt_asc" | "status_asc" | "status_desc"

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "createdAt_desc", label: "Date de création (plus récentes d'abord)" },
  { value: "createdAt_asc", label: "Date de création (plus anciennes d'abord)" },
  { value: "status_asc", label: "Par statut (A–Z)" },
  { value: "status_desc", label: "Par statut (Z–A)" },
]

const isSortOption = (value: string): value is SortOption =>
  SORT_OPTIONS.some((opt) => opt.value === value)

const parseSort = (v: SortOption) => {
  const [by, order] = v.split("_") as ["createdAt" | "status", "asc" | "desc"]
  return { sortBy: by, sortOrder: order }
}

const OfferListSkeleton = () => (
  <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
    {Array.from({ length: 6 }).map((_, i) => (
      <li
        key={i}
        className="h-[160px] rounded-lg border border-border bg-card p-4 shadow-sm"
      >
        <div className="space-y-2">
          <div className="h-5 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        </div>
      </li>
    ))}
  </ul>
)

const PAGE_SIZE = 20

export default function OffersPage() {
  const [sortOption, setSortOption] = useState<SortOption>("createdAt_desc")
  const [filters, setFilters] = useState<OfferFilters>(EMPTY_OFFER_FILTERS)
  const { sortBy, sortOrder } = parseSort(sortOption)

  const listQuery = api.offer.list.useQuery({
    page: 1,
    pageSize: PAGE_SIZE,
    sortBy,
    sortOrder,
    statuses: filters.statuses.length > 0 ? filters.statuses : undefined,
    tagIds: filters.tagIds.length > 0 ? filters.tagIds : undefined,
    salaryMin: filters.salaryMin,
    salaryMax: filters.salaryMax,
    clientCompanyId: filters.clientCompanyId,
    cityId: filters.city?.id,
  })
  const data = listQuery.data
  const items = data?.items ?? []
  const totalCount = data?.totalCount ?? 0
  const isLoading = listQuery.isLoading
  const isError = listQuery.isError

  const hasActiveFilters = hasActiveOfferFilters(filters)

  const handleClearFilters = useCallback(() => {
    setFilters(EMPTY_OFFER_FILTERS)
  }, [])

  const handleFiltersChange = useCallback((next: OfferFilters) => {
    setFilters(next)
  }, [])

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background p-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Offres
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={sortOption}
              onValueChange={(v) =>
                setSortOption(isSortOption(v) ? v : "createdAt_desc")
              }
              aria-label="Trier par"
            >
              <SelectTrigger size="default" className="min-w-56">
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="default" size="default" asChild>
              <Link href="/offers/new">Nouvelle offre</Link>
            </Button>
          </div>
        </div>

        <div className="mt-4">
          <OfferListFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClear={handleClearFilters}
          />
        </div>

        {hasActiveFilters && (
          <div className="mt-3">
            <ActiveOfferFilterChips
              filters={filters}
              totalCount={totalCount}
              isLoading={isLoading}
              onRemoveStatus={(status) =>
                setFilters((f) => ({
                  ...f,
                  statuses: f.statuses.filter((s) => s !== status),
                }))
              }
              onRemoveTag={(tagId) =>
                setFilters((f) => ({
                  ...f,
                  tagIds: f.tagIds.filter((id) => id !== tagId),
                }))
              }
              onRemoveSalaryMin={() =>
                setFilters((f) => ({ ...f, salaryMin: undefined }))
              }
              onRemoveSalaryMax={() =>
                setFilters((f) => ({ ...f, salaryMax: undefined }))
              }
              onRemoveCity={() => setFilters((f) => ({ ...f, city: null }))}
              onRemoveClientCompany={() =>
                setFilters((f) => ({ ...f, clientCompanyId: undefined }))
              }
            />
          </div>
        )}

        {isError ? (
          <section
            className="mt-8 flex flex-col items-center justify-center rounded-lg border border-border bg-card/50 py-16 text-center"
            aria-label="Erreur de chargement"
          >
            <p className="text-muted-foreground">
              Une erreur est survenue lors du chargement des offres.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => listQuery.refetch()}
            >
              Réessayer
            </Button>
          </section>
        ) : isLoading ? (
          <div className="mt-6">
            <OfferListSkeleton />
          </div>
        ) : items.length === 0 ? (
          <section
            className="mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 py-16 text-center"
            aria-label="Aucune offre"
          >
            <p className="text-muted-foreground">
              {hasActiveFilters
                ? "Aucune offre ne correspond aux filtres sélectionnés."
                : "Aucune offre créée."}
            </p>
            {!hasActiveFilters && (
              <Button variant="default" className="mt-4" asChild>
                <Link href="/offers/new">Nouvelle offre</Link>
              </Button>
            )}
            {hasActiveFilters && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={handleClearFilters}
              >
                Effacer les filtres
              </Button>
            )}
          </section>
        ) : (
          <>
            {!hasActiveFilters && totalCount > 0 ? (
              <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
                {totalCount <= PAGE_SIZE
                  ? `${totalCount} offre${totalCount > 1 ? "s" : ""}`
                  : `1–${PAGE_SIZE} sur ${totalCount} offres`}
              </p>
            ) : null}
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((offer) => (
                <li key={offer.id}>
                  <JobOfferCard
                    offer={{
                      id: offer.id,
                      title: offer.title,
                      cityName: offer.cityName,
                      salaryMin: offer.salaryMin,
                      salaryMax: offer.salaryMax,
                      status: offer.status,
                      clientCompanyName: offer.clientCompanyName,
                      tags: offer.tags ?? [],
                      tagCount: offer.tagCount ?? 0,
                    }}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </main>
  )
}
