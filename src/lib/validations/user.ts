import { z } from "zod";

export const updateProfileSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis."),
  lastName: z.string().min(1, "Le nom est requis."),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
