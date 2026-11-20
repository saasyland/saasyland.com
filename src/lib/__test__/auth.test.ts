import { describe, expect, it } from "vite-plus/test"

import { ENVIRONMENT } from "~/src/modules/_core/constants/api"

import { verifyAuth } from "~/src/lib/auth"

const FILE = `.env.${ENVIRONMENT.PRODUCTION}`

const GITHUB_VARIABLE = "AUTH_GITHUB_CLIENT_ID"

const GOOGLE_VARIABLE = "AUTH_GOOGLE_CLIENT_ID"

const GITHUB_CLIENT_ID = "Ov23liAbCdEfGhIjKlMn"

const GOOGLE_CLIENT_ID = "123456789012-abcdefghijklmnopqrstuvwxyz012345.apps.googleusercontent.com"

const PLACEHOLDER = "[UPDATE]"

const CONFIGURED = {
  [GITHUB_VARIABLE]: GITHUB_CLIENT_ID,
  [GOOGLE_VARIABLE]: GOOGLE_CLIENT_ID,
}

const GOOGLE_REFUSAL = `${GOOGLE_VARIABLE} in ${FILE} is not a Google OAuth client ID.`

const GITHUB_REFUSAL = `${GITHUB_VARIABLE} in ${FILE} is not a GitHub OAuth client ID.`

describe("verifyAuth on an environment file whose OAuth clients are configured", () => {
  it("names each client ID it checked and its provider, without printing the values", () => {
    const report = verifyAuth({ file: FILE, values: CONFIGURED })

    expect(report).toBe(
      [`${GITHUB_VARIABLE} in ${FILE} is a GitHub OAuth client ID.`, `${GOOGLE_VARIABLE} in ${FILE} is a Google OAuth client ID.`].join(
        "\n",
      ),
    )
    expect(report).not.toContain(GOOGLE_CLIENT_ID)
    expect(report).not.toContain(GITHUB_CLIENT_ID)
  })

  it.each([
    ["an OAuth app's older client ID of 20 hex digits", "0123456789abcdef0123"],
    ["a GitHub App's current client ID", "Iv23liAbCdEfGhIjKlMn"],
    ["a GitHub App's older client ID", "Iv1.0123456789abcdef"],
  ])("accepts %s for GitHub", (_kind, clientId) => {
    expect(() => verifyAuth({ file: FILE, values: { ...CONFIGURED, [GITHUB_VARIABLE]: clientId } })).not.toThrow()
  })
})

describe("verifyAuth on an environment file whose OAuth clients are not configured", () => {
  it("refuses the placeholder that reached production, naming the variable and the file without printing the value", () => {
    const verifying = (): string => verifyAuth({ file: FILE, values: { ...CONFIGURED, [GOOGLE_VARIABLE]: PLACEHOLDER } })

    expect(verifying).toThrow(new Error(GOOGLE_REFUSAL))
    expect(verifying).not.toThrow(PLACEHOLDER)
  })

  it.each([
    ["a GitHub client ID", GITHUB_CLIENT_ID],
    ["a client ID with surrounding spaces", ` ${GOOGLE_CLIENT_ID} `],
    ["an empty value", ""],
  ])("refuses %s for Google", (_kind, clientId) => {
    expect(() => verifyAuth({ file: FILE, values: { ...CONFIGURED, [GOOGLE_VARIABLE]: clientId } })).toThrow(new Error(GOOGLE_REFUSAL))
  })

  it.each([
    ["a Google client ID", GOOGLE_CLIENT_ID],
    ["a client ID one character too long", `${GITHUB_CLIENT_ID}0`],
  ])("refuses %s for GitHub", (_kind, clientId) => {
    expect(() => verifyAuth({ file: FILE, values: { ...CONFIGURED, [GITHUB_VARIABLE]: clientId } })).toThrow(new Error(GITHUB_REFUSAL))
  })

  it("refuses a file without the client IDs, one line per provider", () => {
    expect(() => verifyAuth({ file: FILE, values: {} })).toThrow(new Error([GITHUB_REFUSAL, GOOGLE_REFUSAL].join("\n")))
  })
})
