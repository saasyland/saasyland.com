import { describe, expect, it } from "vite-plus/test"

import { SECURITY_TXT_EXPIRES, SECURITY_TXT_LANGUAGES } from "~/src/data/security"

import { MILLISECONDS_PER_DAY } from "~/src/lib/duration"
import { SECURITY_TXT_CONTENT, SECURITY_TXT_FIELD } from "~/src/lib/security-txt"

import { APP_URL, CONTACT_EMAIL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const RFC_9116_FIELDS = new Set<string>([
  "Acknowledgments",
  "Canonical",
  "Contact",
  "Encryption",
  "Expires",
  "Hiring",
  "Policy",
  "Preferred-Languages",
])

const SINGLE_FIELDS: readonly string[] = [SECURITY_TXT_FIELD.EXPIRES, SECURITY_TXT_FIELD.PREFERRED_LANGUAGES]

const WEB_URI_FIELDS: readonly string[] = [SECURITY_TXT_FIELD.CANONICAL, SECURITY_TXT_FIELD.POLICY]

const FIELD_LINE = /^(?<name>[A-Za-z][A-Za-z-]*): (?<value>\S.*)$/u

const RFC_3339_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u

const DAYS_PER_YEAR = 365

const HTTPS = "https:"

const MAILTO = "mailto:"

const lines = SECURITY_TXT_CONTENT.split("\n")

const fields = lines
  .filter((line) => line !== "")
  .map((line) => {
    const groups = FIELD_LINE.exec(line)?.groups

    return { name: groups?.["name"] ?? line, value: groups?.["value"] ?? "" }
  })

const valuesOf = (name: string): string[] => fields.filter((field) => field.name === name).map(({ value }) => value)

describe("security.txt", () => {
  it("is a list of RFC 9116 fields, one per line, ending with a line break", () => {
    expect(SECURITY_TXT_CONTENT.endsWith("\n")).toBe(true)
    expect(fields.filter(({ name }) => !RFC_9116_FIELDS.has(name))).toStrictEqual([])
    expect(lines.slice(0, -1).filter((line) => !FIELD_LINE.test(line))).toStrictEqual([])
  })

  it("names the public mailbox as its contact", () => {
    expect(valuesOf(SECURITY_TXT_FIELD.CONTACT)).toStrictEqual([`${MAILTO}${CONTACT_EMAIL}`])
  })

  it.each(SINGLE_FIELDS)("has %s once", (name) => {
    expect(valuesOf(name)).toHaveLength(1)
  })

  it("expires at an RFC 3339 date-time that has not passed and is at most a year away", () => {
    const expires = Date.parse(SECURITY_TXT_EXPIRES)
    const now = Date.now()

    expect(valuesOf(SECURITY_TXT_FIELD.EXPIRES)).toStrictEqual([SECURITY_TXT_EXPIRES])
    expect(SECURITY_TXT_EXPIRES).toMatch(RFC_3339_DATE_TIME)
    expect(expires).toBeGreaterThan(now)
    expect(expires - now).toBeLessThanOrEqual(DAYS_PER_YEAR * MILLISECONDS_PER_DAY)
  })

  it("prefers languages written as language tags", () => {
    expect(valuesOf(SECURITY_TXT_FIELD.PREFERRED_LANGUAGES)).toStrictEqual([SECURITY_TXT_LANGUAGES.join(", ")])
    expect(Intl.getCanonicalLocales(SECURITY_TXT_LANGUAGES)).toStrictEqual(SECURITY_TXT_LANGUAGES)
  })

  it.each(WEB_URI_FIELDS)("gives %s as an https URL on the site", (name) => {
    const [value = ""] = valuesOf(name)
    const url = new URL(value)

    expect(url.protocol).toBe(HTTPS)
    expect(url.origin).toBe(APP_URL)
  })

  it("is canonical at the path the site serves it from, and points to the security policy in the docs", () => {
    expect(valuesOf(SECURITY_TXT_FIELD.CANONICAL)).toStrictEqual([`${APP_URL}${ROUTES.WELL_KNOWN.SECURITY_TXT}`])
    expect(valuesOf(SECURITY_TXT_FIELD.POLICY)).toStrictEqual([`${APP_URL}${ROUTES.DOCS.PROJECT.SECURITY_POLICY}`])
  })
})
