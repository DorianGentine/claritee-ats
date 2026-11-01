"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  candidateBasicFieldsSchema,
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
import { type CityOption } from "@/components/shared/CityAutocomplete";
import { CandidateCitiesField } from "@/components/candidates/CandidateCitiesField";
import { fileToBase64 } from "@/lib/file-utils";
import type { LinkedInProfileDraft } from "@/lib/linkedin/profile";
import { LinkedInImportPanel } from "@/components/candidates/LinkedInImportPanel";
import {
  LinkedInImportPreview,
  type ImportedBackground,
} from "@/components/candidates/LinkedInImportPreview";

/** Type du formulaire : champs optionnels pour compatibilité avec useForm + zodResolver */
type NewCandidateFormValues = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  title?: string;
};

const GENERIC_ERROR_MESSAGE = "Une erreur est survenue. Réessayez.";
const PHOTO_INPUT_ID = "candidate-photo";

/** Comparaison de noms de ville insensible à la casse et aux accents */
const normalizeCityName = (name: string) =>
  name.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();

export default function NewCandidatePage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [createdCandidateId, setCreatedCandidateId] = useState<string | null>(
    null,
  );
  const [importedBackground, setImportedBackground] =
    useState<ImportedBackground | null>(null);
  const utils = api.useUtils();

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
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<NewCandidateFormValues>({
    // Villes (CityAutocomplete) et parcours importé (aperçu LinkedIn) sont gérés hors RHF.
    resolver: zodResolver(candidateBasicFieldsSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      linkedinUrl: "",
      title: "",
    },
  });

  const firstName = useWatch({ control, name: "firstName" });
  const lastName = useWatch({ control, name: "lastName" });
  const displayInitials = getCandidateInitials(firstName || "?", lastName || "?");

  /** Associe la ville LinkedIn à une ville connue (même nom), sinon on laisse saisir. */
  const resolveImportedCity = async (cityName: string) => {
    try {
      const results = await utils.city.autocomplete.fetch({ q: cityName });
      const match = results.find(
        (city) => normalizeCityName(city.name) === normalizeCityName(cityName),
      );
      if (match) {
        setCities((current) =>
          current.some((city) => city.id === match.id)
            ? current
            : [...current, match],
        );
      }
    } catch {
      // Ville non résolue : le recruteur la choisit dans le champ Villes
    }
  };

  const handleLinkedInImported = (draft: LinkedInProfileDraft) => {
    const fieldOptions = { shouldDirty: true, shouldValidate: true };
    setValue("firstName", draft.firstName, fieldOptions);
    setValue("lastName", draft.lastName, fieldOptions);
    setValue("linkedinUrl", draft.linkedinUrl, fieldOptions);
    setValue("title", draft.title ?? "", fieldOptions);
    setImportedBackground({
      summary: draft.summary,
      experiences: draft.experiences,
      formations: draft.formations,
      languages: draft.languages,
      skills: draft.skills,
    });
    if (draft.cityName) void resolveImportedCity(draft.cityName);
  };

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
          cities: cities.map((city, index) => ({
            cityId: city.id,
            order: index,
          })),
          summary: importedBackground?.summary ?? undefined,
          experiences: importedBackground?.experiences ?? [],
          formations: importedBackground?.formations ?? [],
          // Une langue sans niveau (non précisé sur LinkedIn ni choisi) n'est pas créée
          languages: (importedBackground?.languages ?? []).flatMap((language) =>
            language.level ? [{ name: language.name, level: language.level }] : [],
          ),
          tags: importedBackground?.skills ?? [],
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
    <main className="p-6 lg:p-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Nouveau candidat
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Saisissez les informations de base du candidat.
        </p>

        <div className="mt-6">
          <LinkedInImportPanel
            onImported={handleLinkedInImported}
            disabled={isPending}
          />
        </div>

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

          <CandidateCitiesField value={cities} onChange={setCities} />

          {importedBackground && (
            <LinkedInImportPreview
              value={importedBackground}
              onChange={setImportedBackground}
              disabled={isPending}
            />
          )}

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
