import { ROLE_CODES } from "../../src/integrations/better-auth/auth.access"
import type { PageEntry } from "./pages"

export const PAYMENTS_PAGES = [
  { path: "/admin/payments", role: ROLE_CODES.ADMIN },
  { path: "/admin/pricing-models", role: ROLE_CODES.ADMIN },
] as const satisfies readonly PageEntry[]
