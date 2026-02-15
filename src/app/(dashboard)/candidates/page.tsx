"use client";

import { useState } from "react";
import Link from "next/link";
import { keepPreviousData } from "@tanstack/react-query";
import { api } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const PAGE_SIZE = 20;

const CandidateListSkeleton = () => (
  <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
    {Array.from({ length: 6 }).map((_, i) => (
      <li key={i} className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex gap-4">
          <div className="size-12 shrink-0 animate-pulse rounded-full bg-muted" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </li>
    ))}
  </ul>
);

type CandidateItem = {
  id: string;
  firstName: string;
  lastName: string;
  title: string | null;
  city: string | null;
  photoUrl: string | null;
  tags: { id: string; name: string; color: string }[];
};

const getInitials = (firstName: string, lastName: string): string =>
  `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() || "?";

const CandidateCard = ({ c }: { c: CandidateItem }) => {
  const fullName = `${c.firstName} ${c.lastName}`.trim() || "Sans nom";
  return (
    <Link
      href={`/candidates/${c.id}`}
      aria-label={`Voir la fiche de ${fullName}`}
      className="block rounded-lg border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/30 hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex gap-4">
        <Avatar className="size-12 shrink-0">
          <AvatarImage src={c.photoUrl ?? undefined} alt="" />
          <AvatarFallback className="bg-secondary/80 text-secondary-foreground text-sm">
            {getInitials(c.firstName, c.lastName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground truncate">{fullName}</p>
          {c.title ? (
            <p className="text-sm text-muted-foreground truncate">{c.title}</p>
          ) : null}
          {c.city ? (
            <p className="text-sm text-muted-foreground truncate">{c.city}</p>
          ) : null}
          {c.tags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {c.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex rounded-md px-2 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor: `${tag.color}20`,
                    color: tag.color,
                  }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  );
};

export default function CandidatesPage() {
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const listQuery = api.candidate.list.useQuery(
    { limit: PAGE_SIZE, ...(cursor ? { cursor } : {}) },
    { placeholderData: keepPreviousData }
  );

  const items = listQuery.data?.items ?? [];
  const nextCursor = listQuery.data?.nextCursor ?? null;
  const isLoading = listQuery.isLoading;
  const isFetching = listQuery.isFetching;
  const isError = listQuery.isError;

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background p-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Candidats
          </h1>
          <Button variant="default" size="default" asChild>
            <Link href="/candidates/new">Nouveau candidat</Link>
          </Button>
        </div>

        {isError ? (
          <section
            className="mt-8 flex flex-col items-center justify-center rounded-lg border border-border bg-card/50 py-16 text-center"
            aria-label="Erreur de chargement"
          >
            <p className="text-muted-foreground">
              Une erreur est survenue lors du chargement des candidats.
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
            <CandidateListSkeleton />
          </div>
        ) : items.length === 0 ? (
          <section
            className="mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 py-16 text-center"
            aria-label="Aucun candidat"
          >
            <p className="text-muted-foreground">
              Vous n&apos;avez pas encore de candidat.
            </p>
            <Button variant="default" className="mt-4" asChild>
              <Link href="/candidates/new">Ajouter un candidat</Link>
            </Button>
          </section>
        ) : (
          <>
            <ul
              className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              aria-busy={isFetching}
            >
              {items.map((c) => (
                <li key={c.id}>
                  <CandidateCard c={c} />
                </li>
              ))}
            </ul>

            {(nextCursor || cursor) ? (
              <nav
                className="mt-6 flex justify-center gap-2"
                aria-label="Pagination de la liste des candidats"
              >
                {cursor ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isFetching}
                    onClick={() => setCursor(undefined)}
                    aria-label="Page précédente"
                  >
                    Précédent
                  </Button>
                ) : null}
                {nextCursor ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isFetching}
                    onClick={() => setCursor(nextCursor)}
                    aria-label="Page suivante"
                  >
                    Suivant
                  </Button>
                ) : null}
              </nav>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
