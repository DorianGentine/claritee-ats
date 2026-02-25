"use client";

import { JobOfferForm } from "@/components/offers/JobOfferForm";

const NewOfferPage = () => (
  <main className="min-h-[calc(100vh-3.5rem)] bg-background p-6">
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Nouvelle offre
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Renseignez les informations de l'offre à publier.
      </p>
      <JobOfferForm mode="create" />
    </div>
  </main>
);

export default NewOfferPage;
