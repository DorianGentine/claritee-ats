import { router } from "../trpc";
import { authRouter } from "./auth";
import { candidateRouter } from "./candidate";
import { companyRouter } from "./company";
import { invitationRouter } from "./invitation";
import { noteRouter } from "./note";
import { searchRouter } from "./search";
import { tagRouter } from "./tag";
import { clientRouter } from "./client";
import { offerRouter } from "./offer";

export const appRouter = router({
  auth: authRouter,
  candidate: candidateRouter,
  clientCompany: clientRouter,
  company: companyRouter,
  invitation: invitationRouter,
  note: noteRouter,
  offer: offerRouter,
  search: searchRouter,
  tag: tagRouter,
});

export type AppRouter = typeof appRouter;
