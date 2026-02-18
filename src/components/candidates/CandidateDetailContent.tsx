"use client";

import { useState } from "react";
import { formatDate } from "@/lib/format";
import { api } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ExperienceFormDialog, type ExperienceItem } from "@/components/candidates/ExperienceFormDialog";

export type { ExperienceItem };

export type FormationItem = {
  id: string;
  degree: string;
  field: string | null;
  school: string;
  startDate: Date | string | null;
  endDate: Date | string | null;
};

export type CandidateDetailContentProps = {
  candidateId?: string;
  experiences: ExperienceItem[];
  formations: FormationItem[];
};

export const CandidateDetailContent = ({
  candidateId,
  experiences,
  formations,
}: CandidateDetailContentProps) => {
  const [experienceDialogOpen, setExperienceDialogOpen] = useState(false);
  const [editingExperience, setEditingExperience] = useState<ExperienceItem | null>(null);
  const [deleteExperienceId, setDeleteExperienceId] = useState<string | null>(null);

  const utils = api.useUtils();
  const deleteExperienceMutation = api.candidate.deleteExperience.useMutation({
    onSuccess: () => {
      if (candidateId) void utils.candidate.getById.invalidate({ id: candidateId });
      setDeleteExperienceId(null);
    },
  });

  const openAddExperience = () => {
    setEditingExperience(null);
    setExperienceDialogOpen(true);
  };
  const openEditExperience = (exp: ExperienceItem) => {
    setEditingExperience(exp);
    setExperienceDialogOpen(true);
  };
  const closeExperienceDialog = (open: boolean) => {
    setExperienceDialogOpen(open);
    if (!open) setEditingExperience(null);
  };

  return (
  <div className="space-y-6 rounded-lg border border-border bg-card p-6 shadow-sm print:shadow-none">
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Expériences</h2>
        {candidateId && (
          <Button
            variant="outline"
            size="sm"
            className="print:hidden"
            onClick={openAddExperience}
          >
            Ajouter une expérience
          </Button>
        )}
      </div>
      {experiences.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Aucune expérience</p>
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
                      onClick={() => openEditExperience(exp)}
                    >
                      Modifier
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeleteExperienceId(exp.id)}
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
            open={experienceDialogOpen}
            onOpenChange={closeExperienceDialog}
            candidateId={candidateId}
            experience={editingExperience ?? undefined}
          />
          <ConfirmDialog
            open={deleteExperienceId !== null}
            onOpenChange={(open) => !open && setDeleteExperienceId(null)}
            title="Supprimer cette expérience ?"
            description="Cette action est irréversible."
            confirmLabel="Supprimer"
            cancelLabel="Annuler"
            pendingLabel="Suppression…"
            onConfirm={() => {
              if (deleteExperienceId)
                deleteExperienceMutation.mutate({ candidateId, experienceId: deleteExperienceId });
            }}
            pending={deleteExperienceMutation.isPending}
            confirmVariant="destructive"
          />
        </>
      )}
    </section>
    <section>
      <h2 className="text-lg font-semibold text-foreground">Formations</h2>
      {formations.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Aucune formation</p>
      ) : (
        <ul className="mt-2 space-y-4">
          {formations.map((f) => (
            <li
              key={f.id}
              className="rounded-lg border border-border bg-card p-4 text-sm"
            >
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
            </li>
          ))}
        </ul>
      )}
    </section>
  </div>
  );
};
