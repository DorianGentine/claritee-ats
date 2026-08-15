"use client"

import { useState } from "react"
import type { ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Copy } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/trpc/client"
import { getOfferStatusStyle } from "@/lib/offer-status-style"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { OfferTagsSection } from "@/components/offers/OfferTagsSection"
import { OfferCandidatesSection } from "@/components/offers/OfferCandidatesSection"
import { OfferNotesSection } from "@/components/offers/OfferNotesSection"

type Props = { offerId: string }

const DetailField = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <h2 className="mb-2 text-lg font-semibold text-foreground">{label}</h2>
    {children}
  </div>
)

const formatSalary = (min: number | null, max: number | null): string => {
  if (min == null && max == null) return "Salaire non précisé"
  const fmt = (n: number) => n.toLocaleString("fr-FR")
  if (min != null && max != null) return `${fmt(min)}\u2013${fmt(max)} €`
  if (min != null) return `À partir de ${fmt(min)} €`
  return `Jusqu'à ${fmt(max!)} €`
}

const copyToClipboard = async (text: string, label: string) => {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${label} copié.`)
  } catch {
    toast.error(`Échec de la copie de ${label.toLowerCase()}.`)
  }
}

export const OfferDetailView = ({ offerId }: Props) => {
  const router = useRouter()
  const utils = api.useUtils()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const getByIdQuery = api.offer.getById.useQuery({ id: offerId })

  const deleteMutation = api.offer.delete.useMutation({
    onSuccess: async () => {
      setDeleteOpen(false)
      await utils.offer.list.invalidate()
      toast.success("Offre supprimée.")
      router.push("/offers")
    },
    onError: () => {
      setDeleteOpen(false)
      toast.error("Impossible de supprimer cette offre.")
    },
  })

  if (getByIdQuery.isLoading) {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] bg-background p-6">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="flex gap-2">
            <div className="h-8 w-20 animate-pulse rounded bg-muted" />
            <div className="h-8 w-24 animate-pulse rounded bg-muted" />
            <div className="h-8 w-24 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-10 w-96 animate-pulse rounded bg-muted" />
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="h-48 animate-pulse rounded-lg bg-muted" />
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
            Offre introuvable ou vous n'avez pas accès à cette fiche.
          </p>
          <Button variant="outline" asChild className="mt-4">
            <Link href="/offers">Retour à la liste</Link>
          </Button>
        </div>
      </main>
    )
  }

  const offer = getByIdQuery.data
  const { label: statusLabel, badgeClassName: statusBadgeClass } = getOfferStatusStyle(offer.status)

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background p-6">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        {/* Barre d'actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/offers">Retour</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/offers/${offerId}/edit`}>Modifier</Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            Supprimer
          </Button>
        </div>

        {/* Header */}
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {offer.title}
            </h1>
            <Badge variant="outline" className={statusBadgeClass}>
              {statusLabel}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {offer.clientCompany ? (
              <Link
                href={`/clients/${offer.clientCompany.id}`}
                className="font-medium text-primary hover:underline"
              >
                {offer.clientCompany.name}
              </Link>
            ) : (
              <span>Client non défini</span>
            )}
            {offer.clientContact && (
              <span>
                Contact : {offer.clientContact.firstName} {offer.clientContact.lastName}
                {offer.clientContact.position && (
                  <span className="text-muted-foreground"> — {offer.clientContact.position}</span>
                )}
              </span>
            )}
          </div>
        </header>

        {/* Section Détails */}
        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">

          <div className="space-y-4">
            {/* Description */}
            <DetailField label="Description">
              {offer.description ? (
                <p className="whitespace-pre-wrap text-sm text-foreground">{offer.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Aucune description</p>
              )}
            </DetailField>

            {/* Localisation */}
            <DetailField label="Localisation">
              <p className="text-sm text-foreground">
                {offer.city
                  ? offer.city.region
                    ? `${offer.city.name}, ${offer.city.region}`
                    : offer.city.name
                  : "Localisation non précisée"}
              </p>
            </DetailField>

            {/* Salaire */}
            <DetailField label="Salaire">
              <p className="text-sm text-foreground">
                {formatSalary(offer.salaryMin, offer.salaryMax)}
              </p>
            </DetailField>

            {/* Tags — TagsSection inclut déjà son propre titre */}
            <OfferTagsSection
              offerId={offer.id}
              tags={offer.tags.map((t) => ({
                id: t.id,
                name: t.name,
                color: t.color,
              }))}
            />

            {/* Contact client */}
            {offer.clientContact && (
              <DetailField label="Contact référent">
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-foreground">
                    {offer.clientContact.firstName} {offer.clientContact.lastName}
                    {offer.clientContact.position && (
                      <span className="ml-1 font-normal text-muted-foreground">
                        — {offer.clientContact.position}
                      </span>
                    )}
                  </p>
                  {offer.clientContact.email && (
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`mailto:${offer.clientContact.email}`}
                        className="text-primary hover:underline"
                      >
                        {offer.clientContact.email}
                      </a>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Copier l'email"
                        onClick={() => copyToClipboard(offer.clientContact!.email!, "Email")}
                        className="shrink-0"
                      >
                        <Copy className="size-3" />
                      </Button>
                    </div>
                  )}
                  {offer.clientContact.phone && (
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:${offer.clientContact.phone}`}
                        className="text-primary hover:underline"
                      >
                        {offer.clientContact.phone}
                      </a>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Copier le numéro"
                        onClick={() => copyToClipboard(offer.clientContact!.phone!, "Numéro")}
                        className="shrink-0"
                      >
                        <Copy className="size-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </DetailField>
            )}
          </div>
        </section>

        {/* Section Candidats */}
        <OfferCandidatesSection
          offerId={offerId}
          candidatures={offer.candidatures}
          candidatureCountByStatus={offer.candidatureCountByStatus}
        />

        {/* Section Notes */}
        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <OfferNotesSection offerId={offerId} />
        </section>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Supprimer cette offre ?"
        description="Cette action est irréversible. Toutes les candidatures associées seront également supprimées."
        confirmLabel="Supprimer"
        pendingLabel="Suppression…"
        onConfirm={() => {
          deleteMutation.mutate({ id: offerId })
        }}
        pending={deleteMutation.isPending}
        confirmVariant="destructive"
      />
    </main>
  )
}
