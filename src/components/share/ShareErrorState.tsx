import { LinkIcon } from "lucide-react"

type Props = {
  variant: "not-found" | "expired"
}

export const ShareErrorState = ({ variant }: Props) => {
  const title =
    variant === "expired" ? "Ce lien a expiré" : "Lien introuvable"
  const description =
    variant === "expired"
      ? "Ce lien de partage a expiré. Demandez un nouveau lien au cabinet de recrutement."
      : "Ce lien de partage n'existe pas ou a été supprimé."

  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-6">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted">
          <LinkIcon className="size-7 text-muted-foreground" aria-hidden />
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-foreground">{title}</h1>
        <p className="mt-2 text-muted-foreground">{description}</p>
      </div>
    </main>
  )
}
