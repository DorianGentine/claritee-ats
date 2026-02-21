import { router } from "../trpc"
import { authRouter } from "./auth"
import { candidateRouter } from "./candidate"
import { companyRouter } from "./company"
import { invitationRouter } from "./invitation"
import { searchRouter } from "./search"
import { tagRouter } from "./tag"

export const appRouter = router({
  auth: authRouter,
  candidate: candidateRouter,
  company: companyRouter,
  invitation: invitationRouter,
  search: searchRouter,
  tag: tagRouter,
})

export type AppRouter = typeof appRouter;
