"use client";

import { useState } from "react";
import Link from "next/link";
import { Linkedin, Loader2 } from "lucide-react";
import { api } from "@/lib/trpc/client";
import type { LinkedInProfileDraft } from "@/lib/linkedin/profile";
import { linkedinPreviewInputSchema } from "@/lib/validations/candidate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DuplicateCandidate = { id: string; firstName: string; lastName: string };

type Props = {
  onImported: (draft: LinkedInProfileDraft) => void;
  disabled?: boolean;
};

const URL_INPUT_ID = "linkedin-import-url";

/**
 * Bloc « Importer depuis LinkedIn » de la création de candidat : l'URL du profil
 * est envoyée à Apify, le brouillon renvoyé pré-remplit le formulaire.
 * Masqué tant que l'import n'est pas configuré côté serveur (APIFY_TOKEN).
 */
export const LinkedInImportPanel = ({ onImported, disabled }: Props) => {
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<DuplicateCandidate | null>(null);

  const statusQuery = api.linkedinImport.status.useQuery(undefined, {
    staleTime: Infinity,
  });
  const previewMutation = api.linkedinImport.preview.useMutation({
    onSuccess: (result) => {
      setDuplicate(result.duplicate);
      onImported(result.draft);
    },
    onError: (error) => setInputError(error.message),
  });

  if (!statusQuery.data?.enabled) return null;

  const handleImport = () => {
    setInputError(null);
    setDuplicate(null);
    const parsed = linkedinPreviewInputSchema.safeParse({ linkedinUrl });
    if (!parsed.success) {
      setInputError(parsed.error.issues[0]?.message ?? "URL LinkedIn invalide");
      return;
    }
    previewMutation.mutate(parsed.data);
  };

  const isPending = previewMutation.isPending;
  const errorId = `${URL_INPUT_ID}-error`;

  return (
    <section
      aria-labelledby="linkedin-import-title"
      className="rounded-lg border border-border bg-card p-6 shadow-sm"
    >
      <h2
        id="linkedin-import-title"
        className="flex items-center gap-2 text-base font-semibold text-foreground"
      >
        <Linkedin className="size-4 text-primary" aria-hidden />
        Importer depuis LinkedIn
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Collez l'URL du profil : la fiche est pré-remplie, vous la relisez avant
        d'enregistrer.
      </p>

      <div className="mt-4 space-y-2">
        <Label htmlFor={URL_INPUT_ID} className="sr-only">
          URL du profil LinkedIn
        </Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id={URL_INPUT_ID}
            type="url"
            inputMode="url"
            placeholder="https://www.linkedin.com/in/…"
            value={linkedinUrl}
            onChange={(event) => setLinkedinUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                // Ne pas soumettre le formulaire de création
                event.preventDefault();
                handleImport();
              }
            }}
            disabled={disabled || isPending}
            aria-invalid={inputError ? true : undefined}
            aria-describedby={inputError ? errorId : undefined}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleImport}
            disabled={disabled || isPending || !linkedinUrl.trim()}
            aria-busy={isPending}
            className="shrink-0"
          >
            {isPending && <Loader2 className="animate-spin" aria-hidden />}
            {isPending ? "Import en cours…" : "Importer"}
          </Button>
        </div>
        {isPending && (
          <p className="text-sm text-muted-foreground" role="status">
            Récupération du profil, cela peut prendre jusqu'à une minute.
          </p>
        )}
        {inputError && (
          <p id={errorId} className="text-sm text-destructive" role="alert">
            {inputError}
          </p>
        )}
        {duplicate && (
          <p
            role="alert"
            className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          >
            Ce profil existe déjà :{" "}
            <Link
              href={`/candidates/${duplicate.id}`}
              className="font-medium underline"
            >
              {duplicate.firstName} {duplicate.lastName}
            </Link>
            . Vérifiez avant de créer un doublon.
          </p>
        )}
      </div>
    </section>
  );
};
