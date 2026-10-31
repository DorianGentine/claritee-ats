import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";

/** En-tête des pages publiques : pilule crème inspirée de claritee.fr. */
export const PublicHeader = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-30 px-4 pt-4 sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-full border border-border bg-muted/85 py-2 pr-2 pl-6 shadow-sm backdrop-blur">
        <Logo href="/" />
        <div className="flex items-center gap-2">
          {user ? (
            <Button asChild className="rounded-full px-5">
              <Link href="/dashboard">Mon espace</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" className="hidden rounded-full sm:inline-flex">
                <Link href="/login">Se connecter</Link>
              </Button>
              <Button asChild className="rounded-full px-5">
                <Link href="/register">Créer un compte</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
