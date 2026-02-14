import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/server/db";

/**
 * Context créé pour chaque requête tRPC.
 * Auth via Supabase ; companyId résolu depuis la table User.
 */
export const createContext = async (_opts: FetchCreateContextFnOptions) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let companyId: string | null = null;
  if (user) {
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { companyId: true },
    });
    companyId = dbUser?.companyId ?? null;
  }

  return {
    db,
    user,
    companyId,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
