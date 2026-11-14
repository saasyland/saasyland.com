import type { PageEntry } from "./pages"

export const LEGAL_PAGES = [
  { path: "/privacy" },
  { path: "/terms" },
  { path: "/refunds" },
  { path: "/licence" },
  { path: "/affiliates" },
] as const satisfies readonly PageEntry[]
