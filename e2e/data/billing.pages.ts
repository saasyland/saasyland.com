import { ROLE_CODES } from "../../src/integrations/better-auth/auth.roles"
import type { PageEntry } from "./pages"

export const BILLING_PAGES = [{ path: "/app/billing", role: ROLE_CODES.CUSTOMER }] as const satisfies readonly PageEntry[]
