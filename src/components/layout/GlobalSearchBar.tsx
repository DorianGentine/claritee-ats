"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { api } from "@/lib/trpc/client"
import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"

const DEBOUNCE_MS = 300
const SEARCH_STALE_TIME_MS = 60 * 1000

const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

type Props = {
  /** Sur desktop, réduit le déclencheur à une icône (menu latéral replié). */
  compact?: boolean
}

export const GlobalSearchBar = ({ compact = false }: Props) => {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)

  const trimmedQuery = query.trim()
  const debouncedQuery = useDebounce(trimmedQuery, DEBOUNCE_MS)
  const effectiveQuery = debouncedQuery.length >= 2 ? debouncedQuery : ""

  const { data, isLoading } = api.search.search.useQuery(
    { q: effectiveQuery },
    {
      enabled: effectiveQuery.length >= 2,
      placeholderData: (previousData) => previousData,
      staleTime: SEARCH_STALE_TIME_MS,
    }
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(true)
      }
    },
    []
  )

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  const hasResults =
    data &&
    (data.candidates.length > 0 || data.offers.length > 0)
  const isEmpty = effectiveQuery.length >= 2 && data && !hasResults

  const selectResult = useCallback(
    (path: string) => {
      setOpen(false)
      setQuery("")
      router.push(path)
    },
    [router]
  )

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Rechercher candidats et offres"
        aria-expanded={open}
        title={compact ? "Rechercher (⌘K)" : undefined}
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-full border border-border bg-card px-4 text-sm text-muted-foreground transition-colors hover:border-input hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          compact && "lg:justify-center lg:px-0"
        )}
      >
        <Search className="size-4 shrink-0" aria-hidden />
        <span className={cn("flex-1 text-left", compact && "lg:hidden")}>
          Rechercher…
        </span>
        <kbd
          className={cn(
            "rounded-md border border-border bg-muted px-1.5 font-sans text-[0.7rem] text-muted-foreground",
            compact && "lg:hidden"
          )}
        >
          ⌘K
        </kbd>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="top-[20vh] translate-y-0 max-w-[600px] p-0 gap-0 overflow-hidden"
          showClose={false}
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">
            Recherche candidats et offres
          </DialogTitle>
        <Command
          label="Résultats de recherche"
          shouldFilter={false}
          className="rounded-lg border-0 shadow-none"
        >
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Rechercher candidats, offres..."
            aria-label="Rechercher candidats et offres"
          />
          <CommandList className="max-h-[min(60vh,400px)]">
            {trimmedQuery.length < 2 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Tapez au moins 2 caractères pour rechercher
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                Chargement…
              </div>
            ) : isEmpty ? (
              <CommandEmpty>
                Aucun résultat pour "{effectiveQuery}"
              </CommandEmpty>
            ) : (
              <>
                {data && data.candidates.length > 0 && (
                  <CommandGroup heading="CANDIDATS">
                    {data.candidates.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={`candidate-${c.id}`}
                        onSelect={() =>
                          selectResult(`/candidates/${c.id}`)
                        }
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">
                            {c.firstName} {c.lastName}
                          </span>
                          {c.title && (
                            <span className="text-xs text-muted-foreground">
                              {c.title}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {data && data.offers.length > 0 && (
                  <CommandGroup heading="OFFRES">
                    {data.offers.map((o) => (
                      <CommandItem
                        key={o.id}
                        value={`offer-${o.id}`}
                        onSelect={() =>
                          selectResult(`/offers/${o.id}`)
                        }
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">{o.title}</span>
                          {o.clientCompany?.name && (
                            <span className="text-xs text-muted-foreground">
                              {o.clientCompany.name}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {hasResults && (
                  <div className="border-t border-border p-1">
                    <CommandItem
                      value="voir-tous-resultats"
                      onSelect={() => {
                        setOpen(false)
                        setQuery("")
                        router.push(`/search?q=${encodeURIComponent(effectiveQuery)}`)
                      }}
                      className="text-primary"
                    >
                      Voir tous les résultats
                    </CommandItem>
                  </div>
                )}
              </>
            )}
          </CommandList>
        </Command>
        </DialogContent>
      </Dialog>
    </>
  )
}
