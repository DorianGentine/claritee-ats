import { httpBatchLink } from "@trpc/client";
import { api } from "./client";

const getBaseUrl = () => {
  if (typeof window !== "undefined") return "";
  return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
};

export const createTRPCClient = () =>
  api.createClient({
    links: [
      httpBatchLink({
        url: `${getBaseUrl()}/api/trpc`,
      }),
    ],
  });
