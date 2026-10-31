"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Pencil, SendHorizontal, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { NoteContent } from "@/components/shared/NoteContent"
import {
  NoteEditor,
  type NoteEditorRef,
} from "@/components/shared/NoteEditor"
import { isNoteContentEmpty } from "@/lib/note-utils"
import { formatDateLong } from "@/lib/format"
import { cn } from "@/lib/utils"

export type NoteItem = {
  id: string
  content: string
  authorId: string
  createdAt: Date | string
  author: { firstName: string; lastName: string }
}

type Props = {
  notes: NoteItem[]
  isLoading: boolean
  currentUserId: string | null
  /** Appeler onSuccess() pour vider l'éditeur de saisie après succès */
  onCreateNote: (content: string, onSuccess: () => void) => void
  /** Appeler onSuccess() pour fermer l'éditeur inline après succès */
  onUpdateNote: (id: string, content: string, onSuccess: () => void) => void
  /** Appeler onSuccess() pour fermer le dialog de confirmation après succès */
  onDeleteNote: (id: string, onSuccess: () => void) => void
  createPending: boolean
  updatePending: boolean
  deletePending: boolean
}

const formatAuthor = (firstName: string, lastName: string): string => {
  const initial = lastName?.charAt(0)?.toUpperCase() ?? ""
  return `${firstName} ${initial}.`.trim()
}

/**
 * Bloc « Notes » d'une fiche (candidat, offre) : fil de bulles façon chat,
 * les siennes à droite, et un éditeur Tiptap en bas (⌘/Ctrl+Entrée pour envoyer).
 */
export const NotesSection = ({
  notes,
  isLoading,
  currentUserId,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  createPending,
  updatePending,
  deletePending,
}: Props) => {
  // Remonter l'éditeur (nouvelle key) le vide après un envoi réussi
  const [composerKey, setComposerKey] = useState(0)
  const [composerHasContent, setComposerHasContent] = useState(false)
  const composerRef = useRef<NoteEditorRef>(null)
  const [editNoteId, setEditNoteId] = useState<string | null>(null)
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null)
  const inlineEditorRef = useRef<NoteEditorRef>(null)
  const threadRef = useRef<HTMLDivElement>(null)

  // Fil de discussion : afficher la dernière note (la plus récente est en bas)
  useEffect(() => {
    const thread = threadRef.current
    if (thread) thread.scrollTop = thread.scrollHeight
  }, [notes.length])

  const canSend = composerHasContent && !createPending

  const handleComposerChange = useCallback((isEmpty: boolean) => {
    setComposerHasContent(!isEmpty)
  }, [])

  const sendNote = () => {
    if (!canSend) return
    const content = composerRef.current?.getContent() ?? ""
    if (isNoteContentEmpty(content)) return
    onCreateNote(content, () => {
      setComposerKey((key) => key + 1)
      setComposerHasContent(false)
    })
  }

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    sendNote()
  }

  // Phase de capture : intercepter ⌘/Ctrl+Entrée avant ProseMirror (qui y insère un saut de ligne)
  const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      event.stopPropagation()
      sendNote()
    }
  }

  const handleEditSave = () => {
    if (!editNoteId) return
    const content = inlineEditorRef.current?.getContent() ?? ""
    if (isNoteContentEmpty(content)) return
    onUpdateNote(editNoteId, content, () => setEditNoteId(null))
  }

  return (
    <section
      aria-labelledby="notes-section-title"
      className="flex flex-col rounded-lg border border-border bg-card shadow-sm print:hidden"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 id="notes-section-title" className="text-base font-semibold text-foreground">
          Notes
        </h2>
        {notes.length > 0 && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {notes.length}
          </span>
        )}
      </div>

      <div
        ref={threadRef}
        className="max-h-[28rem] min-h-28 overflow-y-auto px-4 py-4"
      >
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Chargement…</p>
        ) : notes.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Aucune note</p>
        ) : (
          <ul className="flex flex-col gap-4" aria-label="Fil des notes">
            {notes.map((note) => {
              const isOwn = currentUserId === note.authorId
              const isEditing = editNoteId === note.id
              const author = formatAuthor(note.author.firstName, note.author.lastName)

              return (
                <li
                  key={note.id}
                  className={cn(
                    "group flex flex-col gap-1",
                    isOwn ? "items-end" : "items-start"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center gap-1 text-xs text-muted-foreground",
                      isOwn && "flex-row-reverse"
                    )}
                  >
                    <span>
                      {author} · {formatDateLong(note.createdAt)}
                    </span>
                    {isOwn && !isEditing && (
                      <span className="flex gap-0.5 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setEditNoteId(note.id)}
                          aria-label="Modifier la note"
                        >
                          <Pencil aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="hover:text-destructive"
                          onClick={() => setDeleteNoteId(note.id)}
                          aria-label="Supprimer la note"
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      </span>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="w-full max-w-[85%] space-y-2">
                      <div className="rounded-2xl border border-input bg-background px-2 py-1 [&_.note-editor]:bg-transparent">
                        <NoteEditor
                          ref={inlineEditorRef}
                          initialContent={note.content}
                          editable
                          autoFocus
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditNoteId(null)}
                          disabled={updatePending}
                        >
                          Annuler
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleEditSave}
                          disabled={updatePending}
                        >
                          {updatePending ? "Enregistrement…" : "Enregistrer"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <NoteContent
                      content={note.content}
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-2.5",
                        isOwn
                          ? "rounded-br-md bg-primary text-primary-foreground"
                          : "rounded-bl-md bg-muted text-foreground"
                      )}
                    />
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <form
        onSubmit={handleCreate}
        className="flex items-end gap-2 border-t border-border p-3"
      >
        <div
          onKeyDownCapture={handleComposerKeyDown}
          className="max-h-60 min-w-0 flex-1 overflow-y-auto rounded-2xl border border-input bg-background px-2 py-1 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 [&_.note-editor]:bg-transparent [&_.note-editor[data-editable]_.ProseMirror]:min-h-[3em]"
        >
          <NoteEditor
            key={composerKey}
            ref={composerRef}
            editable
            autoFocus={composerKey > 0}
            onContentChange={handleComposerChange}
          />
        </div>
        <Button
          type="submit"
          size="icon"
          className="size-10 shrink-0 rounded-full"
          disabled={!canSend}
          aria-label="Envoyer la note"
          title="Envoyer (⌘/Ctrl+Entrée)"
        >
          <SendHorizontal className="size-4" aria-hidden />
        </Button>
      </form>

      <ConfirmDialog
        open={!!deleteNoteId}
        onOpenChange={(open) => !open && setDeleteNoteId(null)}
        title="Supprimer cette note ?"
        description="Cette action est irréversible."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        pendingLabel="Suppression…"
        onConfirm={() => {
          if (deleteNoteId) {
            onDeleteNote(deleteNoteId, () => setDeleteNoteId(null))
          }
        }}
        pending={deletePending}
        confirmVariant="destructive"
      />
    </section>
  )
}
