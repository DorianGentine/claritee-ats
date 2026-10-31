"use client";

import { ClientCompanyForm } from "@/components/clients/ClientCompanyForm";

export default function NewClientPage() {
  return (
    <main className="p-6 lg:p-10">
      <div className="mx-auto max-w-xl">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Nouveau client
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Renseignez la société cliente pour pouvoir y associer des offres.
        </p>
        <ClientCompanyForm mode="create" />
      </div>
    </main>
  );
}
