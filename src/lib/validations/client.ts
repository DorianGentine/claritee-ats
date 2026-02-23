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

