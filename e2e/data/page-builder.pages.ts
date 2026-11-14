import { ROLE_CODES } from "../../src/integrations/better-auth/auth.roles"
import type { PageEntry } from "./pages"

export const PAGE_BUILDER_PAGES = [{ path: "/admin/landing-page", role: ROLE_CODES.ADMIN }] as const satisfies readonly PageEntry[]
