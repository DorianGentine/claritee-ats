import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <main className="bg-background p-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Tableau de bord
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Bienvenue sur Claritee ATS.
      </p>
      <div className="mt-6">
        <Button variant="outline" asChild>
          <Link href="/settings/team">Gérer l'équipe</Link>
        </Button>
      </div>
    </main>
  );
}
