import { z } from "zod";
import { emailSchema } from "./auth";

/** Schéma pour créer une invitation (email requis) */
export const createInvitationSchema = z.object({
  email: emailSchema,
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
