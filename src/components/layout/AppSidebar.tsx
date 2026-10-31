"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import {
  Briefcase,
  Building2,
  LayoutDashboard,
  LogOut,
  Menu,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/trpc/client";
import { clearAllNoteDrafts } from "@/lib/note-draft";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { GlobalSearchBar } from "./GlobalSearchBar";
import { Logo } from "./Logo";
import { SIDEBAR_COLLAPSED_COOKIE } from "./sidebar-cookie";
import { getDisplayName, getInitials } from "./user-display";

type NavLink = { href: string; label: string; icon: LucideIcon };

const MAIN_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/candidates", label: "Candidats", icon: Users },
  { href: "/offers", label: "Offres", icon: Briefcase },
  { href: "/clients", label: "Clients", icon: Building2 },
];

const SECONDARY_LINKS: NavLink[] = [
  { href: "/notes", label: "Mes notes", icon: NotebookPen },
  { href: "/settings", label: "Paramètres", icon: Settings },
];

const persistCollapsed = (collapsed: boolean) => {
  document.cookie = `${SIDEBAR_COLLAPSED_COOKIE}=${collapsed ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
};

const isActivePath = (pathname: string | null, href: string) =>
  pathname === href || !!pathname?.startsWith(`${href}/`);

const SidebarLink = ({
  link,
  active,
  collapsed,
  onNavigate,
}: {
  link: NavLink;
  active: boolean;
  collapsed: boolean;
  onNavigate: () => void;
}) => {
  const Icon = link.icon;
  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? link.label : undefined}
      className={cn(
        "flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        collapsed && "lg:justify-center lg:px-0",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className={cn(collapsed && "lg:sr-only")}>{link.label}</span>
    </Link>
  );
};

type Props = {
  /** État replié lu côté serveur dans le cookie, pour éviter un saut au chargement. */
  defaultCollapsed?: boolean;
};

/**
 * Menu latéral de l'espace connecté.
 * Desktop : fixe, repliable (icônes seules). Mobile : tiroir ouvert depuis la barre du haut, toujours déplié.
 */
export const AppSidebar = ({ defaultCollapsed = false }: Props) => {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null | "loading">("loading");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const toggleCollapsed = () => {
    const nextCollapsed = !collapsed;
    setCollapsed(nextCollapsed);
    persistCollapsed(nextCollapsed);
  };

  useEffect(() => {
    const supabase = createClient();
    const initAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    void initAuth();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const companyQuery = api.company.getMyCompany.useQuery(undefined, {
    enabled: !!user && user !== "loading",
  });

  const closeMobile = () => setMobileOpen(false);

  const handleLogout = async () => {
    // Brouillons de notes rapides : ne pas les laisser sur un poste partagé
    clearAllNoteDrafts();
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <>
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur lg:hidden">
        <Logo href="/dashboard" className="text-xl" />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full bg-muted"
          onClick={() => setMobileOpen(true)}
          aria-label="Ouvrir le menu de navigation"
          aria-expanded={mobileOpen}
          aria-controls="app-sidebar"
        >
          <Menu className="size-5" aria-hidden />
        </Button>
      </div>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/30 lg:hidden"
          onClick={closeMobile}
          aria-hidden
        />
      )}

      <aside
        id="app-sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col gap-6 overflow-y-auto border-r border-sidebar-border bg-sidebar p-4 transition-[translate,width] duration-300 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:shrink-0 lg:translate-x-0",
          collapsed ? "lg:w-20 lg:px-3" : "lg:w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div
          className={cn(
            "flex items-start justify-between gap-2 px-2 pt-2",
            collapsed && "lg:flex-col lg:items-center lg:px-0"
          )}
        >
          <div className="min-w-0">
            <Logo href="/dashboard" compact={collapsed} />
            {companyQuery.data ? (
              <p
                className={cn(
                  "mt-1 truncate text-xs text-muted-foreground",
                  collapsed && "lg:hidden"
                )}
                aria-label="Nom du cabinet"
              >
                {companyQuery.data.name}
              </p>
            ) : companyQuery.isLoading ? (
              <span
                className={cn(
                  "mt-2 block h-3 w-28 animate-pulse rounded bg-muted",
                  collapsed && "lg:hidden"
                )}
                aria-hidden
              />
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="rounded-full lg:hidden"
            onClick={closeMobile}
            aria-label="Fermer le menu de navigation"
          >
            <X className="size-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="hidden shrink-0 rounded-full text-muted-foreground hover:text-foreground lg:inline-flex"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Déplier le menu" : "Replier le menu"}
            aria-expanded={!collapsed}
            aria-controls="app-sidebar"
            title={collapsed ? "Déplier le menu" : "Replier le menu"}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" aria-hidden />
            ) : (
              <PanelLeftClose className="size-4" aria-hidden />
            )}
          </Button>
        </div>

        <GlobalSearchBar compact={collapsed} />

        <nav aria-label="Navigation principale" className="flex flex-col gap-1">
          {MAIN_LINKS.map((link) => (
            <SidebarLink
              key={link.href}
              link={link}
              active={isActivePath(pathname, link.href)}
              collapsed={collapsed}
              onNavigate={closeMobile}
            />
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-4">
          <nav aria-label="Navigation secondaire" className="flex flex-col gap-1">
            {SECONDARY_LINKS.map((link) => (
              <SidebarLink
                key={link.href}
                link={link}
                active={isActivePath(pathname, link.href)}
                collapsed={collapsed}
                onNavigate={closeMobile}
              />
            ))}
          </nav>

          <div
            className={cn(
              "flex items-center gap-3 rounded-2xl border border-sidebar-border bg-card p-3",
              collapsed && "lg:flex-col lg:gap-2 lg:px-0 lg:py-3"
            )}
          >
            {user === "loading" ? (
              <div className="h-9 w-full animate-pulse rounded-md bg-muted" aria-hidden />
            ) : user ? (
              <>
                <Avatar className="size-9">
                  <AvatarImage src={user.user_metadata?.avatar_url as string | undefined} alt="" />
                  <AvatarFallback className="bg-secondary text-xs text-secondary-foreground">
                    {getInitials(user)}
                  </AvatarFallback>
                </Avatar>
                <div className={cn("min-w-0 flex-1", collapsed && "lg:hidden")}>
                  <p className="truncate text-sm font-medium text-foreground">
                    {getDisplayName(user)}
                  </p>
                  {user.email ? (
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full text-muted-foreground hover:text-destructive"
                  onClick={() => void handleLogout()}
                  aria-label="Se déconnecter"
                  title="Se déconnecter"
                >
                  <LogOut className="size-4" aria-hidden />
                </Button>
              </>
            ) : (
              <Button
                asChild
                size="sm"
                className={cn("w-full rounded-full", collapsed && "lg:w-auto lg:px-2")}
              >
                <Link href="/login">Se connecter</Link>
              </Button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
