import { ROLE_CODES } from "../../src/integrations/better-auth/auth.roles"
import * as ROUTES from "../../src/routes"
import type { PageEntry } from "./pages"

export const NEWSLETTER_PAGES = [
  { path: ROUTES.ADMIN_NEWSLETTER, role: ROLE_CODES.ADMIN },
  { path: ROUTES.ADMIN_NEWSLETTER_ISSUES, role: ROLE_CODES.ADMIN },
  { path: ROUTES.ADMIN_NEWSLETTER_COMPOSE, role: ROLE_CODES.ADMIN },
] as const satisfies readonly PageEntry[]
