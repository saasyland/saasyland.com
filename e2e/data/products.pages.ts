import { ROLE_CODES } from "../../src/integrations/better-auth/auth.roles"
import type { PageEntry } from "./pages"

export const PRODUCTS_PAGES = [
  { path: "/admin/products", role: ROLE_CODES.ADMIN },
  { heading: "Create Product", path: "/admin/products/create", role: ROLE_CODES.ADMIN },
] as const satisfies readonly PageEntry[]
