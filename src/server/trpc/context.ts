import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

/**
 * Context créé pour chaque requête tRPC.
 * Auth et companyId seront ajoutés en Story 1.2.
 */
export const createContext = async (_opts: FetchCreateContextFnOptions) => {
  return {
    // db, companyId, session ajoutés en Story 1.2
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
