import { z } from "zod";
import { sirenSchema } from "./auth";

/** Schéma de création d'une société cliente (ClientCompany) */
export const createClientCompanySchema = z.object({
  name: z
    .string()
    .min(1, "Le nom de l'entreprise est requis."),
  siren: z.union([z.literal(""), sirenSchema]).optional(),
});

export type CreateClientCompanyInput = z.infer<typeof createClientCompanySchema>;

/** Trim et vide → undefined pour les champs optionnels */
const trimToUndefined = (s: string | undefined) =>
  (typeof s === "string" ? s.trim() : s) || undefined;

/** Optionnel : si fourni, doit être un email valide */
const optionalEmail = z
  .string()
  .optional()
  .transform(trimToUndefined)
  .refine((v) => !v || z.email().safeParse(v).success, {
    message: "Veuillez entrer une adresse email valide.",
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
    { message: "L'URL LinkedIn doit être au format linkedin.com/in/..." }
  );

/** Schéma de création d'un contact client (ClientContact) */
export const createClientContactSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis."),
  lastName: z.string().min(1, "Le nom est requis."),
  email: optionalEmail,
  phone: z.string().optional().transform(trimToUndefined),
  position: z.string().optional().transform(trimToUndefined),
  linkedinUrl: optionalLinkedInUrl,
});

export type CreateClientContactInput = z.infer<typeof createClientContactSchema>;

/**
 * Variantes des champs optionnels pour la mise à jour :
 * - string: mettre à jour avec une valeur non vide
 * - null: forcer l'effacement (set null en base)
 * - undefined: ne pas toucher au champ
 */
const updatableOptionalString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v === null) return v;
    return trimToUndefined(v);
  });

const updatableOptionalEmail = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v === null) return v;
    return trimToUndefined(v);
  })
  .refine((v) => v === null || !v || z.email().safeParse(v).success, {
    message: "Veuillez entrer une adresse email valide.",
  });

const updatableOptionalLinkedInUrl = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v === null) return v;
    return trimToUndefined(v);
  })
  .refine(
    (v) =>
      v === null ||
      !v ||
      /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?$/i.test(v),
    { message: "L'URL LinkedIn doit être au format linkedin.com/in/..." }
  );

/** Schéma de mise à jour d'un contact client */
export const updateClientContactSchema = z.object({
  id: z.uuid(),
  firstName: z.string().min(1, "Le prénom est requis.").optional(),
  lastName: z.string().min(1, "Le nom est requis.").optional(),
  email: updatableOptionalEmail,
  phone: updatableOptionalString,
  position: updatableOptionalString,
  linkedinUrl: updatableOptionalLinkedInUrl,
});

export type UpdateClientContactInput = z.infer<typeof updateClientContactSchema>;

