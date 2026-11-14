import { ROLE_CODES } from "../../src/integrations/better-auth/auth.access"
import type { PageEntry } from "./pages"

export const CORE_PAGES = [
  { path: "/" },
  { path: "/pl-PL" },
  { path: "/admin", role: ROLE_CODES.ADMIN },
  { path: "/admin/settings", role: ROLE_CODES.ADMIN },
  { path: "/app", role: ROLE_CODES.CUSTOMER },
  { path: "/app/settings", role: ROLE_CODES.CUSTOMER },
] as const satisfies readonly PageEntry[]
