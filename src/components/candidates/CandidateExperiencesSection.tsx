"use client";

import { useState } from "react";
import { formatDate } from "@/lib/format";
import { api } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  ExperienceFormDialog,
  type ExperienceItem,
} from "@/components/candidates/ExperienceFormDialog";

type Props = {
  candidateId?: string;
  experiences: ExperienceItem[];
};

export const CandidateExperiencesSection = ({
  candidateId,
  experiences,
}: Props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExperienceItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const utils = api.useUtils();
  const deleteMutation = api.candidate.deleteExperience.useMutation({
    onSuccess: () => {
      if (candidateId) void utils.candidate.getById.invalidate({ id: candidateId });
      setDeleteId(null);
    },
  });

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (exp: ExperienceItem) => {
    setEditing(exp);
    setDialogOpen(true);
  };
  const closeDialog = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditing(null);
  };

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Expériences</h2>
        {candidateId && (
          <Button
            variant="outline"
            size="sm"
            className="print:hidden"
            onClick={openAdd}
          >
            Ajouter une expérience
          </Button>
        )}
      </div>
      {experiences.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Aucune expérience ajoutée</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {experiences.map((exp) => (
            <li
              key={exp.id}
              className="rounded-lg border border-border bg-card p-4 text-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{exp.title}</p>
                  <p className="text-muted-foreground">
                    {exp.company} — {formatDate(exp.startDate)}
                    {exp.endDate
                      ? ` – ${formatDate(exp.endDate)}`
                      : " – Aujourd'hui"}
                  </p>
                  {exp.description && (
                    <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                      {exp.description}
                    </p>
                  )}
                </div>
                {candidateId && (
                  <div className="flex gap-2 print:hidden">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(exp)}
                      aria-label={`Modifier l'expérience ${exp.title}`}
                    >
                      Modifier
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeleteId(exp.id)}
                      aria-label={`Supprimer l'expérience ${exp.title}`}
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
          <ExperienceFormDialog
            open={dialogOpen}
            onOpenChange={closeDialog}
            candidateId={candidateId}
            experience={editing ?? undefined}
          />
          <ConfirmDialog
            open={deleteId !== null}
            onOpenChange={(open) => !open && setDeleteId(null)}
            title="Supprimer cette expérience ?"
            description="Cette action est irréversible."
            confirmLabel="Supprimer"
            cancelLabel="Annuler"
            pendingLabel="Suppression…"
            onConfirm={() => {
              if (deleteId && candidateId)
                deleteMutation.mutate({ candidateId, experienceId: deleteId });
            }}
            pending={deleteMutation.isPending}
            confirmVariant="destructive"
          />
        </>
      )}
    </section>
  );
};
