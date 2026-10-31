import type { Metadata } from "next";
import { PublicHeader } from "@/components/layout/PublicHeader";

export const metadata: Metadata = {
  title: "ClariteeAts",
  description:
    "L'outil de suivi des candidats des petits cabinets de recrutement : candidats, offres, clients et notes au même endroit.",
};

export default function HomePage() {
  return (
    <>
      <PublicHeader />

      <main className="bg-grid relative flex flex-1 items-center justify-center overflow-hidden px-4 py-24 sm:px-6">
        {/* Fondu du quadrillage vers les bords */}
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--background)_70%)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-3xl space-y-6 text-center">
          <h1 className="text-5xl leading-[1.05] font-semibold sm:text-7xl">
            Le recrutement,{" "}
            <span className="block text-primary">en toute clarté.</span>
          </h1>
          <p className="mx-auto max-w-xl text-lg leading-relaxed text-muted-foreground">
            ClariteeAts est l'outil de suivi des candidats des petits cabinets de
            recrutement : candidats, offres, clients et notes de toute l'équipe,
            réunis au même endroit.
          </p>
        </div>
      </main>
    </>
  );
}
