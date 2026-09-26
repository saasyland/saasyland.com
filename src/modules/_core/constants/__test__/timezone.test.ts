import { describe, expect, it } from "vite-plus/test"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { TIMEZONES } from "~/src/modules/_core/constants/timezone"
import { TIMEZONE_CODES } from "~/src/modules/user/user.schema"

describe("timezone catalog", () => {
  it("derives one code per catalog entry, with no duplicates", () => {
    expect.hasAssertions()
    expect(TIMEZONE_CODES).toHaveLength(TIMEZONES.length)
    expect(new Set(TIMEZONE_CODES).size).toBe(TIMEZONE_CODES.length)
  })

  it("contains the default timezone", () => {
    expect.hasAssertions()
    expect(TIMEZONE_CODES).toContain(I18N.DEFAULT_TIMEZONE)
    expect(I18N.DEFAULT_TIMEZONE).toBe("UTC")
  })

  it("keeps IANA area/location formatting for every zone except UTC", () => {
    expect.hasAssertions()
    for (const code of TIMEZONE_CODES.filter((value) => value !== "UTC")) {
      expect(code).toMatch(/^[A-Za-z]+\/[A-Za-z0-9_+-]+(?:\/[A-Za-z0-9_+-]+)?$/u)
    }
  })
})
