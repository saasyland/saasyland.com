import type { LucideIcon } from "lucide-react"

export const FEATURE_STATUS = {
  ARRIVING: "arriving",
  AVAILABLE: "available",
} as const

export const FEATURE_STATUSES = [FEATURE_STATUS.AVAILABLE, FEATURE_STATUS.ARRIVING] as const

export type FeatureStatus = (typeof FEATURE_STATUSES)[number]

export const SITE_CONTENT_ID = "content"

export const DOCS_CONTENT_ID = "nd-page"

export const NAVIGATION_PENDING_MS = 400

export const NAVIGATION_PRELOAD_DELAY_MS = 100

export const NAVIGATION_PENDING_MIN_MS = 0

export const MARKETING_SECTION_IDS = {
  CLI: "cli",
  FAQ: "faq",
  FOUNDATION: "foundation",
  PRICING: "pricing",
  QUALITY: "quality",
  TOOLKIT: "toolkit",
} as const

export const ADMIN_NAVIGATION_GROUP = {
  ADMINISTRATION: "administration",
  CONTENT: "content",
  OFFERINGS: "offerings",
  OVERVIEW: "overview",
  SALES: "sales",
} as const

export const FOOTER_COLUMN = {
  LEGAL: "legal",
  PRODUCT: "product",
} as const

export interface NavigationEntry {
  readonly label: string
  readonly to: string
}

export interface IconEntry extends NavigationEntry {
  readonly icon: LucideIcon
}

export interface AdminEntry extends IconEntry {
  readonly breadcrumbs?: Readonly<Record<string, string>>
}

export interface AdminNavigationGroup {
  readonly items: readonly AdminEntry[]
  readonly key: (typeof ADMIN_NAVIGATION_GROUP)[keyof typeof ADMIN_NAVIGATION_GROUP]
}

export interface SiteEntry extends NavigationEntry {
  readonly hash?: string
  readonly signedIn?: Pick<NavigationEntry, "label">
}

export interface FooterNavigationColumn {
  readonly key: (typeof FOOTER_COLUMN)[keyof typeof FOOTER_COLUMN]
  readonly links: readonly SiteEntry[]
}
