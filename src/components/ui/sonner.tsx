"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

/**
 * Toaster Sonner
 * Doc : https://sonner.emilkowal.ski
 */
const Toaster = ({ ...props }: ToasterProps) => (
  <Sonner
    theme="light"
    position="bottom-center"
    closeButton
    duration={5000}
    {...props}
  />
)

export { Toaster }
