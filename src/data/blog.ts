import * as ROUTES from "../routes.ts"

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

export const BLOG_AUTHOR = {
  PIOTR_BOROWIECKI: "piotr-borowiecki",
} as const

export type BlogAuthor = (typeof BLOG_AUTHOR)[keyof typeof BLOG_AUTHOR]

export const AUTHOR_PROFILE = {
  GITHUB: "github",
  LINKEDIN: "linkedin",
} as const

export type AuthorProfile = (typeof AUTHOR_PROFILE)[keyof typeof AUTHOR_PROFILE]

export const BLOG_AUTHORS = {
  [BLOG_AUTHOR.PIOTR_BOROWIECKI]: {
    image: "/images/blog/authors/piotr-j-borowiecki.webp",
    name: "Piotr J. Borowiecki",
    profiles: [
      { network: AUTHOR_PROFILE.GITHUB, url: "https://github.com/pjborowiecki" },
      { network: AUTHOR_PROFILE.LINKEDIN, url: "https://www.linkedin.com/in/pjborowiecki/" },
    ],
  },
} as const satisfies Record<
  BlogAuthor,
  { readonly image: string; readonly name: string; readonly profiles: readonly { readonly network: AuthorProfile; readonly url: string }[] }
>

export const AUTHOR_IMAGE_SIZE = 288

export const blogAuthorPath = (author: BlogAuthor): string => `${ROUTES.AUTHORS}/${author}`

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
  BODY: "custom-scrollbar hidden lg:mt-4 lg:-mr-3 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:gap-5 lg:overflow-y-auto lg:pr-3",
  INDEX: "flex min-h-32 flex-1 flex-col",
  INDEX_LIST:
    "-mr-3 min-h-0 flex-1 scroll-pt-3 scroll-pb-10 pt-3 pb-10 [mask-image:linear-gradient(to_bottom,transparent,#000_0.75rem,#000_calc(100%-2.5rem),transparent)]",
  LAYOUT: "mt-8 md:mt-10 lg:mt-16 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-x-12 xl:grid-cols-[16rem_minmax(0,1fr)] xl:gap-x-16",
  MAIN: "mt-10 min-w-0 md:mt-14 lg:mt-0",
  PANEL: "lg:sticky lg:top-24 lg:flex lg:max-h-[calc(100dvh-7.5rem)] lg:flex-col",
} as const

export const BLOG_FINDER_TOPICS = 4

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
