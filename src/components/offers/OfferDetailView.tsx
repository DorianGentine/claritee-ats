"use client"

import Link from "next/link"
import { api } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { OfferTagsSection } from "@/components/offers/OfferTagsSection"

type Props = { offerId: string }

export const OfferDetailView = ({ offerId }: Props) => {
  const getByIdQuery = api.offer.getById.useQuery({ id: offerId })

  if (getByIdQuery.isLoading) {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] bg-background p-6">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="h-8 w-72 animate-pulse rounded bg-muted" />
          <div className="h-32 animate-pulse rounded-lg bg-muted" />
        </div>
      </main>
    )
  }

  if (getByIdQuery.error ?? !getByIdQuery.data) {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] bg-background p-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-muted-foreground">
            Offre introuvable ou vous n&apos;avez pas accès à cette fiche.
          </p>
          <Button variant="outline" asChild className="mt-4">
            <Link href="/offers">Retour à la liste</Link>
          </Button>
        </div>
      </main>
    )
  }

  const offer = getByIdQuery.data

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background p-6">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/offers">Retour</Link>
          </Button>
        </div>

        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {offer.title}
          </h1>
        </header>

        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <OfferTagsSection
            offerId={offer.id}
            tags={offer.tags.map((t) => ({
              id: t.id,
              name: t.name,
              color: t.color,
            }))}
          />
        </section>
      </div>
    </main>
  )
}
