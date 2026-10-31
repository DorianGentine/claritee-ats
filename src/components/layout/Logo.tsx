import Link from "next/link";
import { cn } from "@/lib/utils";

type Props = {
  href: string;
  className?: string;
  /** Sur desktop, n'affiche que « C. » (menu latéral replié). */
  compact?: boolean;
};

/** Logotype « Claritee. » : point final en terracotta, comme sur claritee.fr. */
export const Logo = ({ href, className, compact = false }: Props) => (
  <Link
    href={href}
    aria-label="Claritee"
    className={cn(
      "font-display text-2xl font-semibold tracking-tight text-foreground",
      className
    )}
  >
    <span className={cn(compact && "lg:hidden")}>Claritee</span>
    {compact && <span className="hidden lg:inline">C</span>}
    <span className="text-primary">.</span>
  </Link>
);
