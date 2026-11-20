import type { ProviderDouble } from "~/src/platform/testing/mocks/providers"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

import { BREACHED_PASSWORD } from "~/e2e/data/accounts"

const RANGE_PATH = /^\/range\/(?<prefix>[\dA-F]{5})$/u
const HASH_PREFIX_LENGTH = 5
const BREACH_COUNT = 9_545_824
const PADDING_LINE = `${"0".repeat(35)}:0`
const LINE_BREAK = "\r\n"

const sha1 = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(value))
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()
}

export const haveIBeenPwnedApi = {
  origin: "https://api.pwnedpasswords.com",
  reset: () => {},
  respond: async (request: Request) => {
    const prefix = RANGE_PATH.exec(new URL(request.url).pathname)?.groups?.["prefix"]
    if (request.method !== "GET" || prefix === undefined) {
      return {
        reason: `The test double does not serve ${request.method} ${request.url}`,
        response: new Response(null, { status: HTTP_STATUS.NOT_FOUND }),
      }
    }
    const breached = await sha1(BREACHED_PASSWORD)
    const lines = breached.startsWith(prefix) ? [`${breached.slice(HASH_PREFIX_LENGTH)}:${String(BREACH_COUNT)}`] : []
    return new Response([...lines, PADDING_LINE].join(LINE_BREAK))
  },
} satisfies ProviderDouble

export const AUTH_PROVIDER_DOUBLES = [haveIBeenPwnedApi] as const satisfies readonly ProviderDouble[]
