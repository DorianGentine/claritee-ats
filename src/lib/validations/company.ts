import { z } from "zod";

export const updateCompanySchema = z.object({
  name: z.string().min(1, "Le nom est requis."),
});

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
