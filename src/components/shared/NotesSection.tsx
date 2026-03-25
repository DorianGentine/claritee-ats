"use client"

import { useCallback, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import {
  NoteBlockNoteEditor,
  type NoteBlockNoteEditorRef,
  isBlockNoteContentEmpty,
} from "@/components/shared/NoteBlockNoteEditor"
import { formatDateLong } from "@/lib/format"
import { Pencil, Trash2, Check, X, Loader } from "lucide-react"

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
  /** Appeler onSuccess() pour déclencher le reset du formulaire après succès */
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
  const [editNoteId, setEditNoteId] = useState<string | null>(null)
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [formHasContent, setFormHasContent] = useState(false)
  const formEditorRef = useRef<NoteBlockNoteEditorRef>(null)
  const inlineEditorRef = useRef<NoteBlockNoteEditorRef>(null)

  const handleFormContentChange = useCallback((isEmpty: boolean) => {
    setFormHasContent(!isEmpty)
  }, [])

  const handleCreateSave = () => {
    const content = formEditorRef.current?.getContent() ?? "[]"
    if (isBlockNoteContentEmpty(content)) return
    onCreateNote(content, () => {
      setFormKey((k) => k + 1)
      setFormHasContent(false)
    })
  }

  const handleEditSave = () => {
    if (!editNoteId) return
    const content = inlineEditorRef.current?.getContent() ?? "[]"
    if (isBlockNoteContentEmpty(content)) return
    onUpdateNote(editNoteId, content, () => setEditNoteId(null))
  }

  const editingNote = editNoteId ? notes.find((n) => n.id === editNoteId) : null

  return (
    <section className="flex w-full flex-col gap-4">
      <h2 className="text-lg font-semibold">Notes</h2>

      {/* Bulles (style chat) */}
      <div className="flex w-full max-w-full flex-col gap-3">
        {isLoading ? (
          <p className="text-muted-foreground">Chargement…</p>
        ) : notes.length === 0 ? (
          <p className="text-muted-foreground">Aucune note</p>
        ) : (
          notes.map((note) => {
            const isOwn = currentUserId === note.authorId
            const isEditing = editNoteId === note.id

            return (
              <div
                key={note.id}
                className={`flex w-full flex-col ${isOwn ? "items-end" : "items-start"}`}
              >
                <div className="flex w-[90%] flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatAuthor(note.author.firstName, note.author.lastName)} ·{" "}
                      {formatDateLong(note.createdAt)}
                    </span>
                    {isEditing && editingNote && (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditNoteId(null)}
                          disabled={updatePending}
                        >
                          <X className="size-4" aria-hidden />
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleEditSave}
                          disabled={updatePending}
                        >
                          {updatePending ? (
                            <Loader className="size-4" aria-hidden />
                          ) : (
                            <Check className="size-4" aria-hidden />
                          )}
                        </Button>
                      </div>
                    )}
                    {!isEditing && isOwn && (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditNoteId(note.id)}
                        >
                          <Pencil className="size-4" aria-hidden />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteNoteId(note.id)}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div
                    className={`rounded-lg border border-border p-3 ${isOwn ? "bg-accent" : "bg-card"}`}
                  >
                    {isEditing && editingNote ? (
                      <div className="[&_.bn-editor]:min-h-[80px] [&_.bn-side-menu]:hidden">
                        <NoteBlockNoteEditor
                          ref={inlineEditorRef}
                          initialContent={editingNote.content}
                          editable
                        />
                      </div>
                    ) : (
                      <div className="note-content [&_.bn-editor]:min-h-0 [&_.bn-editor]:border-0 [&_.bn-editor]:bg-transparent [&_.bn-editor]:p-0">
                        <NoteBlockNoteEditor
                          initialContent={note.content}
                          editable={false}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Formulaire de création */}
      <div className="mt-2 flex w-full flex-col gap-2 rounded-lg border border-border bg-accent p-4">
        <span className="text-sm font-medium text-muted-foreground">Nouvelle note</span>
        <NoteBlockNoteEditor
          key={formKey}
          ref={formEditorRef}
          editable
          onContentChange={handleFormContentChange}
        />
        <div className="flex justify-end">
          <Button
            onClick={handleCreateSave}
            disabled={!formHasContent || createPending}
          >
            {createPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteNoteId}
        onOpenChange={(o) => !o && setDeleteNoteId(null)}
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
