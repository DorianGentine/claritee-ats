"use client";

import { useState } from "react";
import { formatDate } from "@/lib/format";
import { api } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  FormationFormDialog,
  type FormationItem,
} from "@/components/candidates/FormationFormDialog";

type Props = {
  candidateId?: string;
  formations: FormationItem[];
};

export const CandidateFormationsSection = ({
  candidateId,
  formations,
}: Props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FormationItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const utils = api.useUtils();
  const deleteMutation = api.candidate.deleteFormation.useMutation({
    onSuccess: () => {
      if (candidateId) void utils.candidate.getById.invalidate({ id: candidateId });
      setDeleteId(null);
    },
  });

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (f: FormationItem) => {
    setEditing(f);
    setDialogOpen(true);
  };
  const closeDialog = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditing(null);
  };

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Formations</h2>
        {candidateId && (
          <Button
            variant="outline"
            size="sm"
            className="print:hidden"
            onClick={openAdd}
          >
            Ajouter une formation
          </Button>
        )}
      </div>
      {formations.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Aucune formation ajoutée</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {formations.map((f) => (
            <li
              key={f.id}
              className="rounded-lg border border-border bg-card p-4 text-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">
                    {f.degree}
                    {f.field ? ` — ${f.field}` : ""}
                  </p>
                  <p className="text-muted-foreground">
                    {f.school}
                    {(f.startDate || f.endDate) &&
                      ` — ${f.startDate ? formatDate(f.startDate) : "?"}${
                        f.endDate ? ` – ${formatDate(f.endDate)}` : ""
                      }`}
                  </p>
                </div>
                {candidateId && (
                  <div className="flex gap-2 print:hidden">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(f)}
                      aria-label={`Modifier la formation ${f.degree}`}
                    >
                      Modifier
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeleteId(f.id)}
                      aria-label={`Supprimer la formation ${f.degree}`}
                    >
                      Supprimer
                    </Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {candidateId && (
        <>
          <FormationFormDialog
            open={dialogOpen}
            onOpenChange={closeDialog}
            candidateId={candidateId}
            formation={editing ?? undefined}
          />
          <ConfirmDialog
            open={deleteId !== null}
            onOpenChange={(open) => !open && setDeleteId(null)}
            title="Supprimer cette formation ?"
            description="Cette action est irréversible."
            confirmLabel="Supprimer"
            cancelLabel="Annuler"
            pendingLabel="Suppression…"
            onConfirm={() => {
              if (deleteId && candidateId)
                deleteMutation.mutate({
                  candidateId,
                  formationId: deleteId,
                });
            }}
            pending={deleteMutation.isPending}
            confirmVariant="destructive"
          />
        </>
      )}
    </section>
  );
};
