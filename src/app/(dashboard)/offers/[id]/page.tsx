import type { Metadata } from "next"
import { OfferDetailView } from "@/components/offers/OfferDetailView"

export const metadata: Metadata = {
  title: "Détail de l'offre | Claritee ATS",
  description: "Détail de l'offre d'emploi",
}

type Props = { params: Promise<{ id: string }> }

export default async function OfferDetailPage({ params }: Props) {
  const { id } = await params
  return <OfferDetailView offerId={id} />
}
