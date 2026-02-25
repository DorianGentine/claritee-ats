import { z } from "zod";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/** Colonnes autorisées pour le tri (whitelist anti-injection) */
export const offerSortBySchema = z.enum(["createdAt", "status"]);
export const offerSortOrderSchema = z.enum(["asc", "desc"]);

/** Input pour la liste paginée des offres (offer.list) */
export const offerListInputSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
  sortBy: offerSortBySchema.default("createdAt"),
  sortOrder: offerSortOrderSchema.default("desc"),
});

export type OfferListInput = z.infer<typeof offerListInputSchema>;

/** Trim et vide → undefined pour les champs optionnels */
const trimToUndefined = (s: string | undefined) =>
  (typeof s === "string" ? s.trim() : s) || undefined;

/** Enum de statut d'offre (miroir de JobOfferStatus Prisma) */
export const jobOfferStatusSchema = z.enum(["TODO", "IN_PROGRESS", "DONE"]);

/** Champs de base (sans refinements) pour réutiliser en create et update */
const jobOfferBaseFieldsSchema = z.object({
  title: z
    .string()
    .min(1, "Titre est requis.")
    .transform((v) => v.trim()),
  description: z.string().optional().transform(trimToUndefined),
  location: z.string().optional().transform(trimToUndefined),
  salaryMin: z
    .number({ message: "Le salaire doit être un nombre." })
    .int("Le salaire doit être un nombre entier.")
    .nonnegative("Le salaire doit être positif ou nul.")
    .optional(),
  salaryMax: z
    .number({ message: "Le salaire doit être un nombre." })
    .int("Le salaire doit être un nombre entier.")
    .nonnegative("Le salaire doit être positif ou nul.")
    .optional(),
  status: jobOfferStatusSchema.default("TODO"),
  clientCompanyId: z.uuid().optional(),
  clientContactId: z.uuid().optional(),
});

const salaryAndContactRefine = (
  value: {
    salaryMin?: number | null;
    salaryMax?: number | null;
    clientCompanyId?: string | null;
    clientContactId?: string | null;
  },
  ctx: z.RefinementCtx
) => {
  if (
    typeof value.salaryMin === "number" &&
    typeof value.salaryMax === "number" &&
    value.salaryMin > value.salaryMax
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["salaryMax"],
      message:
        "Le salaire minimum ne peut pas être supérieur au salaire maximum.",
    });
  }
  if (value.clientContactId && !value.clientCompanyId) {
    ctx.addIssue({
      code: "custom",
      path: ["clientContactId"],
      message: "Un contact référent nécessite un client associé.",
    });
  }
};

/** Schéma pour la création d'une offre */
export const createJobOfferSchema = jobOfferBaseFieldsSchema.superRefine(
  salaryAndContactRefine
);

/** Pour l'update, on accepte null sur les champs optionnels pour permettre de "vider" une valeur en BDD. */
const optionalNullableString = z
  .string()
  .optional()
  .nullable()
  .transform((v) =>
    v == null || (typeof v === "string" && !v.trim()) ? null : v.trim()
  );

/** Schéma pour la mise à jour d'une offre existante (patch partiel). On part du schéma de base sans refinements pour pouvoir utiliser .partial(). */
export const updateJobOfferSchema = jobOfferBaseFieldsSchema
  .partial()
  .extend({
    id: z.uuid(),
    description: optionalNullableString,
    location: optionalNullableString,
    salaryMin: z.number().int().nonnegative().optional().nullable(),
    salaryMax: z.number().int().nonnegative().optional().nullable(),
    clientCompanyId: z.uuid().optional().nullable(),
    clientContactId: z.uuid().optional().nullable(),
  })
  .superRefine(salaryAndContactRefine);

export type CreateJobOfferInput = z.infer<typeof createJobOfferSchema>;
export type UpdateJobOfferInput = z.infer<typeof updateJobOfferSchema>;
