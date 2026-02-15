import { router } from "../trpc";
import { authRouter } from "./auth";
import { companyRouter } from "./company";
import { invitationRouter } from "./invitation";

export const appRouter = router({
  auth: authRouter,
  company: companyRouter,
  invitation: invitationRouter,
});

export type AppRouter = typeof appRouter;
