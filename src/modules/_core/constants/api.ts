import { LOCAL_SERVER } from "~/src/data/local-server"

import { APP_DOMAIN, APP_PREVIEW_DOMAIN } from "~/src/presentation/branding"

export const HTTP_STATUS = {
  BAD_REQUEST: 400,
  CONFLICT: 409,
  CREATED: 201,
  FORBIDDEN: 403,
  FOUND: 302,
  INTERNAL_SERVER_ERROR: 500,
  METHOD_NOT_ALLOWED: 405,
  NOT_FOUND: 404,
  NO_CONTENT: 204,
  OK: 200,
  PARTIAL_CONTENT: 206,
  PERMANENT_REDIRECT: 308,
  RANGE_NOT_SATISFIABLE: 416,
  TOO_MANY_REQUESTS: 429,
  UNAUTHORIZED: 401,
  UNPROCESSABLE_CONTENT: 422,
} as const

export const COUNTRY_HEADER = "cf-ipcountry"

export const IP_ADDRESS_HEADER = "cf-connecting-ip"

export const CONTENT_SECURITY_POLICY = {
  BASE_URI: "base-uri 'none'",
  FRAME_ANCESTORS: "frame-ancestors 'none'",
  OBJECT_SRC: "object-src 'none'",
  SCRIPT_FALLBACKS: "'strict-dynamic' 'unsafe-inline' https:",
} as const

export const SECURITY_HEADERS = {
  "Content-Security-Policy": [
    CONTENT_SECURITY_POLICY.BASE_URI,
    CONTENT_SECURITY_POLICY.FRAME_ANCESTORS,
    CONTENT_SECURITY_POLICY.OBJECT_SRC,
  ].join("; "),
  "Cross-Origin-Opener-Policy": "same-origin",
  "Permissions-Policy": "browsing-topics=(), camera=(), geolocation=(), microphone=()",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
} as const

export const HTTPS_SECURITY_HEADERS = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
} as const

export const ENVIRONMENT = {
  DEVELOPMENT: "development",
  PREVIEW: "preview",
  PRODUCTION: "production",
  TEST: "test",
} as const

export const DEPLOYED_HOSTS = {
  [ENVIRONMENT.PREVIEW]: APP_PREVIEW_DOMAIN,
  [ENVIRONMENT.PRODUCTION]: APP_DOMAIN,
} as const

const LOCAL_MODES = new Set<string>([ENVIRONMENT.DEVELOPMENT, ENVIRONMENT.TEST])

const SECOND_TEST_SERVER_PORT = 3020

const loopbackHosts = (port: number): string[] => ["localhost", LOCAL_SERVER.HOST].map((host) => `${host}:${String(port)}`)

const LOCAL_HOSTS = loopbackHosts(LOCAL_SERVER.PORT)
const SECOND_TEST_SERVER_HOSTS = loopbackHosts(SECOND_TEST_SERVER_PORT)

const HOSTS_BY_MODE: Readonly<Record<string, readonly string[]>> = {
  [ENVIRONMENT.PREVIEW]: [DEPLOYED_HOSTS[ENVIRONMENT.PREVIEW]],
  [ENVIRONMENT.PRODUCTION]: [DEPLOYED_HOSTS[ENVIRONMENT.PRODUCTION]],
  [ENVIRONMENT.TEST]: [...LOCAL_HOSTS, ...SECOND_TEST_SERVER_HOSTS],
}

export const isLocalMode = (mode: string): boolean => LOCAL_MODES.has(mode)

export const appHostsForMode = (mode: string): string[] => [...(HOSTS_BY_MODE[mode] ?? LOCAL_HOSTS)]
