import { describe, expect, it } from "vite-plus/test"
import * as zod from "zod"

import { readUnverifiedJwtPayload } from "~/src/lib/jwt"

const schema = zod.object({ email: zod.email() })

const segment = (value: string): string => btoa(value).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")

describe("readUnverifiedJwtPayload", () => {
  it("reads the address in a token's payload, including base64url characters and beside claims that are not ASCII", () => {
    const email = "ada+test@example.com"
    const bytes = String.fromCodePoint(...new TextEncoder().encode(JSON.stringify({ email, name: "Zoë ???>>>" })))
    const payload = segment(bytes)

    expect(payload).toMatch(/[-_]/u)
    expect(readUnverifiedJwtPayload(`header.${payload}.signature`, schema)).toStrictEqual({ email })
  })

  it.each([
    "",
    "header",
    "header.not-base64!.signature",
    `header.${segment("not json")}.signature`,
    `header.${segment('{"email":4}')}.signature`,
  ])("reads nothing from %j", (token) => {
    expect(readUnverifiedJwtPayload(token, schema)).toBeUndefined()
  })
})
