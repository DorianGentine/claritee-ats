"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { api } from "@/lib/trpc/client"
import {
  NoteBlockNoteEditor,
  isBlockNoteContentEmpty,
} from "@/components/shared/NoteBlockNoteEditor"
import { getNoteDisplayTitle, getNoteTitleFromContent } from "@/lib/note-utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { StickyNote, X, ChevronDown, FileText } from "lucide-react"

const DEBOUNCE_MS = 2000

export const NoteChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [listOpen, setListOpen] = useState(false)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingContentRef = useRef<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const utils = api.useUtils()

  const freeNotesQuery = api.note.listFree.useQuery(undefined, { enabled: isOpen })
  const notes = freeNotesQuery.data ?? []
  const selectedNote = selectedNoteId ? notes.find((n) => n.id === selectedNoteId) : null

  const createMutation = api.note.create.useMutation({
    onSuccess: (data) => {
      setSelectedNoteId((prev) => (prev === null ? data.id : prev))
      setSaveError(null)
      void utils.note.listFree.invalidate()
    },
    onError: () => {
      setSaveError("Impossible d'enregistrer la note")
    },
  })

  const updateMutation = api.note.update.useMutation({
    onSuccess: () => {
      setSaveError(null)
      void utils.note.listFree.invalidate()
    },
    onError: () => {
      setSaveError("Impossible d'enregistrer la note")
    },
  })

  const savePending = useCallback(() => {
    const content = pendingContentRef.current
    if (!content || isBlockNoteContentEmpty(content)) return

    const title = getNoteTitleFromContent(content)

    if (selectedNoteId) {
      updateMutation.mutate({ id: selectedNoteId, content, title: title ?? undefined })
    } else {
      createMutation.mutate({ content, title: title ?? undefined })
    }
    pendingContentRef.current = null
  }, [selectedNoteId, updateMutation, createMutation])

  const savePendingRef = useRef(savePending)
  useEffect(() => {
    savePendingRef.current = savePending
  }, [savePending])

  const handleRawContentChange = useCallback((content: string) => {
    pendingContentRef.current = content
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null
      savePendingRef.current()
    }, DEBOUNCE_MS)
  }, [])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault()
        setIsOpen((o) => !o)
      }
      if (e.key === "Escape" && isOpen) {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current)
          saveTimeoutRef.current = null
        }
        savePendingRef.current()
        setIsOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen])

  const handleSelectNote = (noteId: string | null) => {
    setSaveError(null)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
    savePending()
    setSelectedNoteId(noteId)
    setListOpen(false)
  }

  const handleClose = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
    savePending()
    setIsOpen(false)
  }

  const currentContent = selectedNote?.content ?? "[]"
  const editorKey = selectedNoteId ?? "new"

  return (
    <>
      <Button
        variant="default"
        size="icon"
        className="fixed bottom-4 right-4 size-8 rounded-full shadow-md"
        onClick={() => setIsOpen((o) => !o)}
        aria-label="Ouvrir les notes rapides"
      >
        <StickyNote className="size-4" aria-hidden />
      </Button>

      {isOpen && (
        <div
          className="fixed bottom-14 right-4 z-50 flex min-h-[80vh] max-h-[90vh] w-[350px] max-w-[90vw] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-lg"
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
                    <span className="truncate">
                      {selectedNote
                        ? getNoteDisplayTitle(selectedNote.title, selectedNote.content)
                        : "Nouvelle note"}
                    </span>
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
                <NoteBlockNoteEditor
                  key={editorKey}
                  initialContent={currentContent}
                  editable
                  onRawContentChange={handleRawContentChange}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
