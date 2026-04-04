"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Copy, Share2, ExternalLink } from "lucide-react"
import { api } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  type ShareLinkType,
  type ShareLinkExpiration,
  EXPIRATION_LABELS,
  TYPE_LABELS,
} from "@/lib/validations/shareLink"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  candidateId: string
}

const buildShareUrl = (token: string): string =>
  `${window.location.origin}/share/${token}`

const formatDate = (date: Date | string | null): string => {
  if (!date) return "Jamais"
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

const copyToClipboard = async (url: string) => {
  await navigator.clipboard.writeText(url)
  toast.success("Lien copié !")
}

export const ShareLinkDialog = ({ open, onOpenChange, candidateId }: Props) => {
  const [selectedType, setSelectedType] = useState<ShareLinkType>("NORMAL")
  const [selectedExpiration, setSelectedExpiration] =
    useState<ShareLinkExpiration>("30d")
  const [newLinkToken, setNewLinkToken] = useState<string | null>(null)

  const utils = api.useUtils()

  const { data: existingLinks = [] } = api.shareLink.listByCandidate.useQuery(
    { candidateId },
    { enabled: open }
  )

  const createMutation = api.shareLink.create.useMutation({
    onSuccess: (link) => {
      setNewLinkToken(link.token)
      void utils.shareLink.listByCandidate.invalidate({ candidateId })
    },
    onError: (err) => {
      toast.error(
        err.message ?? "Une erreur est survenue. Réessayez."
      )
    },
  })

  const handleGenerate = () => {
    setNewLinkToken(null)
    createMutation.mutate({
      candidateId,
      type: selectedType,
      expiration: selectedExpiration,
    })
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setNewLinkToken(null)
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-full max-w-xl flex-col gap-0 p-0 sm:max-w-xl">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="size-4" aria-hidden />
            Partager la fiche candidat
          </DialogTitle>
          <DialogDescription className="sr-only">
            Générez un lien de partage pour envoyer la fiche candidat à un client.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="space-y-5">
            {/* Type + Expiration côte à côte */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="share-type">Type de fiche</Label>
                <Select
                  value={selectedType}
                  onValueChange={(v) => setSelectedType(v as ShareLinkType)}
                >
                  <SelectTrigger id="share-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NORMAL">{TYPE_LABELS.NORMAL}</SelectItem>
                    <SelectItem value="ANONYMOUS">{TYPE_LABELS.ANONYMOUS}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="share-expiration">Expiration</Label>
                <Select
                  value={selectedExpiration}
                  onValueChange={(v) => setSelectedExpiration(v as ShareLinkExpiration)}
                >
                  <SelectTrigger id="share-expiration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["7d", "30d", "never"] as const).map((exp) => (
                      <SelectItem key={exp} value={exp}>
                        {EXPIRATION_LABELS[exp]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Generate button */}
            <Button
              onClick={handleGenerate}
              disabled={createMutation.isPending}
              className="w-full"
            >
              {createMutation.isPending ? "Génération…" : "Générer un lien"}
            </Button>

            {/* Generated URL */}
            {newLinkToken && (
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <p className="mb-3 text-sm font-medium text-foreground">Lien généré</p>
                <div className="flex items-center gap-2">
                  <code
                    className="min-w-0 flex-1 truncate rounded bg-background px-3 py-2 text-xs text-muted-foreground"
                    aria-label="URL de partage générée"
                  >
                    {buildShareUrl(newLinkToken)}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => void copyToClipboard(buildShareUrl(newLinkToken))}
                    aria-label="Copier le lien"
                  >
                    <Copy className="size-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    asChild
                    aria-label="Ouvrir le lien"
                  >
                    <a
                      href={buildShareUrl(newLinkToken)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                  </Button>
                </div>
              </div>
            )}

            {/* Existing links */}
            {existingLinks.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Liens existants</p>
                <ul className="space-y-2">
                  {existingLinks.map((link) => (
                    <li
                      key={link.id}
                      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="text-sm font-medium">{TYPE_LABELS[link.type]}</p>
                        <p className="text-xs text-muted-foreground">
                          Créé le {formatDate(link.createdAt)}
                          {" · "}
                          Expire : {formatDate(link.expiresAt)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0"
                        onClick={() =>
                          void copyToClipboard(buildShareUrl(link.token))
                        }
                        aria-label={`Copier le lien ${TYPE_LABELS[link.type]}`}
                      >
                        <Copy className="size-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
