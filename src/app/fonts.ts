import localFont from "next/font/local";

/** Polices de la charte claritee.fr, auto-hébergées (Inter : sous-ensemble latin, graisses 400 à 600). */
export const inter = localFont({
  src: "../fonts/Inter-latin.woff2",
  weight: "400 600",
  variable: "--font-inter",
  display: "swap",
});

/** Clash Grotesk (Indian Type Foundry, licence ITF Free Font) : titres uniquement. */
export const clashGrotesk = localFont({
  src: [
    { path: "../fonts/ClashGrotesk-500.woff2", weight: "500" },
    { path: "../fonts/ClashGrotesk-600.woff2", weight: "600" },
    { path: "../fonts/ClashGrotesk-700.woff2", weight: "700" },
  ],
  variable: "--font-clash",
  display: "swap",
});
