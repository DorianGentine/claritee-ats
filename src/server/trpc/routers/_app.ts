import { router } from "../trpc";

export const appRouter = router({
  // Routers métier (candidate, offer, etc.) ajoutés en Story 1.2+
});

export type AppRouter = typeof appRouter;
