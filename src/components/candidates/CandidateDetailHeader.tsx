"use client";

import { Pencil } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export type CandidateDetailHeaderProps = {
  photoUrl: string | null;
  firstName: string;
  lastName: string;
  title?: string | null;
  city?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedinUrl?: string | null;
  /** Affiche le bouton « Modifier » en haut à droite (absent sur les fiches publiques). */
  onEdit?: () => void;
};

export const CandidateDetailHeader = ({
  photoUrl,
  firstName,
  lastName,
  title,
  city,
  email,
  phone,
  linkedinUrl,
  onEdit,
}: CandidateDetailHeaderProps) => {
  const fullName =
    [firstName, lastName].filter(Boolean).join(" ") || "Sans nom";
  const initials =
    `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "?";

  return (
    <header className="relative flex flex-col gap-4 rounded-lg border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-start print:shadow-none">
      {onEdit && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onEdit}
          className="absolute top-4 right-4 rounded-full text-muted-foreground hover:text-foreground print:hidden"
          aria-label="Modifier le profil"
          title="Modifier le profil"
        >
          <Pencil className="size-4" aria-hidden />
        </Button>
      )}
      <Avatar className="size-20 shrink-0 rounded-full border-2 border-border">
        <AvatarImage
          src={photoUrl ?? undefined}
          alt={fullName !== "Sans nom" ? `Photo de ${fullName}` : ""}
        />
        <AvatarFallback className="bg-secondary/80 text-lg text-secondary-foreground">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className={onEdit ? "min-w-0 flex-1 pr-10" : "min-w-0 flex-1"}>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {fullName}
        </h1>
        {title && (
          <p className="mt-1 text-muted-foreground">{title}</p>
        )}
        {city && (
          <p className="mt-0.5 text-sm text-muted-foreground">{city}</p>
        )}
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {email && (
            <li>
              <a
                href={`mailto:${email}`}
                className="text-primary hover:underline"
              >
                {email}
              </a>
            </li>
          )}
          {phone && (
            <li>
              <a
                href={`tel:${phone}`}
                className="text-primary hover:underline"
              >
                {phone}
              </a>
            </li>
          )}
          {linkedinUrl && (
            <li>
              <a
                href={linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                LinkedIn
              </a>
            </li>
          )}
        </ul>
      </div>
    </header>
  );
};
