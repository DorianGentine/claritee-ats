import { z } from "zod";

const LIST_PAGE_SIZE = 20;

/** Input pour la liste paginée des candidats (cursor-based) */
export const candidateListInputSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(LIST_PAGE_SIZE),
});

export type CandidateListInput = z.infer<typeof candidateListInputSchema>;

/** Trim et vide → undefined pour les champs optionnels */
const trimToUndefined = (s: string | undefined) =>
  (typeof s === "string" ? s.trim() : s) || undefined;

/** Optionnel : si fourni, doit être un email valide (espaces seuls → undefined) */
const optionalEmail = z
  .string()
  .optional()
  .transform(trimToUndefined)
  .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
    message: "Format d'email invalide",
  });

/** Optionnel : si fourni, doit être une URL LinkedIn linkedin.com/in/... */
const optionalLinkedInUrl = z
  .string()
  .optional()
  .transform(trimToUndefined)
  .refine(
    (v) =>
      !v ||
      /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?$/i.test(v),
    { message: "URL LinkedIn invalide (linkedin.com/in/...)" }
  );

/** Optionnel : format flexible français (chiffres, espaces, tirets, points, +33) */
const optionalPhone = z
  .string()
  .optional()
  .transform(trimToUndefined)
  .refine(
    (v) => {
      if (!v) return true;
      const digits = v.replace(/\D/g, "");
      return digits.length >= 10 && /^[\d\s.\-+]+$/.test(v);
    },
    { message: "Numéro de téléphone invalide" }
  );

/** Schéma pour la création d'un candidat (infos de base) */
export const createCandidateSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  email: optionalEmail,
  phone: optionalPhone,
  linkedinUrl: optionalLinkedInUrl,
  title: z.string().optional().transform(trimToUndefined),
  city: z.string().optional().transform(trimToUndefined),
});

export type CreateCandidateInput = z.infer<typeof createCandidateSchema>;

/** Formats MIME acceptés pour les photos candidat */
export const PHOTO_ACCEPTED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const PHOTO_MAX_BYTES = 2 * 1024 * 1024; // 2 Mo

/** Schéma pour l'upload de photo candidat */
export const uploadPhotoSchema = z.object({
  candidateId: z.string().uuid(),
  fileBase64: z.string().min(1, "Fichier requis"),
  mimeType: z
    .enum(PHOTO_ACCEPTED_MIMES, {
      message:
        "Format de fichier non supporté. Formats acceptés : JPG, PNG, WebP.",
    }),
});

export type UploadPhotoInput = z.infer<typeof uploadPhotoSchema>;

export { LIST_PAGE_SIZE };
