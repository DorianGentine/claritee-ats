"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { api } from "@/lib/trpc/client"
import { formatSiren } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { ClientContactCard } from "@/components/clients/ClientContactCard"
import { ClientContactFormModal } from "@/components/clients/ClientContactFormModal"
import { toast } from "sonner"

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [modalOpen, setModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<{
    id: string
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
    position: string | null
    linkedinUrl: string | null
  } | null>(null)

  const { data, isLoading, isError } = api.clientCompany.getById.useQuery(
    { id },
    { enabled: !!id }
  )

  const utils = api.useUtils()
  const deleteContactMutation = api.clientCompany.deleteContact.useMutation({
    onSuccess: () => {
      if (id) void utils.clientCompany.getById.invalidate({ id })
      toast.success("Contact supprimé.")
    },
  })

  if (!id) {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] bg-background p-6">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Client introuvable
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Identifiant invalide.
          </p>
        </div>
      </main>
    )
  }

  if (isLoading) {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] bg-background p-6">
        <div className="mx-auto max-w-4xl">
          <div className="h-7 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-4 h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="mt-8 h-40 animate-pulse rounded-lg border border-border bg-card" />
        </div>
      </main>
    )
  }

  if (isError || !data) {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] bg-background p-6">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Client introuvable
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ce client n'existe pas ou n'appartient pas à votre cabinet.
          </p>
        </div>
      </main>
    )
  }

  const openAddModal = () => {
    setEditingContact(null)
    setModalOpen(true)
  }

  const openEditModal = (contact: (typeof data.contacts)[0]) => {
    setEditingContact(contact)
    setModalOpen(true)
  }

  const handleModalClose = (open: boolean) => {
    if (!open) setEditingContact(null)
    setModalOpen(open)
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background p-6">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {data.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {data.siren ? `SIREN ${formatSiren(data.siren)}` : "SIREN non renseigné"}
          </p>
          <p className="text-sm text-muted-foreground">
            {data.contactsCount} contacts · {data.offersCount} offres
          </p>
        </header>

        <section className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold text-foreground">Contacts</h2>
            <Button variant="outline" size="sm" onClick={openAddModal}>
              Ajouter un contact
            </Button>
          </div>
          {data.contacts.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Aucun contact ajouté
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {data.contacts.map((contact) => (
                <li key={contact.id}>
                  <ClientContactCard
                    contact={contact}
                    onEdit={() => openEditModal(contact)}
                    onDelete={() =>
                      deleteContactMutation.mutate({ id: contact.id })
                    }
                    deletePending={deleteContactMutation.isPending}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <ClientContactFormModal
          open={modalOpen}
          onOpenChange={handleModalClose}
          clientCompanyId={data.id}
          contact={editingContact}
          onSuccess={() => handleModalClose(false)}
        />

        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Offres</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            L'association des offres aux clients sera ajoutée dans une story
            ultérieure.
          </p>
        </section>
      </div>
    </main>
  )
}

