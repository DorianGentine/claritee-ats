"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

/**
 * Placeholder pour la création d'offre.
 * Formulaire prévu dans la Story 3.4.
 */
export default function NewOfferPage() {
  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background p-6">
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-card/50 py-16 text-center">
          <h1 className="text-xl font-semibold text-foreground">
            Nouvelle offre
          </h1>
          <p className="text-muted-foreground">
            Le formulaire de création d'offre sera disponible dans la Story
            3.4.
          </p>
          <Button variant="outline" asChild>
            <Link href="/offers">Retour aux offres</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
