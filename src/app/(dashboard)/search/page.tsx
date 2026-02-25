"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/trpc/client";
import { CandidateCard } from "@/components/candidates/CandidateCard";

const SearchPageContent = () => {
  const searchParams = useSearchParams();
  const q = searchParams.get("q")?.trim() ?? "";
  const effectiveQuery = q.length >= 2 ? q : "";

  const { data, isLoading } = api.search.search.useQuery(
    { q: effectiveQuery, limit: 30 },
    {
      enabled: effectiveQuery.length >= 2,
      placeholderData: (previousData) => previousData,
      staleTime: 60 * 1000,
    }
  );

  if (effectiveQuery.length < 2) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <h1 className="text-xl font-semibold">Recherche</h1>
        <p className="text-muted-foreground">
          Utilisez la barre de recherche avec au moins 2 caractères.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <h1 className="text-xl font-semibold">
          Résultats pour "{effectiveQuery}"
        </h1>
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Chargement…
        </div>
      </div>
    );
  }

  const candidates = data?.candidates ?? [];
  const offers = data?.offers ?? [];
  const hasResults = candidates.length > 0 || offers.length > 0;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold">
        Résultats pour "{effectiveQuery}"
      </h1>

      {!hasResults ? (
        <p className="text-muted-foreground">
          Aucun résultat pour "{effectiveQuery}"
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          {candidates.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Candidats
              </h2>
              <ul
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                aria-label="Résultats candidats"
              >
                {candidates.map((c) => (
                  <li key={c.id}>
                    <CandidateCard c={c} />
                  </li>
                ))}
              </ul>
            </section>
          )}
          {offers.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Offres
              </h2>
              <ul className="flex flex-col gap-2">
                {offers.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/offers/${o.id}`}
                      className="block rounded-md border border-border p-4 transition-colors hover:bg-accent"
                    >
                      <span className="font-medium">{o.title}</span>
                      {o.clientCompany?.name && (
                        <span className="ml-2 text-muted-foreground">
                          — {o.clientCompany.name}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

const SearchPageFallback = () => (
  <div className="flex flex-1 flex-col gap-4 p-6">
    <div className="h-7 w-48 animate-pulse rounded bg-muted" />
    <div className="h-5 w-64 animate-pulse rounded bg-muted" />
  </div>
);

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageFallback />}>
      <SearchPageContent />
    </Suspense>
  );
}
