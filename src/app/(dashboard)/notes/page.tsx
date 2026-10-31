"use client"

import { useEffect, useRef, useState } from "react"
import { api } from "@/lib/trpc/client"
import {
  getNoteDisplayTitle,
  getNoteExcerpt,
  isNoteContentEmpty,
} from "@/lib/note-utils"
import { formatDateLong } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import {
  NoteEditor,
  type NoteEditorRef,
} from "@/components/shared/NoteEditor"
import {
  ChevronsUpDown,
  Pencil,
  Trash2,
  Maximize2,
  Minimize2,
} from "lucide-react"
import { useDebounce } from "@/hooks/useDebounce"
import type { RouterOutputs } from "@/lib/trpc/client"
import { toast } from "sonner"

type NoteItem = RouterOutputs["note"]["listFree"][number]

type MoveTarget = { id: string; label: string; subtitle?: string }

const MIN_SEARCH_LENGTH = 2

/** Combobox recherchable (recherche serveur) pour déplacer une note vers un candidat ou une offre. */
const MoveToCombobox = ({
  kind,
  isPending,
  placeholder,
  searchPlaceholder,
  onSelect,
}: {
  kind: "candidates" | "offers"
  isPending: boolean
  placeholder: string
  searchPlaceholder: string
  onSelect: (target: MoveTarget) => void
}) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebounce(query.trim(), 300)
  const hasMinQuery = debouncedQuery.length >= MIN_SEARCH_LENGTH

  const searchQuery = api.search.search.useQuery(
    { q: debouncedQuery, limit: 20 },
    { enabled: open && hasMinQuery }
  )

  const targets: MoveTarget[] =
    kind === "candidates"
      ? (searchQuery.data?.candidates ?? []).map((candidate) => ({
          id: candidate.id,
          label: getCandidateName(candidate),
          subtitle: candidate.title ?? undefined,
        }))
      : (searchQuery.data?.offers ?? []).map((offer) => ({
          id: offer.id,
          label: offer.title,
          subtitle: offer.clientCompany?.name,
        }))

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) setQuery("")
  }

  const handleSelect = (target: MoveTarget) => {
    handleOpenChange(false)
    onSelect(target)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          aria-expanded={open}
          aria-haspopup="listbox"
          className="w-full max-w-60 justify-between font-normal text-muted-foreground sm:w-60"
        >
          <span className="truncate">{placeholder}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            maxLength={100}
            placeholder={searchPlaceholder}
          />
          <CommandList>
            {hasMinQuery && targets.length > 0 ? (
              targets.map((target) => (
                <CommandItem
                  key={target.id}
                  value={target.id}
                  onSelect={() => handleSelect(target)}
                  className="flex flex-col items-start gap-0.5"
                >
                  <span className="truncate">{target.label}</span>
                  {target.subtitle ? (
                    <span className="truncate text-xs text-muted-foreground">
                      {target.subtitle}
                    </span>
                  ) : null}
                </CommandItem>
              ))
            ) : query.trim().length < MIN_SEARCH_LENGTH ? (
              <CommandEmpty>Saisir au moins 2 caractères</CommandEmpty>
            ) : searchQuery.isLoading || query.trim() !== debouncedQuery ? (
              <CommandEmpty>Recherche…</CommandEmpty>
            ) : searchQuery.isError ? (
              <CommandEmpty>Erreur lors de la recherche</CommandEmpty>
            ) : (
              <CommandEmpty>Aucun résultat</CommandEmpty>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

const getCandidateName = (candidate: {
  firstName: string | null
  lastName: string | null
}) =>
  [candidate.firstName, candidate.lastName].filter(Boolean).join(" ") ||
  "Sans nom"

export default function NotesPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [hasChanges, setHasChanges] = useState(false)
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false)
  const [isModalFullscreen, setIsModalFullscreen] = useState(false)
  const editorRef = useRef<NoteEditorRef>(null)
  const initialTitleRef = useRef<string>("")
  const initialContentRef = useRef<string>("")
  const currentContentRef = useRef<string>("")

  const utils = api.useUtils()
  const freeNotesQuery = api.note.listFree.useQuery()
  const notes = freeNotesQuery.data ?? []
  const selectedNote = selectedId ? notes.find((n) => n.id === selectedId) : null

  const closeAndRefresh = () => {
    setSelectedId(null)
    void utils.note.listFree.invalidate()
  }

  const updateMutation = api.note.update.useMutation({
    onSuccess: () => {
      void utils.note.listFree.invalidate()
    },
  })
  const deleteMutation = api.note.delete.useMutation({
    onSuccess: () => {
      setDeleteId(null)
      toast.success("Note supprimée")
      closeAndRefresh()
    },
    onError: () => {
      toast.error("Impossible de supprimer la note")
    },
  })
  const moveToCandidateMutation = api.note.moveToCandidate.useMutation({
    onSuccess: () => closeAndRefresh(),
    onError: () => toast.error("Impossible de déplacer la note"),
  })
  const moveToOfferMutation = api.note.moveToOffer.useMutation({
    onSuccess: () => closeAndRefresh(),
    onError: () => toast.error("Impossible de déplacer la note"),
  })

  const handleMoveToCandidate = (target: MoveTarget) => {
    if (!selectedId) return
    moveToCandidateMutation.mutate(
      { id: selectedId, candidateId: target.id },
      { onSuccess: () => toast.success(`Note déplacée vers ${target.label}`) }
    )
  }

  const handleMoveToOffer = (target: MoveTarget) => {
    if (!selectedId) return
    moveToOfferMutation.mutate(
      { id: selectedId, offerId: target.id },
      { onSuccess: () => toast.success(`Note déplacée vers ${target.label}`) }
    )
  }

  const handleOpenNote = (note: NoteItem) => {
    setSelectedId(note.id)
    setIsModalFullscreen(false)
    const initialTitle = note.title?.trim() ?? ""
    const initialContent = note.content
    setEditTitle(initialTitle)
    initialTitleRef.current = initialTitle
    initialContentRef.current = initialContent
    currentContentRef.current = initialContent
    setHasChanges(false)
  }

  const handleCloseDetail = () => {
    if (hasChanges) {
      setUnsavedDialogOpen(true)
      return
    }
    setSelectedId(null)
    setHasChanges(false)
  }

  const handleSaveClick = () => {
    if (!selectedId) return
    const content = editorRef.current?.getContent()
    if (!content || isNoteContentEmpty(content)) return
    updateMutation.mutate({
      id: selectedId,
      content,
      title: editTitle.trim() || undefined,
    })
    initialTitleRef.current = editTitle.trim() || ""
    initialContentRef.current = content
    currentContentRef.current = content
    setHasChanges(false)
  }

  const handleDeleteConfirm = () => {
    if (!deleteId) return
    deleteMutation.mutate({ id: deleteId })
  }

  const handleContentChange = (content: string) => {
    currentContentRef.current = content
    const titleChanged =
      editTitle.trim() !== (initialTitleRef.current || "")
    const contentChanged = content !== (initialContentRef.current || "")
    setHasChanges(titleChanged || contentChanged)
  }

  const handleTitleChange = (value: string) => {
    setEditTitle(value)
    const titleChanged = value.trim() !== (initialTitleRef.current || "")
    const contentChanged =
      currentContentRef.current !== (initialContentRef.current || "")
    setHasChanges(titleChanged || contentChanged)
  }

  const handleConfirmDiscard = () => {
    setUnsavedDialogOpen(false)
    setHasChanges(false)
    setSelectedId(null)
  }

  const handleCancelDiscard = () => {
    setUnsavedDialogOpen(false)
  }

  useEffect(() => {
    if (!hasChanges) return
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      ;(event as unknown as { returnValue: string }).returnValue = ""
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [hasChanges])

  return (
    <main className="p-6 lg:p-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Mes notes
        </h1>

        {freeNotesQuery.isLoading ? (
          <p className="mt-6 text-sm text-muted-foreground">Chargement…</p>
        ) : notes.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground" role="status">
            Aucune note
          </p>
        ) : (
          <ul className="mt-6 flex flex-col gap-3" aria-label="Liste des notes">
            {notes.map((note) => (
              <li key={note.id} className="group relative">
                <button
                  type="button"
                  onClick={() => handleOpenNote(note)}
                  className="flex w-full flex-col gap-1 rounded-lg border border-border bg-card p-4 pr-12 text-left shadow-sm transition-colors hover:border-primary/30 hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Ouvrir la note : ${getNoteDisplayTitle(note.title, note.content)}`}
                >
                  <span className="truncate font-medium text-foreground">
                    {getNoteDisplayTitle(note.title, note.content)}
                  </span>
                  {getNoteExcerpt(note.content) ? (
                    <span className="line-clamp-2 text-sm text-muted-foreground">
                      {getNoteExcerpt(note.content)}
                    </span>
                  ) : null}
                  <span className="text-xs text-muted-foreground">
                    Modifié le {formatDateLong(note.updatedAt)}
                  </span>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDeleteId(note.id)}
                  className="absolute top-3 right-3 text-muted-foreground opacity-100 hover:text-destructive focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label={`Supprimer la note : ${getNoteDisplayTitle(note.title, note.content)}`}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={!!selectedNote} onOpenChange={(open) => !open && handleCloseDetail()}>
        <DialogContent
          className={
            isModalFullscreen
              ? "inset-4! translate-x-0! translate-y-0! max-w-none! max-h-[calc(100vh-2rem)] flex flex-col"
              : "max-h-[90vh] max-w-2xl flex flex-col"
          }
          showClose={false}
        >
          <DialogHeader>
            <div className="flex items-center justify-between gap-2">
              <DialogTitle>Éditer la note</DialogTitle>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setIsModalFullscreen((v) => !v)}
                  aria-label={
                    isModalFullscreen ? "Réduire la fenêtre" : "Agrandir en plein écran"
                  }
                >
                  {isModalFullscreen ? (
                    <Minimize2 className="size-4" aria-hidden />
                  ) : (
                    <Maximize2 className="size-4" aria-hidden />
                  )}
                </Button>
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Fermer"
                  >
                    ×
                  </Button>
                </DialogClose>
              </div>
            </div>
          </DialogHeader>
          <div className="flex flex-1 flex-col gap-4 overflow-hidden min-h-0">
            <div className="space-y-2">
              <label htmlFor="note-title" className="text-sm font-medium">
                Titre
              </label>
              <Input
                id="note-title"
                value={editTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Sans titre"
                className="w-full"
              />
            </div>
            <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
              <label className="text-sm font-medium mb-2">Contenu</label>
              <div className="min-h-[200px] overflow-auto rounded-md border border-border bg-white">
                {selectedNote && (
                  <NoteEditor
                    ref={editorRef}
                    key={selectedNote.id}
                    initialContent={selectedNote.content}
                    editable
                    onRawContentChange={handleContentChange}
                  />
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
              <span className="text-sm text-muted-foreground">Déplacer vers :</span>
              <MoveToCombobox
                kind="candidates"
                isPending={moveToCandidateMutation.isPending}
                placeholder="Choisir un candidat…"
                searchPlaceholder="Rechercher un candidat…"
                onSelect={handleMoveToCandidate}
              />
              <MoveToCombobox
                kind="offers"
                isPending={moveToOfferMutation.isPending}
                placeholder="Choisir une offre…"
                searchPlaceholder="Rechercher une offre…"
                onSelect={handleMoveToOffer}
              />
            </div>
          </div>
          <DialogFooter className="flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectedId && setDeleteId(selectedId)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-4 mr-2" aria-hidden />
              Supprimer
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSaveClick}
              disabled={updateMutation.isPending}
            >
              <Pencil className="size-4 mr-2" aria-hidden />
              {updateMutation.isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Supprimer la note ?"
        description="Cette action est irréversible."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        pending={deleteMutation.isPending}
        pendingLabel="Suppression…"
        onConfirm={handleDeleteConfirm}
      />

      <ConfirmDialog
        open={unsavedDialogOpen}
        onOpenChange={(open) => !open && handleCancelDiscard()}
        title="Modifications non enregistrées"
        description="Vous avez des modifications non enregistrées. Quitter sans enregistrer ?"
        confirmLabel="Quitter sans enregistrer"
        cancelLabel="Continuer l'édition"
        onConfirm={handleConfirmDiscard}
      />
    </main>
  )
}
