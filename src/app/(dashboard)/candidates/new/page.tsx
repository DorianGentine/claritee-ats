"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createCandidateSchema,
  PHOTO_ACCEPTED_MIMES,
  PHOTO_MAX_BYTES,
} from "@/lib/validations/candidate";
import { api } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
const PHOTO_ACCEPT_ATTR = ".jpg,.jpeg,.png,.webp";

const getInitials = (firstName: string, lastName: string) =>
  `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "?";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    };
  }, [photoPreviewUrl]);

  const createMutation = api.candidate.create.useMutation();
  const uploadPhotoMutation = api.candidate.uploadPhoto.useMutation();

  const {
    register,
    handleSubmit,
    watch,
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

  const firstName = watch("firstName");
  const lastName = watch("lastName");
  const displayInitials = getInitials(firstName || "?", lastName || "?");

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setPhotoFile(null);
      setPhotoPreviewUrl(null);
      return;
    }

    const mime = file.type as (typeof PHOTO_ACCEPTED_MIMES)[number];
    if (!PHOTO_ACCEPTED_MIMES.includes(mime)) {
      setPhotoError(
        "Format de fichier non supporté. Formats acceptés : JPG, PNG, WebP.",
      );
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      setPhotoError(
        "Le fichier dépasse la taille maximale autorisée (2 Mo pour les photos, 5 Mo pour les CVs).",
      );
      return;
    }

    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    setPhotoFile(null);
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoPreviewUrl(null);
    setPhotoError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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

          <div className="space-y-2">
            <Label htmlFor={PHOTO_INPUT_ID}>Photo</Label>
            <div className="flex items-center gap-4">
              <Avatar className="size-16">
                {photoPreviewUrl ? (
                  <AvatarImage src={photoPreviewUrl} alt="Aperçu" />
                ) : null}
                <AvatarFallback className="text-lg">
                  {displayInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-2">
                <input
                  id={PHOTO_INPUT_ID}
                  ref={fileInputRef}
                  type="file"
                  accept={PHOTO_ACCEPT_ATTR}
                  aria-label="Sélectionner une photo"
                  className="text-sm file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground file:cursor-pointer hover:file:bg-primary/90"
                  onChange={handlePhotoChange}
                />
                {(photoPreviewUrl || photoFile) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={removePhoto}
                  >
                    Supprimer / Remplacer
                  </Button>
                )}
              </div>
            </div>
            {photoError && (
              <p className="text-sm text-destructive" role="alert">
                {photoError}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">
                Prénom <span className="text-destructive">*</span>
              </Label>
              <Input
                id="firstName"
                autoComplete="given-name"
                aria-required
                aria-invalid={!!errors.firstName}
                {...register("firstName")}
              />
              {errors.firstName && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">
                Nom <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lastName"
                autoComplete="family-name"
                aria-required
                aria-invalid={!!errors.lastName}
                {...register("lastName")}
              />
              {errors.lastName && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="candidat@exemple.fr"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="06 12 34 56 78"
              aria-invalid={!!errors.phone}
              {...register("phone")}
            />
            {errors.phone && (
              <p className="text-sm text-destructive" role="alert">
                {errors.phone.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedinUrl">Profil LinkedIn</Label>
            <Input
              id="linkedinUrl"
              type="url"
              placeholder="https://linkedin.com/in/..."
              aria-invalid={!!errors.linkedinUrl}
              {...register("linkedinUrl")}
            />
            {errors.linkedinUrl && (
              <p className="text-sm text-destructive" role="alert">
                {errors.linkedinUrl.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Intitulé du poste / Titre</Label>
            <Input
              id="title"
              placeholder="Développeur full stack"
              aria-invalid={!!errors.title}
              {...register("title")}
            />
            {errors.title && (
              <p className="text-sm text-destructive" role="alert">
                {errors.title.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">Ville</Label>
            <Input
              id="city"
              autoComplete="address-level2"
              placeholder="Paris"
              aria-invalid={!!errors.city}
              {...register("city")}
            />
            {errors.city && (
              <p className="text-sm text-destructive" role="alert">
                {errors.city.message}
              </p>
            )}
          </div>

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
