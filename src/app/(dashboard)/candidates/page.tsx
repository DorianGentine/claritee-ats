"use client"

import { useState, useCallback, useEffect, useMemo, useRef } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { keepPreviousData } from "@tanstack/react-query"
import { api } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { CandidateCard } from "@/components/candidates/CandidateCard"
import {
  CandidateListFilters,
  type CandidateFilters,
} from "@/components/candidates/CandidateListFilters"
import { ActiveFilterChips } from "@/components/candidates/ActiveFilterChips"

const PAGE_SIZE = 20

const FILTER_TAGS_PARAM = "tags"
const FILTER_CITY_PARAM = "city"
const FILTER_LANGUAGES_PARAM = "languages"

const parseFiltersFromSearchParams = (
  params: URLSearchParams
): CandidateFilters => {
  const tagsParam = params.get(FILTER_TAGS_PARAM)
  const tagIds = tagsParam
    ? tagsParam
        .split(",")
        .map((s) => s.trim())
        .filter((s) => /^[0-9a-f-]{36}$/i.test(s))
        .slice(0, 20)
    : []
  const city = params.get(FILTER_CITY_PARAM)?.trim() || undefined
  const languagesParam = params.get(FILTER_LANGUAGES_PARAM)
  const languageNames = languagesParam
    ? languagesParam
        .split(",")
        .map((s) => decodeURIComponent(s.trim()))
        .filter((s) => s.length > 0 && s.length <= 50)
        .slice(0, 20)
    : []
  return { tagIds, city, languageNames }
}

const buildSearchParams = (filters: CandidateFilters): URLSearchParams => {
  const params = new URLSearchParams()
  if (filters.tagIds.length > 0) {
    params.set(FILTER_TAGS_PARAM, filters.tagIds.join(","))
  }
  if (filters.city?.trim()) {
    params.set(FILTER_CITY_PARAM, filters.city.trim())
  }
  if (filters.languageNames.length > 0) {
    params.set(
      FILTER_LANGUAGES_PARAM,
      filters.languageNames.map((n) => encodeURIComponent(n)).join(",")
    )
  }
  return params
}

const CandidateListSkeleton = () => (
  <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
    {Array.from({ length: 6 }).map((_, i) => (
      <li
        key={i}
        className="h-[130px] rounded-lg border border-border bg-card p-4 shadow-sm"
      >
        <div className="flex gap-4">
          <div className="size-12 shrink-0 animate-pulse rounded-full bg-muted" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </li>
    ))}
  </ul>
)

export default function CandidatesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const filters = useMemo(
    () => parseFiltersFromSearchParams(searchParams),
    [searchParams]
  )
  const filtersRef = useRef(filters)
  useEffect(() => {
    filtersRef.current = filters
  }, [filters])

  const syncUrl = useCallback(
    (nextFilters: CandidateFilters) => {
      const params = buildSearchParams(nextFilters)
      const qs = params.toString()
      const path = `/candidates${qs ? `?${qs}` : ""}`
      router.replace(path, { scroll: false })
    },
    [router]
  )

  const handleFiltersChange = useCallback(
    (nextFilters: CandidateFilters) => {
      setCursor(undefined)
      syncUrl(nextFilters)
    },
    [syncUrl]
  )

  const handleClearFilters = useCallback(() => {
    setCursor(undefined)
    syncUrl({ tagIds: [], city: undefined, languageNames: [] })
  }, [syncUrl])

  const handleRemoveTag = useCallback(
    (tagId: string) => {
      const current = filtersRef.current
      handleFiltersChange({
        ...current,
        tagIds: current.tagIds.filter((id) => id !== tagId),
      })
    },
    [handleFiltersChange]
  )

  const handleRemoveCity = useCallback(() => {
    const current = filtersRef.current
    handleFiltersChange({ ...current, city: undefined })
  }, [handleFiltersChange])

  const handleRemoveLanguage = useCallback(
    (name: string) => {
      const current = filtersRef.current
      handleFiltersChange({
        ...current,
        languageNames: current.languageNames.filter((n) => n !== name),
      })
    },
    [handleFiltersChange]
  )

  const listQuery = api.candidate.list.useQuery(
    {
      limit: PAGE_SIZE,
      ...(cursor ? { cursor } : {}),
      ...(filters.tagIds.length > 0 ? { tagIds: filters.tagIds } : {}),
      ...(filters.city?.trim() ? { city: filters.city.trim() } : {}),
      ...(filters.languageNames.length > 0
        ? { languageNames: filters.languageNames }
        : {}),
    },
    { placeholderData: keepPreviousData }
  )

  const items = listQuery.data?.items ?? []
  const nextCursor = listQuery.data?.nextCursor ?? null
  const isLoading = listQuery.isLoading
  const isFetching = listQuery.isFetching
  const isError = listQuery.isError
  const displayCount = items.length

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background p-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Candidats
          </h1>
          <Button variant="default" size="default" asChild>
            <Link href="/candidates/new">Nouveau candidat</Link>
          </Button>
        </div>

        <div className="mt-6">
          <CandidateListFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClear={handleClearFilters}
          />
        </div>

        {(filters.tagIds.length > 0 ||
          (filters.city?.trim() ?? "").length > 0 ||
          filters.languageNames.length > 0) && (
          <div className="mt-4">
            <ActiveFilterChips
              filters={filters}
              totalCount={displayCount}
              isLoading={isFetching}
              onRemoveTag={handleRemoveTag}
              onRemoveCity={handleRemoveCity}
              onRemoveLanguage={handleRemoveLanguage}
            />
          </div>
        )}

        {isError ? (
          <section
            className="mt-8 flex flex-col items-center justify-center rounded-lg border border-border bg-card/50 py-16 text-center"
            aria-label="Erreur de chargement"
          >
            <p className="text-muted-foreground">
              Une erreur est survenue lors du chargement des candidats.
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
            <CandidateListSkeleton />
          </div>
        ) : items.length === 0 ? (
          <section
            className="mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 py-16 text-center"
            aria-label="Aucun candidat"
          >
            <p className="text-muted-foreground">
              {filters.tagIds.length > 0 ||
              filters.city?.trim() ||
              filters.languageNames.length > 0
                ? "Aucun candidat ne correspond aux filtres."
                : "Vous n'avez pas encore de candidat."}
            </p>
            {filters.tagIds.length > 0 ||
            filters.city?.trim() ||
            filters.languageNames.length > 0 ? (
              <Button
                variant="outline"
                className="mt-4"
                onClick={handleClearFilters}
              >
                Effacer les filtres
              </Button>
            ) : (
              <Button variant="default" className="mt-4" asChild>
                <Link href="/candidates/new">Ajouter un candidat</Link>
              </Button>
            )}
          </section>
        ) : (
          <>
            <ul
              className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              aria-busy={isFetching}
            >
              {items.map((c) => (
                <li key={c.id}>
                  <CandidateCard c={c} />
                </li>
              ))}
            </ul>

            {(nextCursor || cursor) ? (
              <nav
                className="mt-6 flex justify-center gap-2"
                aria-label="Pagination de la liste des candidats"
              >
                {cursor ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isFetching}
                    onClick={() => setCursor(undefined)}
                    aria-label="Page précédente"
                  >
                    Précédent
                  </Button>
                ) : null}
                {nextCursor ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isFetching}
                    onClick={() => setCursor(nextCursor)}
                    aria-label="Page suivante"
                  >
                    Suivant
                  </Button>
                ) : null}
              </nav>
            ) : null}
          </>
        )}
      </div>
    </main>
  )
}
