import { describe, expect, it } from "vite-plus/test"

import { ENVIRONMENT } from "~/src/modules/_core/constants/api"

import { SECRET_PLACEHOLDER_BRACKETS, SECRET_PLACEHOLDER_WORDS, readDeploySecrets } from "~/src/lib/deploy-secrets"

const FILE = `.env.${ENVIRONMENT.PRODUCTION}`

const SECRET = "AUTH_SECRET"

const CLIENT_ID = "AUTH_GOOGLE_CLIENT_ID"

const API_KEY = "RESEND_API_KEY"

const NAMES = [SECRET, CLIENT_ID, API_KEY]

const VALUES = {
  [API_KEY]: "re_0123456789abcdefghijklmnopqrstuv",
  [CLIENT_ID]: "123456789012-abcdefghijklmnopqrstuvwxyz012345.apps.googleusercontent.com",
  [SECRET]: "s3cr3t-value-of-forty-characters-0123456",
}

const read = (values: Readonly<Record<string, string | undefined>>): Record<string, string> =>
  readDeploySecrets({ file: FILE, names: NAMES, values })

const placeholderRefusal = (...names: readonly string[]): string =>
  `Replace the placeholders in ${FILE} with the real values of ${names.join(", ")}.`

describe("readDeploySecrets on an environment file that sets every declared secret", () => {
  it("returns the declared secrets as the file writes them and leaves out every other variable", () => {
    expect(read({ ...VALUES, [SECRET]: ` ${VALUES[SECRET]} `, UNDECLARED: "value" })).toStrictEqual({
      ...VALUES,
      [SECRET]: ` ${VALUES[SECRET]} `,
    })
  })

  it.each([
    ["contains a placeholder word", "todo-app-0123456789"],
    ["extends a placeholder word", "updated"],
    ["opens a bracket it does not close", "[0123456789"],
    ["closes a bracket it did not open", "0123456789>"],
    ["brackets only a part of it", "a<b>c"],
  ])("accepts a value that %s", (_kind, value) => {
    expect(read({ ...VALUES, [SECRET]: value })).toStrictEqual({ ...VALUES, [SECRET]: value })
  })
})

describe("readDeploySecrets on an environment file that leaves a declared secret unset", () => {
  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["blank", "  "],
  ])("asks to set a secret that is %s", (_kind, value) => {
    expect(() => read({ ...VALUES, [API_KEY]: value })).toThrow(new Error(`Set ${API_KEY} in ${FILE}.`))
  })

  it("names every unset secret in one line", () => {
    expect(() => read({ [CLIENT_ID]: VALUES[CLIENT_ID] })).toThrow(new Error(`Set ${SECRET}, ${API_KEY} in ${FILE}.`))
  })
})

describe("readDeploySecrets on an environment file that holds a placeholder", () => {
  it.each(["[UPDATE]", "<client-id>", "{{GOOGLE_CLIENT_ID}}", " [UPDATE] ", "TODO", "Change-Me", "REPLACE_ME", " tbd ", "Place holder"])(
    "refuses %j, naming the secret without printing the value",
    (placeholder) => {
      const reading = (): Record<string, string> => read({ ...VALUES, [CLIENT_ID]: placeholder })

      expect(reading).toThrow(new Error(placeholderRefusal(CLIENT_ID)))
      expect(reading).not.toThrow(placeholder.trim())
    },
  )

  it.each(SECRET_PLACEHOLDER_BRACKETS)("refuses a value between %s and %s", (open, close) => {
    expect(() => read({ ...VALUES, [SECRET]: `${open}UPDATE${close}` })).toThrow(new Error(placeholderRefusal(SECRET)))
  })

  it.each(SECRET_PLACEHOLDER_WORDS)("refuses %s in capitals", (word) => {
    expect(() => read({ ...VALUES, [SECRET]: word.toUpperCase() })).toThrow(new Error(placeholderRefusal(SECRET)))
  })

  it("lists the unset secrets first and then every placeholder, one line each", () => {
    expect(() => read({ [CLIENT_ID]: "[UPDATE]", [SECRET]: "changeme" })).toThrow(
      new Error([`Set ${API_KEY} in ${FILE}.`, placeholderRefusal(SECRET, CLIENT_ID)].join("\n")),
    )
  })
})
