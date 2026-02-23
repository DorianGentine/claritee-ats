"use client"

import Link from "next/link"
import { api } from "@/lib/trpc/client"
import { formatSiren } from "@/lib/format"
import { Button } from "@/components/ui/button"

const ClientListSkeleton = () => (
  <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
    {Array.from({ length: 6 }).map((_, i) => (
      <li
        key={i}
        className="h-[120px] rounded-lg border border-border bg-card p-4 shadow-sm"
      >
        <div className="space-y-2">
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-28 animate-pulse rounded bg-muted" />
        </div>
      </li>
    ))}
  </ul>
)

export default function ClientsPage() {
  const listQuery = api.clientCompany.list.useQuery()
  const clients = listQuery.data ?? []

  const isLoading = listQuery.isLoading
  const isError = listQuery.isError

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background p-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Clients
          </h1>
          <Button variant="default" size="default" asChild>
            <Link href="/clients/new">Nouveau client</Link>
          </Button>
        </div>

        {isError ? (
          <section
            className="mt-8 flex flex-col items-center justify-center rounded-lg border border-border bg-card/50 py-16 text-center"
            aria-label="Erreur de chargement"
          >
            <p className="text-muted-foreground">
              Une erreur est survenue lors du chargement des clients.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => listQuery.refetch()}
            >
              Réessayer
            </Button>
          </section>
        ) : isLoading ? (
          <div className="mt-6">
            <ClientListSkeleton />
          </div>
        ) : clients.length === 0 ? (
          <section
            className="mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 py-16 text-center"
            aria-label="Aucun client"
          >
            <p className="text-muted-foreground">Aucun client ajouté.</p>
            <Button variant="default" className="mt-4" asChild>
              <Link href="/clients/new">Nouveau client</Link>
            </Button>
          </section>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clients.map((client) => (
              <li key={client.id}>
                <Link
                  href={`/clients/${client.id}`}
                  className="flex h-full flex-col justify-between rounded-lg border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="space-y-1">
                    <h2 className="truncate text-base font-semibold text-foreground">
                      {client.name}
                    </h2>
                    {client.siren ? (
                      <p className="text-sm text-muted-foreground">
                        SIREN {formatSiren(client.siren)}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        SIREN non renseigné
                      </p>
                    )}
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {client.contactsCount} contacts · {client.offersCount} offres
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}

