"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Pencil, Trash2, Copy, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { toast } from "sonner"

type Contact = {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  position: string | null
  linkedinUrl: string | null
}

type Props = {
  contact: Contact
  onEdit: () => void
  onDelete: () => void
  deletePending?: boolean
}

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export const ClientContactCard = ({
  contact,
  onEdit,
  onDelete,
  deletePending = false,
}: Props) => {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const fullName = `${contact.firstName} ${contact.lastName}`.trim()

  const handleCopy = useCallback(
    async (value: string, field: "email" | "phone") => {
      const ok = await copyToClipboard(value)
      if (ok) {
        toast.success(`${field === "email" ? "Email" : "Numéro"} copié.`)
      } else {
        toast.error(`Échec de la copie de ${field === "email" ? "email" : "numéro"}.`)
      }
    },
    []
  )

  return (
    <>
      <div className="flex items-start justify-between gap-4 rounded-md border border-border bg-card p-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="font-medium text-foreground">{fullName}</p>
            {contact.position && (
              <p className="text-sm text-muted-foreground">{contact.position}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            {contact.email && (
              <div className="flex items-center gap-1.5">
                <a
                  href={`mailto:${contact.email}`}
                  className="text-primary hover:underline"
                >
                  {contact.email}
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Copier l'email"
                  onClick={() => handleCopy(contact.email!, "email")}
                  className="shrink-0"
                >
                  <Copy className="size-3" />
                </Button>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-1.5">
                <a
                  href={`tel:${contact.phone}`}
                  className="text-primary hover:underline"
                >
                  {contact.phone}
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Copier le numéro"
                  onClick={() => handleCopy(contact.phone!, "phone")}
                  className="shrink-0"
                >
                  <Copy className="size-3" />
                </Button>
              </div>
            )}
            {contact.linkedinUrl && (
              <a
                href={contact.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                LinkedIn
                <ExternalLink className="size-3" />
              </a>
            )}
          </div>
        </div>

        <div className="flex shrink-0 gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Modifier le contact"
            onClick={onEdit}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Supprimer le contact"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Supprimer ce contact ?"
        description={`Êtes-vous sûr de vouloir supprimer ${fullName} ?`}
        confirmLabel="Supprimer"
        pendingLabel="Suppression…"
        onConfirm={() => {
          onDelete()
          setDeleteOpen(false)
        }}
        pending={deletePending}
        confirmVariant="destructive"
      />
    </>
  )
}
