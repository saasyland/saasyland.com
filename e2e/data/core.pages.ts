import type { PageEntry } from "./pages"

export const CORE_PAGES = [{ path: "/" }, { path: "/pl-PL" }] as const satisfies readonly PageEntry[]
