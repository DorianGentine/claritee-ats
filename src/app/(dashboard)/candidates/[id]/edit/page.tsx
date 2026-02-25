"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { FieldErrors, Resolver, UseFormRegister } from "react-hook-form";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { z } from "zod";
import {
  createCandidateSchema,
  PHOTO_ACCEPTED_MIMES,
} from "@/lib/validations/candidate";
import {
  CandidatePhotoUpload,
  createPhotoChangeHandler,
  getCandidateInitials,
} from "@/components/candidates/CandidatePhotoUpload";
import {
  CandidateBasicFieldsForm,
  type CandidateBasicFields,
} from "@/components/candidates/CandidateBasicFieldsForm";
import { api } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { CandidateDetailSidebar } from "@/components/candidates/CandidateDetailSidebar";
import { CandidateDetailContent } from "@/components/candidates/CandidateDetailContent";
import { CandidateDetailSkeleton } from "@/components/candidates/CandidateDetailSkeleton";
import { fileToBase64 } from "@/lib/file-utils";

const isValidUuid = (s: string) => z.uuid().safeParse(s).success;

/** Schéma du formulaire d'édition (base création + résumé) */
const editFormSchema = createCandidateSchema.extend({
  summary: z
    .string()
    .max(500, "Le résumé ne peut pas dépasser 500 caractères")
    .optional(),
});

type EditFormValues = z.infer<typeof editFormSchema>;

const GENERIC_ERROR_MESSAGE = "Une erreur est survenue. Réessayez.";
const PHOTO_INPUT_ID = "edit-candidate-photo";

export default function EditCandidatePage() {
  const params = useParams();
  const router = useRouter();
  const candidateId = params?.id as string | undefined;

  const [serverError, setServerError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const handlePhotoChange = createPhotoChangeHandler(
    setPhotoFile,
    setPhotoPreviewUrl,
    setPhotoError,
    photoPreviewUrl
  );

  const removePhoto = () => {
    setPhotoFile(null);
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoPreviewUrl(null);
    setPhotoError(null);
  };

  const isValidId = !!candidateId && isValidUuid(candidateId);
  const getByIdQuery = api.candidate.getById.useQuery(
    { id: candidateId! },
    { enabled: isValidId }
  );
  const utils = api.useUtils();
  const updateMutation = api.candidate.update.useMutation({
    onSuccess: () => {
      void utils.candidate.getById.invalidate({ id: candidateId });
    },
  });
  const uploadPhotoMutation = api.candidate.uploadPhoto.useMutation({
    onSuccess: () => {
      void utils.candidate.getById.invalidate({ id: candidateId });
    },
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editFormSchema) as Resolver<EditFormValues>,
    values: getByIdQuery.data
      ? {
          firstName: getByIdQuery.data.firstName ?? "",
          lastName: getByIdQuery.data.lastName ?? "",
          email: getByIdQuery.data.email ?? "",
          phone: getByIdQuery.data.phone ?? "",
          linkedinUrl: getByIdQuery.data.linkedinUrl ?? "",
          title: getByIdQuery.data.title ?? "",
          city: getByIdQuery.data.city ?? "",
          summary: getByIdQuery.data.summary ?? "",
        }
      : undefined,
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      linkedinUrl: "",
      title: "",
      city: "",
      summary: "",
    },
  });

  const firstName = useWatch({ control, name: "firstName" });
  const lastName = useWatch({ control, name: "lastName" });
  const displayInitials = getCandidateInitials(
    firstName ?? "?",
    lastName ?? "?"
  );

  const onSubmit = async (data: EditFormValues): Promise<void> => {
    setServerError(null);
    if (!candidateId) return;
    try {
      await updateMutation.mutateAsync({
        id: candidateId,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email?.trim() || undefined,
        phone: data.phone?.trim() || undefined,
        linkedinUrl: data.linkedinUrl?.trim() || undefined,
        title: data.title?.trim() || undefined,
        city: data.city?.trim() || undefined,
        summary: data.summary,
      });

      if (photoFile) {
        const { base64, mimeType } = await fileToBase64(
          photoFile,
          "image/jpeg"
        );
        await uploadPhotoMutation.mutateAsync({
          candidateId,
          fileBase64: base64,
          mimeType: mimeType as (typeof PHOTO_ACCEPTED_MIMES)[number],
        });
      }

      router.push(`/candidates/${candidateId}`);
    } catch (err) {
      setServerError(
        (err as { message?: string })?.message ?? GENERIC_ERROR_MESSAGE
      );
    }
  };

  const handleCancel = () => {
    router.push(`/candidates/${candidateId}`);
  };

  const isPending =
    isSubmitting || updateMutation.isPending || uploadPhotoMutation.isPending;

  if (!candidateId || !isValidUuid(candidateId)) {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] bg-background p-6">
        <p className="text-muted-foreground">
          {!candidateId
            ? "Identifiant candidat manquant."
            : "Identifiant candidat invalide (format attendu : UUID)."}
        </p>
        <Button variant="outline" asChild className="mt-4">
          <Link href="/candidates">Retour à la liste</Link>
        </Button>
      </main>
    );
  }

  if (getByIdQuery.isLoading) {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] bg-background p-6">
        <CandidateDetailSkeleton />
      </main>
    );
  }

  if (getByIdQuery.error ?? !getByIdQuery.data) {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] bg-background p-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-muted-foreground">
            Candidat introuvable ou vous n'avez pas accès à cette fiche.
          </p>
          <Button variant="outline" asChild className="mt-4">
            <Link href="/candidates">Retour à la liste</Link>
          </Button>
        </div>
      </main>
    );
  }

  const candidate = getByIdQuery.data;

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/candidates/${candidateId}`}>Retour</Link>
          </Button>
        </div>

        {/* Formulaire champs de base : ne pas englober la sidebar (CandidateSummarySection, CandidateLanguagesSection, CandidateTagsSection ont leurs propres <form>) */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Header : photo + champs de base */}
          <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-start">
            <CandidatePhotoUpload
              inputId={PHOTO_INPUT_ID}
              photoFile={photoFile}
              photoPreviewUrl={photoPreviewUrl}
              photoError={photoError}
              onPhotoChange={handlePhotoChange}
              onRemovePhoto={removePhoto}
              displayInitials={displayInitials}
              existingPhotoUrl={candidate.photoUrl}
              avatarSize="lg"
            />

            <div className="min-w-0 flex-1 space-y-4">
              {serverError && (
                <div
                  role="alert"
                  className="rounded-md border border-destructive bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
                >
                  {serverError}
                </div>
              )}

              <CandidateBasicFieldsForm
                register={register as UseFormRegister<CandidateBasicFields>}
                errors={errors as FieldErrors<CandidateBasicFields>}
                showSummary
              />

              <div className="flex flex-wrap gap-3">
                <Button
                  type="submit"
                  disabled={isPending}
                  aria-busy={isPending}
                >
                  {isPending ? "Enregistrement…" : "Enregistrer"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isPending}
                >
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        </form>

        {/* Grille : sidebar + contenu (formulaires autonomes pour langues, tags, summary, CV, experiences, formations) */}
        <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
          <CandidateDetailSidebar
            candidateId={candidateId}
            languages={candidate.languages}
            tags={candidate.tags}
            summary={candidate.summary}
            cvUrl={candidate.cvUrl}
            cvFileName={candidate.cvFileName}
          />
          <CandidateDetailContent
            candidateId={candidateId}
            experiences={candidate.experiences}
            formations={candidate.formations}
          />
        </div>
      </div>
    </main>
  );
}
