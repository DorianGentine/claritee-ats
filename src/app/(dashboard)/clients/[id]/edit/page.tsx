"use client";

import { useParams } from "next/navigation";
import { api } from "@/lib/trpc/client";
import { ClientCompanyForm } from "@/components/clients/ClientCompanyForm";

export default function EditClientPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const { data, isLoading, isError } = api.clientCompany.getById.useQuery(
    { id: id ?? "" },
    { enabled: !!id },
  );

  if (isLoading) {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] bg-background p-6">
        <div className="mx-auto max-w-xl">
          <div className="h-7 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-4 h-40 animate-pulse rounded-lg border border-border bg-card" />
        </div>
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] bg-background p-6">
        <div className="mx-auto max-w-xl">
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
      <div className="mx-auto max-w-xl">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Modifier le client
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajustez les informations de la société cliente existante.
        </p>
        <ClientCompanyForm
          mode="edit"
          initialClient={{
            id: data.id,
            name: data.name,
            siren: data.siren,
            cities: data.cities.map(({ city }) => city),
          }}
        />
      </div>
    </main>
  );
}
