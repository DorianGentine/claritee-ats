import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics";

export default function DashboardPage() {
  return (
    <main className="p-6 lg:p-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Tableau de bord
        </h1>
        <DashboardMetrics />
      </div>
    </main>
  );
}
