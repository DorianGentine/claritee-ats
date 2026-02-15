"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export const SiteNavbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null | "loading">("loading");

  useEffect(() => {
    const supabase = createClient();

    const initAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const isDashboard =
    pathname?.startsWith("/dashboard") ||
    pathname?.startsWith("/candidates") ||
    pathname?.startsWith("/offers") ||
    pathname?.startsWith("/clients") ||
    pathname?.startsWith("/settings");

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b border-border bg-card px-4 shadow-sm">
      <Link
        href="/"
        className="text-lg font-semibold tracking-tight text-foreground transition-colors hover:text-primary"
      >
        Claritee
      </Link>

      <nav
        className="flex items-center gap-3"
        aria-label="Navigation principale"
      >
        {user === "loading" ? (
          <div className="h-8 w-32 animate-pulse rounded-md bg-muted" />
        ) : user ? (
          <>
            {!isDashboard && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard">Mon espace</Link>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Déconnexion
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/register">S&apos;inscrire</Link>
            </Button>
            <Button variant="default" size="sm" asChild>
              <Link href="/login">Se connecter</Link>
            </Button>
          </>
        )}
      </nav>
    </header>
  );
};
