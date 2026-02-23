"use client";

import { useParams } from "next/navigation";
import { api } from "@/lib/trpc/client";
import { formatSiren } from "@/lib/format";

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const { data, isLoading, isError } = api.clientCompany.getById.useQuery(
    { id },
    { enabled: !!id }
  );

  if (!id) {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] bg-background p-6">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Client introuvable
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Identifiant invalide.
          </p>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] bg-background p-6">
        <div className="mx-auto max-w-4xl">
          <div className="h-7 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-4 h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="mt-8 h-40 animate-pulse rounded-lg border border-border bg-card" />
        </div>
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] bg-background p-6">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Client introuvable
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ce client n'existe pas ou n'appartient pas à votre cabinet.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background p-6">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {data.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {data.siren ? `SIREN ${formatSiren(data.siren)}` : "SIREN non renseigné"}
          </p>
          <p className="text-sm text-muted-foreground">
            {data.contactsCount} contacts · {data.offersCount} offres
          </p>
        </header>

        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Contacts</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            La gestion des contacts clients sera ajoutée dans la Story 3.2.
          </p>
        </section>

        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Offres</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            L'association des offres aux clients sera ajoutée dans une story
            ultérieure.
          </p>
        </section>
      </div>
    </main>
  );
}

