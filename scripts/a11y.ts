/**
 * a11y.ts — Audit pa11y (WCAG2AA) des pages publiques et des pages du dashboard,
 * ces dernières avec une vraie session.
 *
 * Prérequis : stack Supabase locale démarrée et app lancée (`bun run dev`).
 * Usage :
 *   bun run a11y                                   # app sur http://localhost:3000
 *   bun run a11y --base-url http://localhost:3100
 *
 * Crée un cabinet et un compte temporaires dans la stack locale, connecte pa11y
 * avec, puis les supprime. Refuse de tourner hors local (jamais de compte en prod).
 * Code de sortie 1 si une page a des erreurs.
 */
import { randomInt, randomUUID } from "node:crypto"
import { config } from "dotenv"
import pa11y from "pa11y"
import { createClient } from "@supabase/supabase-js"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"

const PUBLIC_PATHS = ["/", "/login", "/register"]
const DASHBOARD_PATHS = [
  "/dashboard",
  "/candidates",
  "/candidates/new",
  "/offers",
  "/clients",
  "/notes",
  "/settings",
]
const LOCAL_HOSTS = ["localhost", "127.0.0.1"]

const requireEnv = (name: string): string => {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} manquant`)
  }
  return value
}

const requireLocal = (name: string, url: string) => {
  if (!LOCAL_HOSTS.includes(new URL(url).hostname)) {
    throw new Error(
      `${name} ne pointe pas vers la stack locale : audit refusé.`
    )
  }
}

const parseBaseUrl = (argv: string[]): string => {
  const index = argv.indexOf("--base-url")
  const baseUrl = index >= 0 ? argv[index + 1] : "http://localhost:3000"
  if (!baseUrl || baseUrl.startsWith("--")) {
    throw new Error("--base-url attend une URL")
  }
  return baseUrl.replace(/\/$/, "")
}

/** Connexion via le formulaire, puis navigation vers la page à auditer. */
const loginActions = (
  baseUrl: string,
  path: string,
  email: string,
  password: string
) => [
  `set field #email to ${email}`,
  `set field #password to ${password}`,
  "click element button[type=submit]",
  "wait for path to be /dashboard",
  ...(path === "/dashboard"
    ? []
    : [`navigate to ${baseUrl}${path}`, `wait for path to be ${path}`]),
]

const main = async () => {
  const baseUrl = parseBaseUrl(process.argv.slice(2))
  config({ path: ".env.local", quiet: true })
  config({ quiet: true })

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL")
  const databaseUrl = requireEnv("DATABASE_URL")
  requireLocal("NEXT_PUBLIC_SUPABASE_URL", supabaseUrl)
  requireLocal("DATABASE_URL", databaseUrl)
  requireLocal("--base-url", baseUrl)

  const supabase = createClient(
    supabaseUrl,
    requireEnv("SUPABASE_SECRET_KEY"),
    {
      auth: { persistSession: false },
    }
  )
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  })

  const email = `a11y-${randomUUID()}@claritee.local`
  const password = `A11y-${randomUUID()}`
  const { data: created, error: createError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
  if (createError || !created.user) {
    throw new Error(
      `Compte de test impossible à créer : ${createError?.message}`
    )
  }
  const company = await db.company.create({
    data: {
      name: "Cabinet audit a11y",
      siren: String(randomInt(100_000_000, 999_999_999)),
      users: {
        create: {
          id: created.user.id,
          email,
          firstName: "Audit",
          lastName: "A11y",
        },
      },
    },
  })

  let errorCount = 0
  try {
    const targets = [
      ...PUBLIC_PATHS.map((path) => ({ path, actions: [] as string[] })),
      ...DASHBOARD_PATHS.map((path) => ({
        path,
        actions: loginActions(baseUrl, path, email, password),
      })),
    ]
    for (const { path, actions } of targets) {
      const startUrl = `${baseUrl}${actions.length > 0 ? "/login" : path}`
      const result = await pa11y(startUrl, {
        standard: "WCAG2AA",
        actions,
        timeout: 60_000,
      })
      const errors = result.issues.filter((issue) => issue.type === "error")
      errorCount += errors.length
      console.warn(
        `${errors.length === 0 ? "✓" : "✗"} ${path} (${errors.length} erreur(s))`
      )
      for (const issue of errors) {
        console.warn(
          `    ${issue.code}\n    ${issue.message}\n    ${issue.selector}`
        )
      }
    }
  } finally {
    await db.company.delete({ where: { id: company.id } })
    await supabase.auth.admin.deleteUser(created.user.id)
    await db.$disconnect()
  }

  if (errorCount > 0) {
    throw new Error(`${errorCount} erreur(s) d'accessibilité.`)
  }
  console.warn("Aucune erreur d'accessibilité.")
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
