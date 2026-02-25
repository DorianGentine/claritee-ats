import { z } from "zod";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/** Colonnes autorisées pour le tri (whitelist anti-injection) */
export const offerSortBySchema = z.enum(["createdAt", "status"]);
export const offerSortOrderSchema = z.enum(["asc", "desc"]);

/** Input pour la liste paginée des offres (offer.list) */
export const offerListInputSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  sortBy: offerSortBySchema.default("createdAt"),
  sortOrder: offerSortOrderSchema.default("desc"),
});

export type OfferListInput = z.infer<typeof offerListInputSchema>;
