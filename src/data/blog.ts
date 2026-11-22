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
  SECTION_ID: "all-posts",
} as const

export const BLOG_FINDER_CLASSES = {
  BAR: "sticky top-header z-30 -mx-6 border-b border-border bg-background/72 px-6 py-3 backdrop-blur-xl md:-mx-10 md:px-10 lg:static lg:z-auto lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none",
  LAYOUT: "mt-8 md:mt-10 lg:mt-16 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-x-12 xl:grid-cols-[16rem_minmax(0,1fr)] xl:gap-x-16",
  MAIN: "mt-10 min-w-0 md:mt-14 lg:mt-0",
  PANEL: "lg:sticky lg:top-24 lg:flex lg:max-h-[calc(100dvh-7.5rem)] lg:flex-col",
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
