import type { Metadata } from "next";
import "@/styles/globals.css";
import { Providers } from "@/components/providers";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { clashGrotesk, inter } from "./fonts";

export const metadata: Metadata = {
  title: "Claritee ATS",
  description:
    "L'ATS simple et gratuit des cabinets de recrutement : candidats, offres, clients et notes au même endroit.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${inter.variable} ${clashGrotesk.variable}`}>
      <body className="flex min-h-screen flex-col">
        <Providers>{children}</Providers>
        <SpeedInsights />
      </body>
    </html>
  );
}
