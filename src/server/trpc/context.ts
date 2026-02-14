import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/server/db";

/**
 * Context créé pour chaque requête tRPC.
 * Auth via Supabase ; companyId résolu depuis la table User.
 */
export const createContext = async (opts: FetchCreateContextFnOptions) => {
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

  const headers = opts.req.headers;
  return {
    db,
    user,
    companyId,
    headers,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
