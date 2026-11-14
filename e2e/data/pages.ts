import type { Role } from "../../src/integrations/better-auth/auth.access"
import * as AREA_PAGES from "./pages.entries"

export interface PageEntry {
  readonly heading?: string
  readonly path: string
  readonly role?: Role
}

const ENTRIES: readonly PageEntry[] = Object.values(AREA_PAGES).flat()

export const PUBLIC_PAGES = ENTRIES.filter(({ role }) => role === undefined).map(({ path }) => path)

export const workspacePages = (role: Role): readonly PageEntry[] => ENTRIES.filter((entry) => entry.role === role)
