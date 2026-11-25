import { ROLE_CODES } from "../../src/integrations/better-auth/auth.roles"
import { ROUTES } from "../../src/routes"
import type { PageEntry } from "./pages"

export const NEWSLETTER_PAGES = [
  { path: ROUTES.ADMIN.NEWSLETTER.INDEX, role: ROLE_CODES.ADMIN },
  { path: ROUTES.ADMIN.NEWSLETTER.ISSUES, role: ROLE_CODES.ADMIN },
  { path: ROUTES.ADMIN.NEWSLETTER.COMPOSE, role: ROLE_CODES.ADMIN },
] as const satisfies readonly PageEntry[]
