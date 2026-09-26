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

const HOSTS_BY_MODE: Readonly<Record<string, readonly string[]>> = {
  preview: [`preview.${APP_DOMAIN}`],
  production: [APP_DOMAIN],
}

const LOCAL_HOSTS = ["localhost:3000", "127.0.0.1:3000"]

export const isLocalMode = (mode: string): boolean => LOCAL_MODES.has(mode)

export const appHostsForMode = (mode: string): string[] => [...(HOSTS_BY_MODE[mode] ?? LOCAL_HOSTS)]
