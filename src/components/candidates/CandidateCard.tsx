"use client"

import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export type CandidateCardItem = {
  id: string
  firstName: string
  lastName: string
  title: string | null
  city: string | null
  photoUrl: string | null
  tags: { id: string; name: string; color: string }[]
}

const getInitials = (firstName: string, lastName: string): string =>
  `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() || "?"

export const CandidateCard = ({ c }: { c: CandidateCardItem }) => {
  const fullName = `${c.firstName} ${c.lastName}`.trim() || "Sans nom"
  const displayTags = c.tags.slice(0, 3)

  return (
    <Link
      href={`/candidates/${c.id}`}
      aria-label={`Voir la fiche de ${fullName}`}
      className="flex h-[130px] overflow-hidden rounded-lg border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/30 hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex min-h-0 flex-1 gap-4">
        <Avatar className="size-12 shrink-0">
          <AvatarImage src={c.photoUrl ?? undefined} alt="" />
          <AvatarFallback className="bg-secondary/80 text-secondary-foreground text-sm">
            {getInitials(c.firstName, c.lastName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="truncate font-medium text-foreground">{fullName}</p>
          {c.title ? (
            <p className="truncate text-sm text-muted-foreground">{c.title}</p>
          ) : null}
          {c.city ? (
            <p className="truncate text-sm text-muted-foreground">{c.city}</p>
          ) : null}
          {displayTags.length > 0 ? (
            <div className="mt-2 flex max-h-8 flex-wrap gap-1 overflow-hidden">
              {displayTags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex max-w-20 shrink-0 truncate rounded-md px-2 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor: `${tag.color}20`,
                    color: tag.color,
                  }}
                  title={tag.name}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  )
}
