import { APP_DOMAIN } from "~/src/presentation/branding"

export const HTTP_STATUS = {
  BAD_REQUEST: 400,
  FORBIDDEN: 403,
  METHOD_NOT_ALLOWED: 405,
  NOT_FOUND: 404,
  OK: 200,
  PARTIAL_CONTENT: 206,
  PERMANENT_REDIRECT: 308,
  RANGE_NOT_SATISFIABLE: 416,
  TOO_MANY_REQUESTS: 429,
  UNAUTHORIZED: 401,
} as const

export const COUNTRY_HEADER = "cf-ipcountry"

export const IP_ADDRESS_HEADER = "cf-connecting-ip"

export const ENVIRONMENT = {
  DEVELOPMENT: "development",
  PREVIEW: "preview",
  PRODUCTION: "production",
  TEST: "test",
} as const

export const DEPLOYED_HOSTS = {
  [ENVIRONMENT.PREVIEW]: `preview.${APP_DOMAIN}`,
  [ENVIRONMENT.PRODUCTION]: APP_DOMAIN,
} as const

const LOCAL_MODES = new Set<string>([ENVIRONMENT.DEVELOPMENT, ENVIRONMENT.TEST])

const LOCAL_HOSTS = ["localhost:3000", "127.0.0.1:3000"]
const SECOND_TEST_SERVER_HOSTS = ["localhost:3020", "127.0.0.1:3020"]

const HOSTS_BY_MODE: Readonly<Record<string, readonly string[]>> = {
  [ENVIRONMENT.PREVIEW]: [DEPLOYED_HOSTS[ENVIRONMENT.PREVIEW]],
  [ENVIRONMENT.PRODUCTION]: [DEPLOYED_HOSTS[ENVIRONMENT.PRODUCTION]],
  [ENVIRONMENT.TEST]: [...LOCAL_HOSTS, ...SECOND_TEST_SERVER_HOSTS],
}

export const isLocalMode = (mode: string): boolean => LOCAL_MODES.has(mode)

export const appHostsForMode = (mode: string): string[] => [...(HOSTS_BY_MODE[mode] ?? LOCAL_HOSTS)]
