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

/** Schéma de mise à jour d'un contact client (partial + id) */
export const updateClientContactSchema = z
  .object({ id: z.uuid() })
  .merge(createClientContactSchema.partial());

export type UpdateClientContactInput = z.infer<typeof updateClientContactSchema>;

