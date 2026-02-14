import { z } from "zod";

/** Message d'erreur email invalide (PRD Standard Error Messages) */
const emailInvalidMessage = "Veuillez entrer une adresse email valide.";

/** Message d'erreur SIREN invalide (PRD Standard Error Messages) */
const sirenInvalidMessage =
  "Le SIREN doit contenir exactement 9 chiffres.";

/** Email : format valide */
export const emailSchema = z
  .string()
  .min(1, emailInvalidMessage)
  .email(emailInvalidMessage);

/** Mot de passe : minimum 8 caractères (AC 3) */
export const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères.");

/** SIREN : exactement 9 chiffres (AC 4) */
export const sirenSchema = z
  .string()
  .regex(/^\d{9}$/, sirenInvalidMessage);

/** Schéma complet pour le formulaire d'inscription (client + réutilisation tRPC) */
export const registerFormSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis."),
  lastName: z.string().min(1, "Le nom est requis."),
  email: emailSchema,
  password: passwordSchema,
  companyName: z.string().min(1, "Le nom de l'entreprise est requis."),
  siren: sirenSchema,
});

/** Input pour register (tout côté serveur : vérifs puis création Auth + Company + User) */
export const registerSchema = registerFormSchema;

export type RegisterFormValues = z.infer<typeof registerFormSchema>;
