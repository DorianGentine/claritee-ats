"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";

const INITIAL_VISIBLE = 5;

const OFFER_STATUS_LABELS: Record<string, string> = {
  TODO: "À traiter",
  IN_PROGRESS: "En cours",
  DONE: "Terminée",
};

const OFFER_STATUS_CLASSES: Record<string, string> = {
  TODO: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-primary/10 text-primary",
  DONE: "bg-secondary/10 text-secondary",
};

const formatDate = (date: Date | string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(
    new Date(date)
  );

const getNoteHref = (note: { candidateId: string | null; offerId: string | null }) => {
  if (note.candidateId) return `/candidates/${note.candidateId}`;
  if (note.offerId) return `/offers/${note.offerId}`;
  return `/notes`;
};

const getNoteLabel = (note: {
  title: string | null;
  candidate: { firstName: string; lastName: string } | null;
  jobOffer: { title: string } | null;
}) => {
  if (note.title) return note.title;
  if (note.candidate) return `Note sur ${note.candidate.firstName} ${note.candidate.lastName}`;
  if (note.jobOffer) return `Note sur l'offre '${note.jobOffer.title}'`;
  return "Note libre";
};

type ActivityItem = {
  id: string;
  href: string;
  label: string;
  date: Date | string;
  badge?: { label: string; className: string };
};

function ActivitySectionCard({
  title,
  items,
  emptyMessage,
}: {
  title: string;
  items: ActivityItem[];
  emptyMessage: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, INITIAL_VISIBLE);

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <div className="mt-3">
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <>
            <ul className="space-y-3">
              {visible.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-2 text-sm">
                  <Link href={item.href} className="font-medium text-foreground hover:underline">
                    {item.label}
                  </Link>
                  <div className="flex shrink-0 items-center gap-2">
                    {item.badge && (
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${item.badge.className}`}>
                        {item.badge.label}
                      </span>
                    )}
                    <span className="text-muted-foreground">{formatDate(item.date)}</span>
                  </div>
                </li>
              ))}
            </ul>
            {items.length > INITIAL_VISIBLE && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="mt-3 text-xs font-medium text-primary hover:underline"
              >
                {expanded ? "Voir moins" : "Voir plus"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function DashboardMetrics() {
  const { data, isLoading, isError } = api.dashboard.getStats.useQuery(undefined, {
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError || !data) {
    return (
      <p className="mt-6 text-sm text-muted-foreground">
        Impossible de charger les métriques. Veuillez rafraîchir la page.
      </p>
    );
  }

  const stats = data;

  const isAllZero =
    stats.totalCandidates === 0 &&
    stats.activeOffers === 0 &&
    stats.totalClients === 0;

  const candidateItems: ActivityItem[] = stats.recentCandidates.map((c) => ({
    id: c.id,
    href: `/candidates/${c.id}`,
    label: `${c.firstName} ${c.lastName}`,
    date: c.createdAt,
  }));

  const offerItems: ActivityItem[] = stats.recentOffers.map((o) => ({
    id: o.id,
    href: `/offers/${o.id}`,
    label: o.title,
    date: o.createdAt,
    badge: {
      label: OFFER_STATUS_LABELS[o.status] ?? o.status,
      className: OFFER_STATUS_CLASSES[o.status] ?? "bg-muted text-muted-foreground",
    },
  }));

  const noteItems: ActivityItem[] = stats.recentNotes.map((n) => ({
    id: n.id,
    href: getNoteHref(n),
    label: getNoteLabel(n),
    date: n.createdAt,
  }));

  return (
    <div>
      {/* Onboarding welcome block */}
      {isAllZero && (
        <div className="mt-6 rounded-lg border border-border bg-card p-6">
          <p className="text-sm font-medium text-foreground">Bienvenue sur Claritee !</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Commencez par ajouter un candidat ou une offre pour voir vos métriques apparaître ici.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/candidates/new"
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Nouveau candidat
            </Link>
            <Link
              href="/offers/new"
              className="inline-flex items-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              Nouvelle offre
            </Link>
          </div>
        </div>
      )}

      {/* Metric cards */}
      <section
        className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        aria-label="Indicateurs clés"
      >
        <Link href="/candidates" className="block">
          <article className="rounded-lg border border-border bg-card p-6 shadow-sm transition-colors hover:bg-accent">
            <h2 className="text-sm font-medium text-muted-foreground">Candidats</h2>
            <p className="mt-2 text-3xl font-semibold text-foreground">{stats.totalCandidates}</p>
          </article>
        </Link>
        <Link href="/offers" className="block">
          <article className="rounded-lg border border-border bg-card p-6 shadow-sm transition-colors hover:bg-accent">
            <h2 className="text-sm font-medium text-muted-foreground">Offres actives</h2>
            <p className="mt-2 text-3xl font-semibold text-foreground">{stats.activeOffers}</p>
          </article>
        </Link>
        <Link href="/clients" className="block">
          <article className="rounded-lg border border-border bg-card p-6 shadow-sm transition-colors hover:bg-accent">
            <h2 className="text-sm font-medium text-muted-foreground">Clients</h2>
            <p className="mt-2 text-3xl font-semibold text-foreground">{stats.totalClients}</p>
          </article>
        </Link>
      </section>

      {/* Activity sections */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <ActivitySectionCard
          title="Candidats récents"
          items={candidateItems}
          emptyMessage="Aucun candidat pour le moment."
        />
        <ActivitySectionCard
          title="Offres récentes"
          items={offerItems}
          emptyMessage="Aucune offre pour le moment."
        />
        <ActivitySectionCard
          title="Notes récentes"
          items={noteItems}
          emptyMessage="Aucune note pour le moment."
        />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div>
      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-2 h-8 w-16" />
          </div>
        ))}
      </section>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <Skeleton className="h-4 w-32" />
            <div className="mt-3 space-y-2">
              {[0, 1, 2, 3, 4].map((j) => (
                <Skeleton key={j} className="h-4 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
