"use client";

import { useState } from "react";
import type { FieldErrors, Resolver, UseFormRegister } from "react-hook-form";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { api } from "@/lib/trpc/client";
import { fileToBase64 } from "@/lib/file-utils";
import {
  createCandidateSchema,
  PHOTO_ACCEPTED_MIMES,
} from "@/lib/validations/candidate";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type CityOption } from "@/components/shared/CityAutocomplete";
import {
  CandidateBasicFieldsForm,
  type CandidateBasicFields,
} from "./CandidateBasicFieldsForm";
import { CandidateCitiesField } from "./CandidateCitiesField";
import {
  CandidatePhotoUpload,
  createPhotoChangeHandler,
  getCandidateInitials,
} from "./CandidatePhotoUpload";

const identitySchema = createCandidateSchema.omit({ cities: true });
type IdentityFormValues = z.infer<typeof identitySchema>;

export type CandidateIdentity = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  title: string | null;
  photoUrl: string | null;
  cities: CityOption[];
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: CandidateIdentity;
};

const PHOTO_INPUT_ID = "candidate-identity-photo";
const GENERIC_ERROR_MESSAGE = "Une erreur est survenue. Réessayez.";

/** Formulaire monté à l'ouverture : chaque ouverture repart des données du candidat. */
const IdentityForm = ({
  candidate,
  onClose,
}: {
  candidate: CandidateIdentity;
  onClose: () => void;
}) => {
  const utils = api.useUtils();
  const [serverError, setServerError] = useState<string | null>(null);
  const [cities, setCities] = useState<CityOption[]>(candidate.cities);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const updateMutation = api.candidate.update.useMutation();
  const uploadPhotoMutation = api.candidate.uploadPhoto.useMutation();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<IdentityFormValues>({
    resolver: zodResolver(identitySchema) as Resolver<IdentityFormValues>,
    defaultValues: {
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      email: candidate.email ?? "",
      phone: candidate.phone ?? "",
      linkedinUrl: candidate.linkedinUrl ?? "",
      title: candidate.title ?? "",
    },
  });

  const firstName = useWatch({ control, name: "firstName" });
  const lastName = useWatch({ control, name: "lastName" });

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

  const onSubmit = async (values: IdentityFormValues) => {
    setServerError(null);
    try {
      await updateMutation.mutateAsync({
        id: candidate.id,
        firstName: values.firstName,
        lastName: values.lastName,
        // Chaîne vide → champ effacé côté serveur (undefined le laisserait inchangé)
        email: values.email ?? "",
        phone: values.phone ?? "",
        linkedinUrl: values.linkedinUrl ?? "",
        title: values.title ?? "",
        cities: cities.map((city, index) => ({ cityId: city.id, order: index })),
      });
      if (photoFile) {
        const { base64, mimeType } = await fileToBase64(photoFile, "image/jpeg");
        await uploadPhotoMutation.mutateAsync({
          candidateId: candidate.id,
          fileBase64: base64,
          mimeType: mimeType as (typeof PHOTO_ACCEPTED_MIMES)[number],
        });
      }
      void utils.candidate.getById.invalidate({ id: candidate.id });
      void utils.candidate.list.invalidate();
      toast.success("Fiche mise à jour.");
      onClose();
    } catch (error) {
      setServerError(
        (error as { message?: string })?.message ?? GENERIC_ERROR_MESSAGE
      );
    }
  };

  const pending =
    isSubmitting || updateMutation.isPending || uploadPhotoMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
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
        displayInitials={getCandidateInitials(firstName ?? "", lastName ?? "")}
        existingPhotoUrl={candidate.photoUrl}
        avatarSize="sm"
      />

      <CandidateBasicFieldsForm
        register={register as UseFormRegister<CandidateBasicFields>}
        errors={errors as FieldErrors<CandidateBasicFields>}
      />

      <CandidateCitiesField value={cities} onChange={setCities} disabled={pending} />

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
          Annuler
        </Button>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </DialogFooter>
    </form>
  );
};

/** Modale d'édition de l'en-tête de la fiche : identité, coordonnées, photo, villes. */
export const CandidateIdentityDialog = ({ open, onOpenChange, candidate }: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Modifier le profil</DialogTitle>
        <DialogDescription>
          Identité, coordonnées, photo et villes du candidat.
        </DialogDescription>
      </DialogHeader>
      <IdentityForm candidate={candidate} onClose={() => onOpenChange(false)} />
    </DialogContent>
  </Dialog>
);
