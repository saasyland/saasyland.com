import type { LucideIcon } from "lucide-react"

export const FEATURE_STATUS = {
  ARRIVING: "arriving",
  AVAILABLE: "available",
} as const

export const FEATURE_STATUSES = [FEATURE_STATUS.AVAILABLE, FEATURE_STATUS.ARRIVING] as const

export type FeatureStatus = (typeof FEATURE_STATUSES)[number]

export const SITE_CONTENT_ID = "content"

export const NAVIGATION_PENDING_MS = 200

export const NAVIGATION_PENDING_MIN_MS = 300

export const MARKETING_SECTION_IDS = {
  CLI: "cli",
  FAQ: "faq",
  FOUNDATION: "foundation",
  PRICING: "pricing",
  QUALITY: "quality",
  TOOLKIT: "toolkit",
} as const

export const NAVIGATION_PLACEMENT = {
  ADMIN: "admin",
  APP: "app",
  APP_RESOURCES: "appResources",
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
  readonly area: string
  readonly key: string
  readonly order: number
  readonly to: string
}

interface AdminEntry extends Entry {
  readonly group: (typeof ADMIN_NAVIGATION_GROUPS)[number]
  readonly icon: LucideIcon
  readonly placement: typeof NAVIGATION_PLACEMENT.ADMIN
  readonly status: FeatureStatus
}

interface AppEntry extends Entry {
  readonly icon: LucideIcon
  readonly placement: typeof NAVIGATION_PLACEMENT.APP
}

interface AppResourceEntry extends Entry {
  readonly icon: LucideIcon
  readonly placement: typeof NAVIGATION_PLACEMENT.APP_RESOURCES
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
  readonly hash?: string
  readonly placement: typeof NAVIGATION_PLACEMENT.HEADER
}

export type NavigationEntry = AdminEntry | AppEntry | AppResourceEntry | DashboardEntry | FooterEntry | HeaderEntry
