import { ROLE_CODES } from "../../src/integrations/better-auth/auth.access"
import type { PageEntry } from "./pages"

export const AUTH_PAGES = [
  { path: "/auth/sign-in" },
  { path: "/auth/sign-up" },
  { path: "/auth/forgot-password" },
  { path: "/admin/users/all", role: ROLE_CODES.ADMIN },
  { path: "/admin/users/invitations", role: ROLE_CODES.ADMIN },
  { path: "/admin/users/roles", role: ROLE_CODES.ADMIN },
  { path: "/admin/users/security", role: ROLE_CODES.ADMIN },
] as const satisfies readonly PageEntry[]
