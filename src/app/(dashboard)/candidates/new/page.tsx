"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createCandidateSchema,
  PHOTO_ACCEPTED_MIMES,
} from "@/lib/validations/candidate";
import { api } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import {
  CandidatePhotoUpload,
  createPhotoChangeHandler,
  getCandidateInitials,
} from "@/components/candidates/CandidatePhotoUpload";
import {
  CandidateBasicFieldsForm,
  type CandidateBasicFields,
} from "@/components/candidates/CandidateBasicFieldsForm";
import { fileToBase64 } from "@/lib/file-utils";

/** Type du formulaire : champs optionnels pour compatibilité avec useForm + zodResolver */
type NewCandidateFormValues = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  title?: string;
  city?: string;
};

const GENERIC_ERROR_MESSAGE = "Une erreur est survenue. Réessayez.";
const PHOTO_INPUT_ID = "candidate-photo";

export default function NewCandidatePage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [createdCandidateId, setCreatedCandidateId] = useState<string | null>(
    null,
  );

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

  const createMutation = api.candidate.create.useMutation();
  const uploadPhotoMutation = api.candidate.uploadPhoto.useMutation();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<NewCandidateFormValues>({
    resolver: zodResolver(createCandidateSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      linkedinUrl: "",
      title: "",
      city: "",
    },
  });

  const firstName = useWatch({ control, name: "firstName" });
  const lastName = useWatch({ control, name: "lastName" });
  const displayInitials = getCandidateInitials(firstName || "?", lastName || "?");

  const onSubmit = async (data: NewCandidateFormValues) => {
    setServerError(null);
    try {
      let candidateId = createdCandidateId;

      if (!candidateId) {
        const candidate = await createMutation.mutateAsync({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email?.trim() || undefined,
          phone: data.phone?.trim() || undefined,
          linkedinUrl: data.linkedinUrl?.trim() || undefined,
          title: data.title?.trim() || undefined,
          city: data.city?.trim() || undefined,
        });
        candidateId = candidate.id;
        setCreatedCandidateId(candidate.id);
      }

      if (photoFile && candidateId) {
        const { base64, mimeType } = await fileToBase64(photoFile, "image/jpeg");
        await uploadPhotoMutation.mutateAsync({
          candidateId,
          fileBase64: base64,
          mimeType: mimeType as (typeof PHOTO_ACCEPTED_MIMES)[number],
        });
      }

      router.push(`/candidates/${candidateId}`);
    } catch (err) {
      setServerError(
        (err as { message?: string })?.message ?? GENERIC_ERROR_MESSAGE,
      );
    }
  };

  const isPending = isSubmitting || createMutation.isPending || uploadPhotoMutation.isPending;

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background p-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Nouveau candidat
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Saisissez les informations de base du candidat.
        </p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-6 flex flex-col gap-4 rounded-lg border border-border bg-card p-6 shadow-sm"
        >
          {serverError && (
            <div
              role="alert"
              className="rounded-md border border-destructive bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
            >
              {serverError}
            </div>
          )}

          <CandidatePhotoUpload
            inputId={PHOTO_INPUT_ID}
            photoFile={photoFile}
            photoPreviewUrl={photoPreviewUrl}
            photoError={photoError}
            onPhotoChange={handlePhotoChange}
            onRemovePhoto={removePhoto}
            displayInitials={displayInitials}
            avatarSize="sm"
          />

          <CandidateBasicFieldsForm
            register={register as UseFormRegister<CandidateBasicFields>}
            errors={errors as FieldErrors<CandidateBasicFields>}
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              type="submit"
              disabled={isPending}
              aria-busy={isPending}
            >
              {isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/candidates">Annuler</Link>
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
