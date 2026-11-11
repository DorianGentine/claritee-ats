"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/client"
import { createClient } from "@/lib/supabase/client"
import type { CreateFileUploadUrlInput } from "@/lib/validations/candidate"

type UploadRequest = {
  kind: "photo" | "cv"
  candidateId: string
  file: File
}

const GENERIC_ERROR_MESSAGE = "Une erreur est survenue. Réessayez."

/**
 * Envoie une photo ou un CV directement du navigateur à Supabase Storage (URL
 * signée, sans passer par la fonction serverless et sa limite de corps de
 * requête), puis fait vérifier le fichier stocké par le serveur.
 * Retourne le candidat mis à jour.
 */
export const useCandidateFileUpload = () => {
  const createUploadUrl = api.candidate.createFileUploadUrl.useMutation()
  const confirmUpload = api.candidate.confirmFileUpload.useMutation()
  const [isUploading, setIsUploading] = useState(false)

  const uploadFile = async ({ kind, candidateId, file }: UploadRequest) => {
    setIsUploading(true)
    try {
      // Format et taille sont revalidés par le schéma Zod côté serveur.
      const { bucket, path, token } = await createUploadUrl.mutateAsync({
        kind,
        candidateId,
        mimeType: file.type,
        size: file.size,
      } as CreateFileUploadUrlInput)

      const { error } = await createClient()
        .storage.from(bucket)
        .uploadToSignedUrl(path, token, file, { contentType: file.type })
      if (error) {
        console.error("[useCandidateFileUpload] Storage upload failed:", error)
        throw new Error(GENERIC_ERROR_MESSAGE)
      }

      return kind === "photo"
        ? await confirmUpload.mutateAsync({ kind, candidateId, path })
        : await confirmUpload.mutateAsync({
            kind,
            candidateId,
            path,
            fileName: file.name,
          })
    } finally {
      setIsUploading(false)
    }
  }

  return { uploadFile, isUploading }
}
