import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-background px-4 py-16">
      <div className="mx-auto max-w-2xl space-y-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Claritee ATS
        </h1>
        <p className="text-lg text-muted-foreground">
          Gestion de candidats et d&apos;offres pour cabinets de recrutement.
          Simple, chaleureux, efficace.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          {user ? (
            <Button variant="default" size="lg" asChild>
              <Link href="/dashboard">Accéder à mon espace</Link>
            </Button>
          ) : (
            <>
              <Button variant="default" size="lg" asChild>
                <Link href="/register">Créer un compte</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/login">Se connecter</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
