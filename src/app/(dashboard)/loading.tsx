export default function DashboardLoading() {
  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background p-6" aria-busy="true" aria-label="Chargement">
      <div className="mx-auto max-w-6xl">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-card p-6 shadow-sm"
            >
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-9 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </section>
        <div className="mt-6 h-4 w-72 animate-pulse rounded bg-muted" />
        <div className="mt-6 flex flex-wrap gap-3">
          <div className="h-9 w-36 animate-pulse rounded-md bg-muted" />
          <div className="h-9 w-32 animate-pulse rounded-md bg-muted" />
          <div className="h-9 w-32 animate-pulse rounded-md bg-muted" />
        </div>
      </div>
    </main>
  );
}
