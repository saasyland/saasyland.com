export const BLOG_TAG = {
  AI_AGENTS: "ai-agents",
  ARCHITECTURE: "architecture",
  AUTH: "auth",
  BOILERPLATE: "boilerplate",
  COMPARISON: "comparison",
  NEXTJS: "nextjs",
  PAYMENTS: "payments",
  RELEASE: "release",
  SAAS: "saas",
  SECURITY: "security",
  STACK: "stack",
  TANSTACK_START: "tanstack-start",
  TESTING: "testing",
  TOOLING: "tooling",
  TYPESCRIPT: "typescript",
} as const

export const BLOG_TAGS = [
  BLOG_TAG.AI_AGENTS,
  BLOG_TAG.ARCHITECTURE,
  BLOG_TAG.AUTH,
  BLOG_TAG.BOILERPLATE,
  BLOG_TAG.COMPARISON,
  BLOG_TAG.NEXTJS,
  BLOG_TAG.PAYMENTS,
  BLOG_TAG.RELEASE,
  BLOG_TAG.SAAS,
  BLOG_TAG.SECURITY,
  BLOG_TAG.STACK,
  BLOG_TAG.TANSTACK_START,
  BLOG_TAG.TESTING,
  BLOG_TAG.TOOLING,
  BLOG_TAG.TYPESCRIPT,
] as const

export type BlogTag = (typeof BLOG_TAGS)[number]

export const BLOG_COVER = {
  HEIGHT: 660,
  WIDTH: 1584,
} as const

export const FEATURED_BLOG_POSTS = [
  "better-t-stack-vs-saas-starter-kit",
  "shipfast-alternative-for-engineers",
  "supastarter-alternative",
] as const

export const BLOG_ARCHIVE = {
  FIRST_PAGE: 1,
  PAGE_SEGMENT: "page",
  PAGE_SIZE: 12,
} as const

export const BLOG_HIGHLIGHTS = {
  LATEST: 3,
  UPDATED: 3,
} as const

export const BLOG_SORT = {
  NEWEST: "newest",
  READING_TIME: "reading-time",
  UPDATED: "updated",
} as const

export const BLOG_SORTS = [BLOG_SORT.NEWEST, BLOG_SORT.UPDATED, BLOG_SORT.READING_TIME] as const

export type BlogSort = (typeof BLOG_SORTS)[number]
