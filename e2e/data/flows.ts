export const FLOW_FEATURE = {
  ACCOUNT: "account",
  ADMIN_BLOG: "admin-blog",
  ADMIN_COURSES: "admin-courses",
  ADMIN_LANDING: "admin-landing",
  ADMIN_PAYMENTS: "admin-payments",
  ADMIN_PRODUCTS: "admin-products",
  ADMIN_SETTINGS: "admin-settings",
  ADMIN_USERS: "admin-users",
  ADMIN_VIDEOS: "admin-videos",
  AFFILIATES: "affiliates",
  AFTER_SALE: "after-sale",
  CLI_API: "cli-api",
  CONTENT: "content",
  COURSES: "courses",
  I18N: "i18n",
  LICENCE: "licence",
  NEWSLETTER: "newsletter",
  PURCHASE: "purchase",
  SECURITY: "security",
} as const

export const FLOW_STATUS = {
  COVERED: "covered",
  MISSING: "missing",
  TO_BUILD: "to-build",
} as const

export type FlowFeature = (typeof FLOW_FEATURE)[keyof typeof FLOW_FEATURE]

export interface FlowTest {
  readonly spec: string
  readonly title: string
}

interface FlowOutcome {
  readonly feature: FlowFeature
  readonly id: string
  readonly outcome: string
}

interface CoveredFlow extends FlowOutcome {
  readonly status: typeof FLOW_STATUS.COVERED
  readonly tests: readonly [FlowTest, ...FlowTest[]]
}

interface MissingFlow extends FlowOutcome {
  readonly journey?: string
  readonly reason: string
  readonly status: typeof FLOW_STATUS.MISSING
  readonly tests?: readonly FlowTest[]
}

interface FlowToBuild extends FlowOutcome {
  readonly reason: string
  readonly status: typeof FLOW_STATUS.TO_BUILD
}

export type Flow = CoveredFlow | FlowToBuild | MissingFlow
