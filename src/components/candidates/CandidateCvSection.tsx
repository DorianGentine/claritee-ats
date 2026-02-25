"use client";

import { useRef, useState } from "react";
import { FileUp, Trash2 } from "lucide-react";
import { api } from "@/lib/trpc/client";
import { CvDownloadLink } from "@/components/shared/CvDownloadLink";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { fileToBase64 } from "@/lib/file-utils";
import {
  CV_ACCEPTED_MIMES,
  CV_MAX_BYTES,
  type UploadCvInput,
} from "@/lib/validations/candidate";

const CV_ACCEPT_ATTR =
  ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const GENERIC_ERROR = "Une erreur est survenue. Réessayez.";
const FILE_TOO_BIG =
  "Le fichier dépasse la taille maximale autorisée (2 Mo pour les photos, 5 Mo pour les CVs).";
const FORMAT_INVALID =
  "Format de fichier non supporté. Formats acceptés : PDF, DOC, DOCX.";

type Props = {
  candidateId: string;
  cvUrl: string | null;
  cvFileName: string | null;
};

export const CandidateCvSection = ({
  candidateId,
  cvUrl,
  cvFileName,
}: Props) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = api.useUtils();

  const uploadMutation = api.candidate.uploadCv.useMutation({
    onSuccess: () => {
      void utils.candidate.getById.invalidate({ id: candidateId });
      setUploadError(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (err) => {
      setUploadError(err.message ?? GENERIC_ERROR);
    },
  });

  const deleteMutation = api.candidate.deleteCv.useMutation({
    onSuccess: () => {
      setDeleteDialogOpen(false);
      void utils.candidate.getById.invalidate({ id: candidateId });
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const mime = file.type as (typeof CV_ACCEPTED_MIMES)[number];
    if (!CV_ACCEPTED_MIMES.includes(mime)) {
      setUploadError(FORMAT_INVALID);
      return;
    }
    if (file.size > CV_MAX_BYTES) {
      setUploadError(FILE_TOO_BIG);
      return;
    }

    try {
      const { base64, mimeType } = await fileToBase64(file, "application/pdf");
      const input: UploadCvInput = {
        candidateId,
        fileBase64: base64,
        mimeType: mimeType as (typeof CV_ACCEPTED_MIMES)[number],
        fileName: file.name,
      };
      await uploadMutation.mutateAsync(input);
    } catch (err) {
      setUploadError((err as { message?: string })?.message ?? GENERIC_ERROR);
    }
  };

  const triggerFileInput = () => fileInputRef.current?.click();
  const handleConfirmDelete = () => deleteMutation.mutate({ candidateId });

  const displayName = cvFileName ?? "CV";
  const hasCv = !!cvUrl;

  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground">CV</h2>
      <input
        ref={fileInputRef}
        type="file"
        accept={CV_ACCEPT_ATTR}
        className="sr-only"
        aria-label="Sélectionner un fichier CV"
        onChange={handleFileChange}
      />

      {hasCv ? (
        <div className="mt-2 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <CvDownloadLink
              candidateId={candidateId}
              displayName={displayName}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={triggerFileInput}
              disabled={uploadMutation.isPending}
            >
              {uploadMutation.isPending ? "Envoi…" : "Remplacer"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={deleteMutation.isPending || uploadMutation.isPending}
              aria-label="Supprimer le CV"
            >
              <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
              Supprimer
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={triggerFileInput}
            disabled={uploadMutation.isPending}
          >
            <FileUp className="mr-2 h-4 w-4 shrink-0" aria-hidden />
            {uploadMutation.isPending ? "Envoi…" : "Ajouter un CV"}
          </Button>
        </div>
      )}

      {uploadError && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {uploadError}
        </p>
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Supprimer le CV ?"
        description="Le fichier sera définitivement supprimé. Vous pourrez en ajouter un autre à tout moment."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        pendingLabel="Suppression…"
        onConfirm={handleConfirmDelete}
        pending={deleteMutation.isPending}
        confirmVariant="destructive"
      />
    </section>
  );
};
