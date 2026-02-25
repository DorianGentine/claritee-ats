import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background p-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Tableau de bord
        </h1>

        {/* Metric cards — counts hardcoded to 0 for now (AC 3, 4) */}
        <section
          className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          aria-label="Indicateurs clés"
        >
          <article
            className="rounded-lg border border-border bg-card p-6 shadow-sm"
            aria-labelledby="card-candidats"
          >
            <h2
              id="card-candidats"
              className="text-sm font-medium text-muted-foreground"
            >
              Candidats
            </h2>
            <p className="mt-2 text-3xl font-semibold text-foreground">0</p>
          </article>
          <article
            className="rounded-lg border border-border bg-card p-6 shadow-sm"
            aria-labelledby="card-offres"
          >
            <h2
              id="card-offres"
              className="text-sm font-medium text-muted-foreground"
            >
              Offres actives
            </h2>
            <p className="mt-2 text-3xl font-semibold text-foreground">0</p>
          </article>
          <article
            className="rounded-lg border border-border bg-card p-6 shadow-sm"
            aria-labelledby="card-clients"
          >
            <h2
              id="card-clients"
              className="text-sm font-medium text-muted-foreground"
            >
              Clients
            </h2>
            <p className="mt-2 text-3xl font-semibold text-foreground">0</p>
          </article>
        </section>

        {/* Empty state message (AC 10) */}
        <p className="mt-6 text-sm text-muted-foreground">
          Ajoutez votre premier candidat ou une offre pour commencer.
        </p>

        {/* Quick action buttons (AC 5) — disabled / coming soon */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            variant="default"
            disabled
            aria-disabled="true"
            title="Bientôt"
          >
            Nouveau candidat
          </Button>
          <Button
            variant="secondary"
            disabled
            aria-disabled="true"
            title="Bientôt"
          >
            Nouvelle offre
          </Button>
          <Button variant="outline" asChild>
            <Link href="/settings/team">Gérer l&apos;équipe</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
