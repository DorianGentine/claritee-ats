"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { api } from "@/lib/trpc/client"
import { signOutBrowser } from "@/lib/supabase/sign-out"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const GENERIC_ERROR_MESSAGE = "Une erreur est survenue. Réessayez."
const CONFIRM_INPUT_ID = "delete-company-confirm"

/**
 * Zone de suppression du cabinet (RGPD), visible du seul créateur du cabinet.
 * La saisie du nom du cabinet confirme l'action, irréversible.
 */
export const DeleteCompanySettings = () => {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmName, setConfirmName] = useState("")

  const meQuery = api.auth.getMe.useQuery()
  const companyQuery = api.company.getMyCompany.useQuery()

  const deleteMutation = api.company.deleteCompany.useMutation({
    onSuccess: async () => {
      await signOutBrowser("local")
      router.push("/")
      router.refresh()
    },
    onError: (error) => {
      toast.error(error.message ?? GENERIC_ERROR_MESSAGE)
    },
  })

  const company = companyQuery.data
  if (!company || !meQuery.data || meQuery.data.id !== company.ownerId) {
    return null
  }

  const isConfirmed = confirmName.trim() === company.name.trim()

  const handleOpenChange = (nextOpen: boolean) => {
    if (deleteMutation.isPending) return
    if (!nextOpen) setConfirmName("")
    setDialogOpen(nextOpen)
  }

  return (
    <section aria-labelledby="delete-company-heading">
      <h2
        id="delete-company-heading"
        className="text-lg font-semibold text-foreground"
      >
        Supprimer le cabinet
      </h2>
      <div className="mt-4 rounded-lg border border-destructive/40 bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">
          Supprime définitivement le cabinet et toutes ses données : candidats,
          CV et photos, offres, clients, notes, liens de partage, ainsi que les
          comptes de tous les membres.
        </p>
        <Button
          type="button"
          variant="destructive"
          className="mt-4"
          onClick={() => setDialogOpen(true)}
        >
          Supprimer le cabinet
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le cabinet ?</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Toutes les données du cabinet et
              les comptes de ses membres seront définitivement supprimés.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault()
              if (isConfirmed) deleteMutation.mutate({ confirmName })
            }}
          >
            <Label htmlFor={CONFIRM_INPUT_ID}>
              Saisissez « {company.name} » pour confirmer
            </Label>
            <Input
              id={CONFIRM_INPUT_ID}
              value={confirmName}
              onChange={(event) => setConfirmName(event.target.value)}
              autoComplete="off"
              disabled={deleteMutation.isPending}
            />
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={deleteMutation.isPending}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={!isConfirmed || deleteMutation.isPending}
              >
                {deleteMutation.isPending
                  ? "Suppression…"
                  : "Supprimer définitivement"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  )
}
