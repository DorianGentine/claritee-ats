"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/trpc/client";
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

  const companyQuery = api.company.getMyCompany.useQuery(undefined, {
    enabled: !!user && user !== "loading" && isDashboard,
  });

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", active: pathname === "/dashboard", disabled: false },
    { href: "#", label: "Candidats (Bientôt)", disabled: true },
    { href: "#", label: "Offres (Bientôt)", disabled: true },
    { href: "#", label: "Clients (Bientôt)", disabled: true },
  ];

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b border-border bg-card px-4 shadow-sm">
      <div className="flex items-center gap-6">
        <Link
          href={user && user !== "loading" && isDashboard ? "/dashboard" : "/"}
          className="text-lg font-semibold tracking-tight text-foreground transition-colors hover:text-primary"
        >
          Claritee
        </Link>

        {user && user !== "loading" && isDashboard && (
          <>
            {companyQuery.data ? (
              <span className="text-sm text-muted-foreground" aria-label="Nom du cabinet">
                {companyQuery.data.name}
              </span>
            ) : companyQuery.isLoading ? (
              <span className="h-4 w-32 animate-pulse rounded bg-muted" aria-hidden />
            ) : null}

            <nav
              className="hidden items-center gap-1 sm:flex"
              aria-label="Navigation principale"
            >
              {navLinks.map((link) =>
                link.disabled ? (
                  <span
                    key={link.label}
                    className="rounded-md px-3 py-2 text-sm text-muted-foreground/70"
                    aria-disabled="true"
                    title="Bientôt"
                  >
                    {link.label}
                  </span>
                ) : (
                  <Link
                    key={link.label}
                    href={link.href}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-primary ${
                      link.active ? "bg-secondary/20 text-secondary" : "text-foreground"
                    }`}
                    aria-current={link.active ? "page" : undefined}
                  >
                    {link.label}
                  </Link>
                ),
              )}
            </nav>
          </>
        )}
      </div>

      <nav
        className="flex items-center gap-3"
        aria-label="Actions utilisateur"
      >
        {user === "loading" ? (
          <div className="h-8 w-32 animate-pulse rounded-md bg-muted" />
        ) : user ? (
          <>
            {isDashboard && (
              <span className="hidden max-w-[160px] truncate text-sm text-muted-foreground sm:block" title={user.email ?? undefined}>
                {user.email}
              </span>
            )}
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
