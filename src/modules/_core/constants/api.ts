import { APP_DOMAIN } from "~/src/presentation/branding"

export const HTTP_STATUS = {
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  OK: 200,
  PERMANENT_REDIRECT: 308,
  TOO_MANY_REQUESTS: 429,
} as const

export const COUNTRY_HEADER = "cf-ipcountry"

export const IP_ADDRESS_HEADER = "cf-connecting-ip"

const LOCAL_MODES = new Set(["development", "test"])

const LOCAL_HOSTS = ["localhost:3000", "127.0.0.1:3000"]
const SECOND_TEST_SERVER_HOSTS = ["localhost:3020", "127.0.0.1:3020"]

const HOSTS_BY_MODE: Readonly<Record<string, readonly string[]>> = {
  preview: [`preview.${APP_DOMAIN}`],
  production: [APP_DOMAIN],
  test: [...LOCAL_HOSTS, ...SECOND_TEST_SERVER_HOSTS],
}

export const isLocalMode = (mode: string): boolean => LOCAL_MODES.has(mode)

export const appHostsForMode = (mode: string): string[] => [...(HOSTS_BY_MODE[mode] ?? LOCAL_HOSTS)]
