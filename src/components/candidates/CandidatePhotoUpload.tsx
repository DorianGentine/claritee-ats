"use client";

import { useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  PHOTO_ACCEPTED_MIMES,
  PHOTO_MAX_BYTES,
} from "@/lib/validations/candidate";

export const PHOTO_ACCEPT_ATTR = ".jpg,.jpeg,.png,.webp";
const PHOTO_FORMAT_ERROR =
  "Format de fichier non supporté. Formats acceptés : JPG, PNG, WebP.";
const PHOTO_SIZE_ERROR =
  "Le fichier dépasse la taille maximale autorisée (2 Mo pour les photos, 5 Mo pour les CVs).";

export const getCandidateInitials = (firstName: string, lastName: string) =>
  `${firstName?.charAt(0) ?? ""}${lastName?.charAt(0) ?? ""}`.toUpperCase() ||
  "?";

type Props = {
  inputId: string;
  photoFile: File | null;
  photoPreviewUrl: string | null;
  photoError: string | null;
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: () => void;
  displayInitials: string;
  existingPhotoUrl?: string | null;
  avatarSize?: "sm" | "lg";
};

export const CandidatePhotoUpload = ({
  inputId,
  photoFile,
  photoPreviewUrl,
  photoError,
  onPhotoChange,
  onRemovePhoto,
  displayInitials,
  existingPhotoUrl,
  avatarSize = "lg",
}: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    };
  }, [photoPreviewUrl]);

  const photoSrc = photoPreviewUrl ?? existingPhotoUrl ?? undefined;
  const sizeClass = avatarSize === "sm" ? "size-16" : "size-20 shrink-0";

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>Photo</Label>
      <div className="flex items-center gap-4">
        <Avatar className={`${sizeClass} rounded-full border-2 border-border`}>
          <AvatarImage
            src={photoSrc}
            alt={
              displayInitials !== "?"
                ? `Photo du candidat (${displayInitials})`
                : ""
            }
          />
          <AvatarFallback className="bg-secondary/80 text-lg text-secondary-foreground">
            {displayInitials}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-2">
          <input
            id={inputId}
            ref={fileInputRef}
            type="file"
            accept={PHOTO_ACCEPT_ATTR}
            aria-label="Sélectionner une photo"
            className="text-sm file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground file:cursor-pointer hover:file:bg-primary/90"
            onChange={onPhotoChange}
          />
          {(photoPreviewUrl || photoFile) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onRemovePhoto();
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
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
  );
};

export const createPhotoChangeHandler =
  (
    setPhotoFile: (f: File | null) => void,
    setPhotoPreviewUrl: (url: string | null) => void,
    setPhotoError: (err: string | null) => void,
    photoPreviewUrl: string | null
  ) =>
  (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setPhotoFile(null);
      setPhotoPreviewUrl(null);
      return;
    }
    const mime = file.type as (typeof PHOTO_ACCEPTED_MIMES)[number];
    if (!PHOTO_ACCEPTED_MIMES.includes(mime)) {
      setPhotoError(PHOTO_FORMAT_ERROR);
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      setPhotoError(PHOTO_SIZE_ERROR);
      return;
    }
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
  };
