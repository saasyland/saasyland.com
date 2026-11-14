import { ROLE_CODES } from "../../src/integrations/better-auth/auth.access"
import type { PageEntry } from "./pages"

export const ANALYTICS_PAGES = [{ path: "/admin/analytics", role: ROLE_CODES.ADMIN }] as const satisfies readonly PageEntry[]
