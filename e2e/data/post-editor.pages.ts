import { ROLE_CODES } from "../../src/integrations/better-auth/auth.roles"
import type { PageEntry } from "./pages"

export const POST_EDITOR_PAGES = [
  { path: "/admin/blog", role: ROLE_CODES.ADMIN },
  { heading: "Write Post", path: "/admin/blog/create", role: ROLE_CODES.ADMIN },
] as const satisfies readonly PageEntry[]
