"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";

const getInitials = (user: User): string => {
  const name =
    (user.user_metadata?.full_name as string) ||
    `${(user.user_metadata?.firstName as string)} ${(user.user_metadata?.lastName as string)}` ||
    user.email?.split("@")[0] ||
    "";
  if (name.includes(" ")) {
    return name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "?";
};

const getDisplayName = (user: User): string => {
  return (
    (user.user_metadata?.full_name as string) ||
    `${(user.user_metadata?.firstName as string)} ${(user.user_metadata?.lastName as string)}` ||
    (user.email ?? "Utilisateur")
  );
};

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
    { href: "/dashboard", label: "Dashboard", pathMatch: "/dashboard" },
    { href: "#", label: "Candidats (Bientôt)", disabled: true },
    { href: "#", label: "Offres (Bientôt)", disabled: true },
    { href: "#", label: "Clients (Bientôt)", disabled: true },
    { href: "/settings", label: "Paramètres", pathMatch: "/settings" },
  ].map((link) => ({
    ...link,
    active:
      "pathMatch" in link && link.pathMatch
        ? pathname === link.pathMatch || pathname?.startsWith(link.pathMatch + "/")
        : false,
  }));

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
              <span className="hidden text-sm text-muted-foreground min-[800px]:inline" aria-label="Nom du cabinet">
                {companyQuery.data.name}
              </span>
            ) : companyQuery.isLoading ? (
              <span className="h-4 w-32 animate-pulse rounded bg-muted" aria-hidden />
            ) : null}

            {/* Mobile: hamburger menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="min-[800px]:hidden"
                  aria-label="Ouvrir le menu de navigation"
                >
                  <Menu className="size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {companyQuery.data && (
                  <>
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      {companyQuery.data.name}
                    </div>
                    <DropdownMenuSeparator />
                  </>
                )}
                {navLinks.map((link) =>
                  link.disabled ? (
                    <DropdownMenuItem key={link.label} disabled>
                      {link.label}
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem key={link.label} asChild>
                      <Link
                        href={link.href}
                        className={cn(
                          link.active && "bg-secondary/20 font-medium text-secondary"
                        )}
                        aria-current={link.active ? "page" : undefined}
                      >
                        {link.label}
                      </Link>
                    </DropdownMenuItem>
                  )
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <nav
              className="hidden items-center gap-1 min-[800px]:flex"
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
                    className={cn(
                      "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-primary",
                      link.active ? "bg-secondary/20 text-secondary" : "text-foreground"
                    )}
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
            {!isDashboard && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard">Mon espace</Link>
              </Button>
            )}
            {isDashboard ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label="Menu utilisateur"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.user_metadata?.avatar_url as string} alt="" />
                      <AvatarFallback className="text-xs bg-secondary/80 text-secondary-foreground">
                        {getInitials(user)}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 text-right">
                  <div className="px-2 py-1.5 text-sm font-medium text-foreground">
                    {getDisplayName(user)}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="justify-end">
                    <Link href="/settings/team">Équipe</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="justify-end text-destructive focus:text-destructive"
                  >
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Déconnexion
              </Button>
            )}
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
