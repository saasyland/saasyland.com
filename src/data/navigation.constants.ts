import type { LucideIcon } from "lucide-react"

export const NAVIGATION_PLACEMENT = {
  ADMIN: "admin",
  APP: "app",
  DASHBOARD: "dashboard",
  FOOTER: "footer",
  HEADER: "header",
} as const

export const ADMIN_NAVIGATION_GROUP = {
  ADMINISTRATION: "administration",
  CONTENT: "content",
  OFFERINGS: "offerings",
  OVERVIEW: "overview",
} as const

export const ADMIN_NAVIGATION_GROUPS = [
  ADMIN_NAVIGATION_GROUP.OVERVIEW,
  ADMIN_NAVIGATION_GROUP.OFFERINGS,
  ADMIN_NAVIGATION_GROUP.CONTENT,
  ADMIN_NAVIGATION_GROUP.ADMINISTRATION,
] as const

export const FOOTER_COLUMN = {
  LEGAL: "legal",
  PRODUCT: "product",
} as const

export const FOOTER_COLUMNS = [FOOTER_COLUMN.PRODUCT, FOOTER_COLUMN.LEGAL] as const

interface Entry {
  readonly key: string
  readonly order: number
  readonly to: string
}

interface AdminEntry extends Entry {
  readonly group: (typeof ADMIN_NAVIGATION_GROUPS)[number]
  readonly icon: LucideIcon
  readonly placement: typeof NAVIGATION_PLACEMENT.ADMIN
}

interface AppEntry extends Entry {
  readonly icon: LucideIcon
  readonly placement: typeof NAVIGATION_PLACEMENT.APP
}

interface DashboardEntry extends Entry {
  readonly icon: LucideIcon
  readonly placement: typeof NAVIGATION_PLACEMENT.DASHBOARD
}

interface FooterEntry extends Entry {
  readonly column: (typeof FOOTER_COLUMNS)[number]
  readonly placement: typeof NAVIGATION_PLACEMENT.FOOTER
}

interface HeaderEntry extends Entry {
  readonly placement: typeof NAVIGATION_PLACEMENT.HEADER
}

export type NavigationEntry = AdminEntry | AppEntry | DashboardEntry | FooterEntry | HeaderEntry
