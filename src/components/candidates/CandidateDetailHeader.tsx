"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export type CandidateDetailHeaderProps = {
  photoUrl: string | null;
  firstName: string;
  lastName: string;
  title?: string | null;
  city?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedinUrl?: string | null;
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
}: CandidateDetailHeaderProps) => {
  const fullName =
    [firstName, lastName].filter(Boolean).join(" ") || "Sans nom";
  const initials =
    `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "?";

  return (
    <header className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-start print:shadow-none">
      <Avatar className="size-20 shrink-0 rounded-full border-2 border-border">
        <AvatarImage
          src={photoUrl ?? undefined}
          alt={fullName !== "Sans nom" ? `Photo de ${fullName}` : ""}
        />
        <AvatarFallback className="bg-secondary/80 text-lg text-secondary-foreground">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
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
