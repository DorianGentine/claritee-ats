"use client"

import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { api } from "@/lib/trpc/client"
import { createTRPCClient } from "@/lib/trpc/trpc"
import { Toaster } from "@/components/ui/sonner"

const queryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
    },
  },
}

export const Providers = ({ children }: { children: React.ReactNode }) => {
  const [queryClient] = useState(() => new QueryClient(queryClientConfig));
  const [trpcClient] = useState(() => createTRPCClient());

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      <Toaster />
    </api.Provider>
  )
}
