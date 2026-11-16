export const HEAD_START_LAYER = {
  AUTH: "auth.better-auth",
  AUTH_EMAIL: "auth.better-auth+email.resend",
  BASE: "base",
  CONTENT: "content.mdx",
  DEPLOYMENT: "deployment.cloudflare",
  ORM: "orm.drizzle",
  PROVIDER: "provider.d1",
} as const

type HeadStartLayer = (typeof HEAD_START_LAYER)[keyof typeof HEAD_START_LAYER]

const EVERY_LAYER = Object.values(HEAD_START_LAYER)

export const HEAD_START_CLAIM_MAX_HOURS = 300

export const HEAD_START_ROUNDING_HOURS = 50

export const HEAD_START_ROWS = [
  { high: 18, id: "toolchain", layers: [HEAD_START_LAYER.BASE], low: 10 },
  { high: 28, id: "worker", layers: [HEAD_START_LAYER.BASE, HEAD_START_LAYER.DEPLOYMENT], low: 14 },
  { high: 12, id: "database", layers: [HEAD_START_LAYER.PROVIDER, HEAD_START_LAYER.ORM], low: 6 },
  { high: 18, id: "deploy", layers: [HEAD_START_LAYER.DEPLOYMENT], low: 10 },
  { high: 50, id: "i18n", layers: [HEAD_START_LAYER.BASE], low: 30 },
  { high: 24, id: "translations", layers: [HEAD_START_LAYER.BASE], low: 12 },
  { high: 55, id: "interface", layers: [HEAD_START_LAYER.BASE], low: 30 },
  { high: 14, id: "seo", layers: [HEAD_START_LAYER.BASE], low: 8 },
  { high: 20, id: "docsSite", layers: [HEAD_START_LAYER.CONTENT], low: 12 },
  { high: 10, id: "blog", layers: [HEAD_START_LAYER.CONTENT], low: 6 },
  { high: 14, id: "contentChecks", layers: [HEAD_START_LAYER.CONTENT], low: 8 },
  { high: 28, id: "docsWriting", layers: [HEAD_START_LAYER.CONTENT], low: 16 },
  { high: 20, id: "docsTranslations", layers: [HEAD_START_LAYER.CONTENT], low: 10 },
  { high: 40, id: "auth", layers: [HEAD_START_LAYER.AUTH], low: 25 },
  { high: 10, id: "rateLimits", layers: [HEAD_START_LAYER.AUTH], low: 6 },
  { high: 32, id: "authModules", layers: [HEAD_START_LAYER.AUTH], low: 20 },
  { high: 30, id: "authPages", layers: [HEAD_START_LAYER.AUTH], low: 18 },
  { high: 26, id: "accountSettings", layers: [HEAD_START_LAYER.AUTH], low: 16 },
  { high: 40, id: "admin", layers: [HEAD_START_LAYER.AUTH], low: 25 },
  { high: 8, id: "workspace", layers: [HEAD_START_LAYER.AUTH], low: 4 },
  { high: 14, id: "email", layers: [HEAD_START_LAYER.AUTH_EMAIL], low: 8 },
  { high: 140, id: "unitTests", layers: EVERY_LAYER, low: 80 },
  { high: 40, id: "browserTests", layers: EVERY_LAYER, low: 25 },
  { high: 16, id: "hardening", layers: EVERY_LAYER, low: 8 },
] as const satisfies readonly { high: number; id: string; layers: readonly HeadStartLayer[]; low: number }[]

const sumOf = (pick: (row: (typeof HEAD_START_ROWS)[number]) => number): number =>
  HEAD_START_ROWS.reduce((total, row) => total + pick(row), 0)

export const HEAD_START_LOW_HOURS = sumOf(({ low }) => low)

export const HEAD_START_HIGH_HOURS = sumOf(({ high }) => high)

export const HEAD_START_HOURS = Math.min(
  HEAD_START_CLAIM_MAX_HOURS,
  Math.floor(HEAD_START_LOW_HOURS / HEAD_START_ROUNDING_HOURS) * HEAD_START_ROUNDING_HOURS,
)
