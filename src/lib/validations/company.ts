import { z } from "zod"

export const updateCompanySchema = z.object({
  name: z.string().min(1, "Le nom est requis."),
})

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>

export const deleteCompanyUserSchema = z.object({
  userId: z.uuid(),
})

export type DeleteCompanyUserInput = z.infer<typeof deleteCompanyUserSchema>

/** Le nom du cabinet, saisi à l'identique, confirme une suppression irréversible. */
export const deleteCompanySchema = z.object({
  confirmName: z
    .string()
    .trim()
    .min(1, "Saisissez le nom du cabinet.")
    .max(255),
})

export type DeleteCompanyInput = z.infer<typeof deleteCompanySchema>
