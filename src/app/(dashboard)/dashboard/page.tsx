import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics";

export default function DashboardPage() {
  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background p-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Tableau de bord
        </h1>
        <DashboardMetrics />
      </div>
    </main>
  );
}
