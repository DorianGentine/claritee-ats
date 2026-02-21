import { z } from "zod";

const LIST_PAGE_SIZE = 20;

/** Input pour la liste paginée des candidats (cursor-based) */
export const candidateListInputSchema = z.object({
  cursor: z.uuid().optional(),
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

/** Schéma pour la mise à jour partielle d'un candidat (summary, etc.) */
export const updateCandidateSchema = z.object({
  id: z.uuid(),
  summary: z
    .string()
    .max(500, "Le résumé ne peut pas dépasser 500 caractères")
    .optional()
    .transform((v) => (v?.trim() === "" ? null : v?.trim() ?? null)),
});

export type UpdateCandidateInput = z.infer<typeof updateCandidateSchema>;

/** Niveaux de langue (mirroir de l'enum Prisma LanguageLevel) */
export const LANGUAGE_LEVELS = [
  "NOTION",
  "INTERMEDIATE",
  "FLUENT",
  "BILINGUAL",
  "NATIVE",
] as const;

export const languageLevelSchema = z.enum(LANGUAGE_LEVELS, {
  message: "Le niveau de langue est requis",
});

/** Schéma pour l'ajout d'une langue à un candidat */
export const addLanguageSchema = z.object({
  candidateId: z.uuid(),
  name: z.string().min(1, "Le nom de la langue est requis").max(50),
  level: languageLevelSchema,
});

export type AddLanguageInput = z.infer<typeof addLanguageSchema>;

/** Schéma pour la suppression d'une langue */
export const removeLanguageSchema = z.object({
  candidateId: z.uuid(),
  languageId: z.uuid(),
});

export type RemoveLanguageInput = z.infer<typeof removeLanguageSchema>;

/** Formats MIME acceptés pour les photos candidat */
export const PHOTO_ACCEPTED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const PHOTO_MAX_BYTES = 2 * 1024 * 1024; // 2 Mo

/** Schéma pour l'upload de photo candidat */
export const uploadPhotoSchema = z.object({
  candidateId: z.uuid(),
  fileBase64: z.string().min(1, "Fichier requis"),
  mimeType: z
    .enum(PHOTO_ACCEPTED_MIMES, {
      message:
        "Format de fichier non supporté. Formats acceptés : JPG, PNG, WebP.",
    }),
});

export type UploadPhotoInput = z.infer<typeof uploadPhotoSchema>;

/** Formats MIME acceptés pour les CV candidat */
export const CV_ACCEPTED_MIMES = [
  "application/pdf",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
] as const;

export const CV_MAX_BYTES = 5 * 1024 * 1024; // 5 Mo

/** Schéma pour l'upload de CV candidat */
export const uploadCvSchema = z.object({
  candidateId: z.uuid(),
  fileBase64: z.string().min(1, "Fichier requis"),
  mimeType: z.enum(CV_ACCEPTED_MIMES, {
    message:
      "Format de fichier non supporté. Formats acceptés : PDF, DOC, DOCX.",
  }),
  fileName: z
    .string()
    .min(1, "Nom de fichier requis")
    .max(255, "Nom de fichier trop long"),
});

export type UploadCvInput = z.infer<typeof uploadCvSchema>;

/** Date optionnelle (premier jour du mois côté UI → DateTime en base). z.coerce.date() accepte Date ou chaîne ISO. */
const optionalDate = z.coerce.date().optional().nullable();

/** Schéma pour l'ajout d'une expérience professionnelle */
export const addExperienceSchema = z.object({
  candidateId: z.uuid(),
  title: z.string().min(1, "Le titre est requis"),
  company: z.string().min(1, "L'entreprise est requise"),
  startDate: z.coerce.date(),
  endDate: optionalDate,
  description: z.string().max(2000).optional().nullable(),
});

export type AddExperienceInput = z.infer<typeof addExperienceSchema>;

/** Schéma pour la mise à jour d'une expérience */
export const updateExperienceSchema = z.object({
  candidateId: z.uuid(),
  experienceId: z.uuid(),
  title: z.string().min(1, "Le titre est requis").optional(),
  company: z.string().min(1, "L'entreprise est requise").optional(),
  startDate: z.coerce.date().optional(),
  endDate: optionalDate,
  description: z.string().max(2000).optional().nullable(),
});

export type UpdateExperienceInput = z.infer<typeof updateExperienceSchema>;

/** Schéma pour la suppression d'une expérience */
export const deleteExperienceSchema = z.object({
  candidateId: z.uuid(),
  experienceId: z.uuid(),
});

export type DeleteExperienceInput = z.infer<typeof deleteExperienceSchema>;

/** Date optionnelle pour formation (année ou mois/année côté UI → DateTime en base). */
const optionalFormationDate = z.coerce.date().optional().nullable();

/** Schéma pour l'ajout d'une formation */
export const addFormationSchema = z.object({
  candidateId: z.uuid(),
  degree: z.string().min(1, "Le diplôme est requis"),
  field: z.string().max(200).optional().nullable(),
  school: z.string().min(1, "L'établissement est requis"),
  startDate: optionalFormationDate,
  endDate: optionalFormationDate,
});

export type AddFormationInput = z.infer<typeof addFormationSchema>;

/** Schéma pour la mise à jour d'une formation */
export const updateFormationSchema = z.object({
  candidateId: z.uuid(),
  formationId: z.uuid(),
  degree: z.string().min(1, "Le diplôme est requis").optional(),
  field: z.string().max(200).optional().nullable(),
  school: z.string().min(1, "L'établissement est requis").optional(),
  startDate: optionalFormationDate,
  endDate: optionalFormationDate,
});

export type UpdateFormationInput = z.infer<typeof updateFormationSchema>;

/** Schéma pour la suppression d'une formation */
export const deleteFormationSchema = z.object({
  candidateId: z.uuid(),
  formationId: z.uuid(),
});

export type DeleteFormationInput = z.infer<typeof deleteFormationSchema>;

export { LIST_PAGE_SIZE };
