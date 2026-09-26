import { getRequest } from "@tanstack/react-start/server"
import { expect, it, vi } from "vite-plus/test"

import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"
import { resolveLocale } from "~/src/integrations/use-intl/i18n.middleware"
import { canonicalizePathname, localizePathname } from "~/src/integrations/use-intl/i18n.paths"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import type changeEmailMessages from "~/messages/en-US/emails.change-email-confirmation-email.json"
import type resetPasswordMessages from "~/messages/en-US/emails.reset-password-email.json"
import type globalErrorMessages from "~/messages/en-US/errors.global.json"

it.each(I18N.SUPPORTED_LOCALES)("uses %s consistently for documents, aliases and messages", async (locale) => {
  const path = localizePathname({ locale, pathname: "/refunds" })
  const alias = `/${locale.split("-")[0]}/refunds`
  expect(canonicalizePathname(alias)).toBe(path)
  expect(resolveLocale(new Request(`https://saasyland.com${alias}`)).redirect?.headers.get("location")).toBe(`https://saasyland.com${path}`)
  vi.mocked(getRequest).mockReturnValue(new Request(`https://saasyland.com${path}`))
  expect(getCurrentLocale()).toBe(locale)
  const errors = await loadNamespace<typeof globalErrorMessages>({ locale, namespace: "errors.global" })
  const reset = await loadNamespace<typeof resetPasswordMessages>({ locale, namespace: "emails.reset-password-email" })
  const change = await loadNamespace<typeof changeEmailMessages>({ locale, namespace: "emails.change-email-confirmation-email" })
  const englishReset = await loadNamespace<typeof resetPasswordMessages>({
    locale: I18N.DEFAULT_LOCALE,
    namespace: "emails.reset-password-email",
  })
  expect(errors.title.length).toBeGreaterThan(0)
  expect(reset.body).toContain("{name}")
  expect(change.body).toContain("{newEmail}")
  expect(reset.subject === englishReset.subject).toBe(locale === I18N.DEFAULT_LOCALE)
})
