import { router } from "../trpc"
import { authRouter } from "./auth"
import { candidateRouter } from "./candidate"
import { candidatureRouter } from "./candidature"
import { companyRouter } from "./company"
import { invitationRouter } from "./invitation"
import { noteRouter } from "./note"
import { searchRouter } from "./search"
import { tagRouter } from "./tag"
import { clientRouter } from "./client"
import { offerRouter } from "./offer"
import { shareLinkRouter } from "./shareLink"

export const appRouter = router({
  auth: authRouter,
  candidate: candidateRouter,
  candidature: candidatureRouter,
  clientCompany: clientRouter,
  company: companyRouter,
  invitation: invitationRouter,
  note: noteRouter,
  offer: offerRouter,
  search: searchRouter,
  shareLink: shareLinkRouter,
  tag: tagRouter,
})

export type AppRouter = typeof appRouter;
