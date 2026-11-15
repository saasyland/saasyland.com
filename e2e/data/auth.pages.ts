import { ROLE_CODES } from "../../src/integrations/better-auth/auth.roles"
import type { PageEntry } from "./pages"

export const AUTH_PAGES = [
  { path: "/auth/sign-in" },
  { path: "/auth/sign-up" },
  { path: "/auth/forgot-password" },
  { path: "/admin", role: ROLE_CODES.ADMIN },
  { path: "/admin/settings", role: ROLE_CODES.ADMIN },
  { path: "/admin/users/all", role: ROLE_CODES.ADMIN },
  { path: "/admin/users/invitations", role: ROLE_CODES.ADMIN },
  { path: "/admin/users/roles", role: ROLE_CODES.ADMIN },
  { path: "/admin/users/security", role: ROLE_CODES.ADMIN },
  { path: "/app/settings", role: ROLE_CODES.CUSTOMER },
] as const satisfies readonly PageEntry[]
