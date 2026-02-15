import { router } from "../trpc";
import { authRouter } from "./auth";
import { candidateRouter } from "./candidate";
import { companyRouter } from "./company";
import { invitationRouter } from "./invitation";

export const appRouter = router({
  auth: authRouter,
  candidate: candidateRouter,
  company: companyRouter,
  invitation: invitationRouter,
});

export type AppRouter = typeof appRouter;
