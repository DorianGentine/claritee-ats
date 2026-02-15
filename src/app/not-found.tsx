import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
      <h1 className="text-4xl font-bold tracking-tight text-foreground">
        404
      </h1>
      <p className="max-w-md text-center text-muted-foreground">
        La page que vous recherchez n'existe pas ou a été déplacée.
      </p>
      <Button asChild variant="default">
        <Link href="/">Retour à l'accueil</Link>
      </Button>
      <Button asChild variant="outline">
        <Link href="/dashboard">Tableau de bord</Link>
      </Button>
    </main>
  );
}
