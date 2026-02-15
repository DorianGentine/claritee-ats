import { z } from "zod";

const LIST_PAGE_SIZE = 20;

/** Input pour la liste paginée des candidats (cursor-based) */
export const candidateListInputSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(LIST_PAGE_SIZE),
});

export type CandidateListInput = z.infer<typeof candidateListInputSchema>;

export { LIST_PAGE_SIZE };
