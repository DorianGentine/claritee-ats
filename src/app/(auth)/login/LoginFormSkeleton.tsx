export const LoginFormSkeleton = () => (
  <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 shadow">
    <div className="space-y-2">
      <div className="h-4 w-16 animate-pulse rounded bg-muted" />
      <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
    </div>
    <div className="space-y-2">
      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
    </div>
    <div className="mt-2 h-9 w-full animate-pulse rounded-md bg-muted" />
  </div>
);
