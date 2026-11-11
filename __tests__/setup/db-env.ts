/**
 * Les tests DB échouent au lieu d'être ignorés quand leur environnement manque :
 * un fichier skippé en silence donnerait un faux vert.
 */
const REQUIRED_ENV = [
  "DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
] as const

const missing = REQUIRED_ENV.filter((name) => !process.env[name])
if (missing.length > 0) {
  throw new Error(
    `Tests DB : variable(s) manquante(s) ${missing.join(", ")}. Lancer \`bun run test:db\` avec la stack Supabase locale démarrée.`
  )
}
