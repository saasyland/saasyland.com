import { expect, it } from "vite-plus/test"

import { createCookieHeader } from "~/src/platform/testing/lib/test-request"

import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { parseLocaleCookie } from "~/src/integrations/use-intl/i18n.utils"

it("reads a supported locale from the locale cookie", () => {
  expect(parseLocaleCookie(createCookieHeader(I18N.COOKIE_NAME, "pl-PL"))).toBe("pl-PL")
})

it.each([undefined, createCookieHeader(I18N.COOKIE_NAME, "invalid"), createCookieHeader("other", "pl-PL")])(
  "ignores a missing or unsupported locale cookie: %j",
  (cookie) => {
    expect(parseLocaleCookie(cookie)).toBeUndefined()
  },
)
