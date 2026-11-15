import { ROLE_CODES } from "../../src/integrations/better-auth/auth.roles"
import type { PageEntry } from "./pages"

export const TEAM_PAGES = [
  { path: "/admin/users/invitations", role: ROLE_CODES.ADMIN },
  { path: "/admin/users/roles", role: ROLE_CODES.ADMIN },
] as const satisfies readonly PageEntry[]
