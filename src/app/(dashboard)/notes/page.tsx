"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/trpc/client";
import { getNoteDisplayTitle, getNoteExcerpt } from "@/lib/note-utils";
import { formatDateLong } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  NoteBlockNoteEditor,
  type NoteBlockNoteEditorRef,
  isBlockNoteContentEmpty,
} from "@/components/shared/NoteBlockNoteEditor";
import { Pencil, Trash2, Maximize2, Minimize2 } from "lucide-react";
import type { RouterOutputs } from "@/lib/trpc/client";

type NoteItem = RouterOutputs["note"]["listFree"][number];

export default function NotesPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false);
  const [isModalFullscreen, setIsModalFullscreen] = useState(false);
  const editorRef = useRef<NoteBlockNoteEditorRef>(null);
  const initialTitleRef = useRef<string>("");
  const initialContentRef = useRef<string>("");
  const currentContentRef = useRef<string>("");

  const utils = api.useUtils();
  const freeNotesQuery = api.note.listFree.useQuery();
  const candidatesQuery = api.candidate.list.useQuery(
    { limit: 100 },
    { enabled: !!selectedId }
  );
  const notes = freeNotesQuery.data ?? [];
  const selectedNote = selectedId
    ? notes.find((n) => n.id === selectedId)
    : null;

  const updateMutation = api.note.update.useMutation({
    onSuccess: () => {
      void utils.note.listFree.invalidate();
    },
  });
  const deleteMutation = api.note.delete.useMutation({
    onSuccess: () => {
      setDeleteId(null);
      setSelectedId(null);
      void utils.note.listFree.invalidate();
    },
  });
  const moveToCandidateMutation = api.note.moveToCandidate.useMutation({
    onSuccess: () => {
      setSelectedId(null);
      void utils.note.listFree.invalidate();
    },
  });

  const handleOpenNote = (note: NoteItem) => {
    setSelectedId(note.id);
    setIsModalFullscreen(false);
    const initialTitle = note.title?.trim() ?? "";
    const initialContent = note.content;
    setEditTitle(initialTitle);
    initialTitleRef.current = initialTitle;
    initialContentRef.current = initialContent;
    currentContentRef.current = initialContent;
    setHasChanges(false);
  };

  const handleCloseDetail = () => {
    if (hasChanges) {
      setUnsavedDialogOpen(true);
      return;
    }
    setSelectedId(null);
    setHasChanges(false);
  };

  const handleSaveClick = () => {
    if (!selectedId) return;
    const content = editorRef.current?.getContent();
    if (!content || isBlockNoteContentEmpty(content)) return;
    updateMutation.mutate({
      id: selectedId,
      content,
      title: editTitle.trim() || undefined,
    });
    initialTitleRef.current = editTitle.trim() || "";
    initialContentRef.current = content;
    currentContentRef.current = content;
    setHasChanges(false);
  };

  const handleDeleteConfirm = () => {
    if (!deleteId) return;
    deleteMutation.mutate({ id: deleteId });
  };

  const handleMoveToCandidate = (candidateId: string) => {
    if (!selectedId) return;
    moveToCandidateMutation.mutate({ id: selectedId, candidateId });
  };

  const handleContentChange = (content: string) => {
    currentContentRef.current = content;
    const titleChanged = editTitle.trim() !== (initialTitleRef.current || "");
    const contentChanged = content !== (initialContentRef.current || "");
    setHasChanges(titleChanged || contentChanged);
  };

  const handleTitleChange = (value: string) => {
    setEditTitle(value);
    const titleChanged = value.trim() !== (initialTitleRef.current || "");
    const contentChanged =
      currentContentRef.current !== (initialContentRef.current || "");
    setHasChanges(titleChanged || contentChanged);
  };

  const handleConfirmDiscard = () => {
    setUnsavedDialogOpen(false);
    setHasChanges(false);
    setSelectedId(null);
  };

  const handleCancelDiscard = () => {
    setUnsavedDialogOpen(false);
  };

  useEffect(() => {
    if (!hasChanges) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      (event as unknown as { returnValue: string }).returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasChanges]);

  const candidateItems = candidatesQuery.data?.items ?? [];

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background p-6">
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
              <li key={note.id}>
                <button
                  type="button"
                  onClick={() => handleOpenNote(note)}
                  className="flex w-full flex-col gap-1 rounded-lg border border-border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/30 hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog
        open={!!selectedNote}
        onOpenChange={(open) => !open && handleCloseDetail()}
      >
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
                    isModalFullscreen
                      ? "Réduire la fenêtre"
                      : "Agrandir en plein écran"
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
                  <NoteBlockNoteEditor
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
              <span className="text-sm text-muted-foreground">
                Déplacer vers :
              </span>
              <Select
                value=""
                onValueChange={(v) => {
                  if (v) handleMoveToCandidate(v);
                }}
                disabled={
                  moveToCandidateMutation.isPending ||
                  candidateItems.length === 0
                }
              >
                <SelectTrigger className="w-(--radix-select-trigger-width) max-w-[240px]">
                  <SelectValue placeholder="Choisir un candidat…" />
                </SelectTrigger>
                <SelectContent>
                  {candidateItems.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {[c.firstName, c.lastName].filter(Boolean).join(" ") ||
                        "Sans nom"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {candidateItems.length === 0 && (
                <span className="text-xs text-muted-foreground">
                  Aucun candidat
                </span>
              )}
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
  );
}
