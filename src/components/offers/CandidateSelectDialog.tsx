"use client"

import { useState, useMemo } from "react"
import { Check, Search, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/trpc/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { getInitials } from "@/lib/candidate-utils"

type CandidateRow = {
  id: string
  firstName: string
  lastName: string
  title: string | null
  photoUrl: string | null
}

type Props = {
  offerId: string
  existingCandidateIds: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export const CandidateSelectDialog = ({
  offerId,
  existingCandidateIds,
  open,
  onOpenChange,
  onSuccess,
}: Props) => {
  const [search, setSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const existingSet = useMemo(() => new Set(existingCandidateIds), [existingCandidateIds])

  const listQuery = api.candidate.list.useQuery(
    { limit: 100 },
    { enabled: open, staleTime: 30_000 },
  )

  const filtered = useMemo(() => {
    const candidates: CandidateRow[] = listQuery.data?.items ?? []
    const term = search.trim().toLowerCase()
    if (!term) return candidates
    return candidates.filter((c) => {
      const name = `${c.firstName} ${c.lastName}`.toLowerCase()
      const title = (c.title ?? "").toLowerCase()
      return name.includes(term) || title.includes(term)
    })
  }, [listQuery.data?.items, search])

  const addCandidatesMutation = api.offer.addCandidates.useMutation({
    onSuccess: (data) => {
      toast.success(
        data.count === 1
          ? "1 candidat associé avec succès."
          : `${data.count} candidats associés avec succès.`,
      )
      onOpenChange(false)
      setSelectedIds(new Set())
      setSearch("")
      onSuccess()
    },
    onError: (err) => {
      toast.error(err.message ?? "Une erreur est survenue.")
    },
  })

  const toggleCandidate = (id: string) => {
    if (existingSet.has(id)) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleConfirm = () => {
    if (selectedIds.size === 0) return
    addCandidatesMutation.mutate({
      offerId,
      candidateIds: Array.from(selectedIds),
    })
  }

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setSelectedIds(new Set())
      setSearch("")
    }
    onOpenChange(value)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[80vh] max-w-lg flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 border-b border-border px-6 pb-4 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5" />
            Associer des candidats
          </DialogTitle>
          <DialogDescription className="sr-only">
            Recherchez et sélectionnez un ou plusieurs candidats à associer à cette offre.
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 border-b border-border px-6 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou poste…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              aria-label="Rechercher un candidat"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {listQuery.isLoading ? (
            <div className="space-y-2 px-4 py-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="size-9 animate-pulse rounded-full bg-muted" />
                  <div className="flex-1 space-y-1">
                    <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : listQuery.error ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Impossible de charger les candidats.
            </p>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              {search ? "Aucun résultat pour cette recherche." : "Aucun candidat dans votre cabinet."}
            </p>
          ) : (
            <ul role="listbox" aria-multiselectable="true" aria-label="Liste des candidats">
              {filtered.map((candidate) => {
                const isExisting = existingSet.has(candidate.id)
                const isSelected = selectedIds.has(candidate.id)
                const fullName = `${candidate.firstName} ${candidate.lastName}`

                return (
                  <li key={candidate.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={isExisting}
                      disabled={isExisting}
                      onClick={() => toggleCandidate(candidate.id)}
                      className={[
                        "flex w-full items-center gap-3 rounded-md px-4 py-2.5 text-left transition-colors",
                        isExisting
                          ? "cursor-not-allowed opacity-40"
                          : isSelected
                            ? "bg-primary/10 hover:bg-primary/15"
                            : "hover:bg-muted/60",
                      ].join(" ")}
                    >
                      <Avatar className="size-9 shrink-0">
                        {candidate.photoUrl && (
                          <AvatarImage src={candidate.photoUrl} alt={fullName} />
                        )}
                        <AvatarFallback>
                          {getInitials(candidate.firstName, candidate.lastName)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{fullName}</p>
                        {candidate.title && (
                          <p className="truncate text-xs text-muted-foreground">{candidate.title}</p>
                        )}
                        {isExisting && (
                          <p className="text-xs text-muted-foreground">Déjà associé</p>
                        )}
                      </div>

                      {isSelected && (
                        <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={addCandidatesMutation.isPending}
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={selectedIds.size === 0 || addCandidatesMutation.isPending}
          >
            {addCandidatesMutation.isPending
              ? "Association…"
              : selectedIds.size === 0
                ? "Associer"
                : `Associer (${selectedIds.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
