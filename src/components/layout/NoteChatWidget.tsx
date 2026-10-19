"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { api } from "@/lib/trpc/client"
import {
  NoteEditor,
  type NoteEditorRef,
} from "@/components/shared/NoteEditor"
import { getNoteDisplayTitle, isNoteContentEmpty } from "@/lib/note-utils"
import { clearNoteDraft, readNoteDraft, writeNoteDraft } from "@/lib/note-draft"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { StickyNote, X, ChevronDown, FileText, Maximize2, Minimize2 } from "lucide-react"

const DEBOUNCE_MS = 2000
const SAVE_ERROR_MESSAGE = "Impossible d'enregistrer la note"

type PendingUpdate = { noteId: string; content: string }

/**
 * Notes libres rapides (Cmd/Ctrl+J).
 * - Note existante : enregistrée automatiquement (debounce), la modification en attente
 *   reste liée à sa note même si la sélection change.
 * - Nouvelle note : brouillon dans le navigateur (`note-draft`) à chaque frappe, créée
 *   en base seulement à la fermeture du widget ou au changement de note. Une seule
 *   création à la fois : l'éditeur de nouvelle note attend la fin de la précédente.
 *   En cas d'échec, le widget se rouvre sur le brouillon, intact.
 */
export const NoteChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  /** Incrémenté pour remonter l'éditeur de nouvelle note (relit le brouillon) */
  const [newNoteKey, setNewNoteKey] = useState(0)
  const [listOpen, setListOpen] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingUpdateRef = useRef<PendingUpdate | null>(null)
  /** Afficher la note créée à la fin de la création (fermeture du widget uniquement) */
  const selectCreatedNoteRef = useRef(false)
  const editorRef = useRef<NoteEditorRef>(null)
  const utils = api.useUtils()

  const meQuery = api.auth.getMe.useQuery(undefined, { enabled: isOpen })
  /** Propriétaire du brouillon local ; repli si l'utilisateur n'a pas pu être chargé */
  const draftOwnerId = meQuery.data?.id ?? "current"
  const freeNotesQuery = api.note.listFree.useQuery(undefined, { enabled: isOpen })
  const notes = freeNotesQuery.data ?? []
  const selectedNote = selectedNoteId
    ? notes.find((note) => note.id === selectedNoteId)
    : null

  const createMutation = api.note.create.useMutation({
    onSuccess: (createdNote) => {
      clearNoteDraft(draftOwnerId)
      setSaveError(null)
      // Ne pas arracher l'utilisateur à une note existante ouverte entre-temps
      if (selectCreatedNoteRef.current) {
        setSelectedNoteId((currentId) => currentId ?? createdNote.id)
      }
      void utils.note.listFree.invalidate()
    },
    onError: () => {
      // Le brouillon est toujours dans le navigateur : rouvrir dessus
      setSelectedNoteId(null)
      setNewNoteKey((key) => key + 1)
      setSaveError(SAVE_ERROR_MESSAGE)
      setIsOpen(true)
    },
  })

  const updateMutation = api.note.update.useMutation({
    onSuccess: () => {
      setSaveError(null)
      void utils.note.listFree.invalidate()
    },
    onError: (_error, failedUpdate) => {
      // Le cache garde le texte (écrit à l'envoi) : rouvrir la note, et remettre la
      // modification en attente pour la renvoyer au prochain enregistrement
      savePendingRef.current()
      pendingUpdateRef.current = {
        noteId: failedUpdate.id,
        content: failedUpdate.content ?? "",
      }
      setSelectedNoteId(failedUpdate.id)
      setSaveError(SAVE_ERROR_MESSAGE)
      setIsOpen(true)
    },
  })

  /** Envoie la modification en attente d'une note existante. */
  const savePending = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
    const pendingUpdate = pendingUpdateRef.current
    pendingUpdateRef.current = null
    if (!pendingUpdate || isNoteContentEmpty(pendingUpdate.content)) return
    // Cache mis à jour dès l'envoi : rouvrir la note (widget fermé, requête désactivée,
    // pas de refetch) ne doit pas remonter l'éditeur sur l'ancien contenu
    utils.note.listFree.setData(undefined, (cachedNotes) =>
      cachedNotes?.map((note) =>
        note.id === pendingUpdate.noteId
          ? { ...note, content: pendingUpdate.content }
          : note
      )
    )
    updateMutation.mutate({ id: pendingUpdate.noteId, content: pendingUpdate.content })
  }, [updateMutation, utils])

  const savePendingRef = useRef(savePending)
  useEffect(() => {
    savePendingRef.current = savePending
  }, [savePending])

  /** Enregistre la note affichée : modification en attente, ou création de la nouvelle note. */
  const saveNow = useCallback(
    ({ selectCreatedNote }: { selectCreatedNote: boolean }) => {
      savePending()
      if (selectedNoteId || createMutation.isPending) return
      const content = editorRef.current?.getContent() ?? ""
      if (isNoteContentEmpty(content)) return
      selectCreatedNoteRef.current = selectCreatedNote
      createMutation.mutate({ content })
    },
    [selectedNoteId, savePending, createMutation]
  )

  const handleRawContentChange = useCallback(
    (content: string) => {
      if (!selectedNoteId) {
        writeNoteDraft(draftOwnerId, content)
        return
      }
      pendingUpdateRef.current = { noteId: selectedNoteId, content }
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => {
        saveTimeoutRef.current = null
        savePendingRef.current()
      }, DEBOUNCE_MS)
    },
    [selectedNoteId, draftOwnerId]
  )

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    saveNow({ selectCreatedNote: true })
  }, [saveNow])

  const handleToggle = useCallback(() => {
    if (isOpen) handleClose()
    else setIsOpen(true)
  }, [isOpen, handleClose])

  const handleToggleRef = useRef(handleToggle)
  const handleCloseRef = useRef(handleClose)
  useEffect(() => {
    handleToggleRef.current = handleToggle
    handleCloseRef.current = handleClose
  }, [handleToggle, handleClose])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "j") {
        event.preventDefault()
        handleToggleRef.current()
      }
      if (event.key === "Escape" && isOpen) {
        handleCloseRef.current()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen])

  const handleSelectNote = (noteId: string | null) => {
    setSaveError(null)
    saveNow({ selectCreatedNote: false })
    // Choix explicite : une création encore en cours ne doit pas changer la sélection
    selectCreatedNoteRef.current = false
    setSelectedNoteId(noteId)
    if (noteId === null) setNewNoteKey((key) => key + 1)
    setListOpen(false)
  }

  const isNewNote = selectedNoteId === null
  /** Nouvelle note : attendre l'utilisateur (clé du brouillon) et la fin d'une création en cours */
  const isNewNoteBlocked = isNewNote && (meQuery.isLoading || createMutation.isPending)
  /** Note sélectionnée absente de la liste : en cours de rechargement, ou supprimée / déplacée */
  const isSelectedNoteMissing = !isNewNote && !selectedNote
  const toggleLabel = isOpen ? "Fermer les notes rapides" : "Ouvrir les notes rapides"
  const selectorLabel = selectedNote
    ? getNoteDisplayTitle(selectedNote.title, selectedNote.content)
    : isNewNote
      ? "Nouvelle note"
      : freeNotesQuery.isFetching
        ? "Chargement…"
        : "Note introuvable"

  return (
    <>
      <Button
        variant="default"
        size="icon"
        className="fixed bottom-4 right-4 size-8 rounded-full shadow-md"
        onClick={handleToggle}
        aria-label={toggleLabel}
        aria-expanded={isOpen}
        aria-keyshortcuts="Meta+J Control+J"
        title={`${toggleLabel} (⌘J / Ctrl+J)`}
      >
        <StickyNote className="size-4" aria-hidden />
      </Button>

      {isOpen && (
        <div
          className={
            isFullscreen
              ? "fixed inset-x-4 bottom-14 z-50 flex min-h-[80vh] max-h-[90vh] max-w-none flex-col overflow-hidden rounded-lg border border-border bg-card shadow-lg"
              : "fixed bottom-14 right-4 z-50 flex min-h-[80vh] max-h-[90vh] w-[350px] max-w-[90vw] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-lg"
          }
          role="dialog"
          aria-label="Notes rapides"
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="truncate font-semibold">Notes</span>
              <Link
                href="/notes"
                className="text-sm text-primary hover:underline"
              >
                Mes notes
              </Link>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              className="hidden min-[500px]:inline-flex"
              onClick={() => setIsFullscreen((v) => !v)}
              aria-label={
                isFullscreen ? "Réduire le panneau de notes" : "Agrandir le panneau de notes"
              }
            >
              {isFullscreen ? (
                <Minimize2 className="size-4" aria-hidden />
              ) : (
                <Maximize2 className="size-4" aria-hidden />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleClose}
              aria-label="Fermer"
            >
              <X className="size-4" aria-hidden />
            </Button>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="shrink-0 border-b border-border p-2">
              <Popover open={listOpen} onOpenChange={setListOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between gap-2"
                    size="sm"
                    aria-label="Sélectionner une note"
                  >
                    <span className="truncate">{selectorLabel}</span>
                    <ChevronDown className="size-4 shrink-0" aria-hidden />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  side="top"
                  className="max-h-48 w-(--radix-popover-trigger-width) overflow-auto p-0"
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                    onClick={() => handleSelectNote(null)}
                  >
                    <FileText className="size-4 shrink-0" aria-hidden />
                    Nouvelle note
                  </button>
                  {notes.map((note) => (
                    <button
                      key={note.id}
                      type="button"
                      className="flex w-full items-center gap-2 truncate px-3 py-2 text-left text-sm hover:bg-accent"
                      onClick={() => handleSelectNote(note.id)}
                    >
                      <StickyNote className="size-4 shrink-0" aria-hidden />
                      {getNoteDisplayTitle(note.title, note.content)}
                    </button>
                  ))}
                  {notes.length === 0 && (
                    <p className="px-3 py-2 text-sm text-muted-foreground">
                      Aucune note
                    </p>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-2 flex flex-col">
              {saveError && (
                <p className="mb-2 text-sm text-destructive" role="alert">
                  {saveError}
                </p>
              )}
              <div className="bg-white rounded-md flex-1 min-h-0">
                {/* L'éditeur ne relit pas son contenu initial : ne le monter qu'une fois prêt.
                    isFetching et non isLoading : la liste en cache existe mais est périmée. */}
                {isNewNoteBlocked ||
                (isSelectedNoteMissing && freeNotesQuery.isFetching) ? (
                  <Skeleton className="h-24 w-full" />
                ) : isSelectedNoteMissing ? (
                  <p className="p-2 text-sm text-muted-foreground">
                    Cette note n'est plus disponible (supprimée ou déplacée).
                  </p>
                ) : (
                  <NoteEditor
                    ref={editorRef}
                    key={selectedNoteId ?? `new-${newNoteKey}`}
                    initialContent={
                      selectedNote?.content ?? readNoteDraft(draftOwnerId) ?? ""
                    }
                    editable
                    autoFocus
                    onRawContentChange={handleRawContentChange}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
