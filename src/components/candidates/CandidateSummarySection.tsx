"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil } from "lucide-react";
import { api } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const summaryFormSchema = z.object({
  summary: z
    .string()
    .max(500, "Le résumé ne peut pas dépasser 500 caractères")
    .transform((v) => (v.trim() === "" ? "" : v.trim())),
});

type SummaryFormValues = z.infer<typeof summaryFormSchema>;

type Props = {
  candidateId: string;
  summary: string | null;
};

export const CandidateSummarySection = ({ candidateId, summary }: Props) => {
  const [editing, setEditing] = useState(false);
  const utils = api.useUtils();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<SummaryFormValues>({
    resolver: zodResolver(summaryFormSchema),
    defaultValues: { summary: summary ?? "" },
  });

  const updateMutation = api.candidate.update.useMutation({
    onSuccess: () => {
      void utils.candidate.getById.invalidate({ id: candidateId });
      setEditing(false);
    },
  });

  const currentValue = useWatch({ control, name: "summary" });

  const onSubmit = (values: SummaryFormValues) => {
    updateMutation.mutate({
      id: candidateId,
      summary: values.summary || undefined,
    });
  };

  const handleCancel = () => {
    reset({ summary: summary ?? "" });
    setEditing(false);
  };

  if (!editing) {
    return (
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Résumé</h2>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setEditing(true)}
            aria-label="Modifier le résumé"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
        {summary ? (
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
            {summary}
          </p>
        ) : (
          <p className="mt-2 text-sm italic text-muted-foreground/60">
            Aucun résumé renseigné
          </p>
        )}
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground">Résumé</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-2 space-y-2">
        <div>
          <Label htmlFor="summary" className="sr-only">
            Résumé
          </Label>
          <Textarea
            id="summary"
            {...register("summary")}
            rows={4}
            maxLength={500}
            placeholder="Décrivez brièvement le profil du candidat…"
            aria-describedby="summary-counter"
            className="resize-none"
          />
          <div className="mt-1 flex items-center justify-between">
            {errors.summary ? (
              <p className="text-xs text-destructive">{errors.summary.message}</p>
            ) : (
              <span />
            )}
            <span
              id="summary-counter"
              className="text-xs text-muted-foreground"
            >
              {(currentValue ?? "").length} / 500
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            type="submit"
            size="sm"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={updateMutation.isPending}
          >
            Annuler
          </Button>
        </div>
        {updateMutation.error && (
          <p className="text-xs text-destructive">
            Une erreur est survenue. Réessayez.
          </p>
        )}
      </form>
    </section>
  );
};
