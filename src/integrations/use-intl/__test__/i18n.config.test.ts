import { createTranslator } from "use-intl"
import { describe, expect, it } from "vite-plus/test"

import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import { TIMEZONES } from "~/src/modules/_core/constants/timezone"

import type authDatesMessages from "~/messages/en-US/auth.dates.json"

const DATE_FIELDS = new Set(["dateStyle", "day", "era", "month", "weekday", "year"])
const TIME_FIELDS = new Set(["dayPeriod", "fractionalSecondDigits", "hour", "minute", "second", "timeStyle"])
const INSTANT = new Date("2025-01-01T12:00:00Z")

describe("I18N.FORMATS", () => {
  it.each(Object.entries(I18N.FORMATS.dateTime))(
    "%s formats a date or a time, never both, because engines join the two differently",
    (_, options) => {
      const fields = Object.keys(options)

      expect(fields.some((field) => DATE_FIELDS.has(field)) && fields.some((field) => TIME_FIELDS.has(field))).toBe(false)
    },
  )

  it.each(I18N.SUPPORTED_LOCALES)(
    "auth.dates.dateTime in %s prints the date and the time in every time zone as the server engine joins them",
    async (locale) => {
      const messages = await loadNamespace<typeof authDatesMessages>({ locale, namespace: "auth.dates" })

      for (const { iana: timeZone } of TIMEZONES) {
        const t = createTranslator({ formats: I18N.FORMATS, locale, messages, timeZone })
        const joined = new Intl.DateTimeFormat(locale, { ...I18N.FORMATS.dateTime.date, ...I18N.FORMATS.dateTime.time, timeZone }).format(
          INSTANT,
        )

        expect(t("dateTime", { value: INSTANT })).toBe(joined)
      }
    },
  )
})
