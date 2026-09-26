import { render } from "react-email"
import { expect, it } from "vite-plus/test"

import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import type changeEmailMessages from "~/messages/en-US/emails.change-email-confirmation-email.json"
import type resetPasswordMessages from "~/messages/en-US/emails.reset-password-email.json"
import type verifyEmailMessages from "~/messages/en-US/emails.verify-email.json"
import { ChangeEmailConfirmationEmail } from "~/src/presentation/emails/change-email-confirmation-email"
import { ResetPasswordEmail } from "~/src/presentation/emails/reset-password-email"
import { VerifyEmail } from "~/src/presentation/emails/verify-email"

it.each(I18N.SUPPORTED_LOCALES)("renders account emails in %s with working action links", async (locale) => {
  const url = `https://saasyland.com/${locale}/auth/verify-email?token=example`
  const reset = await loadNamespace<typeof resetPasswordMessages>({ locale, namespace: "emails.reset-password-email" })
  const verify = await loadNamespace<typeof verifyEmailMessages>({ locale, namespace: "emails.verify-email" })
  const change = await loadNamespace<typeof changeEmailMessages>({ locale, namespace: "emails.change-email-confirmation-email" })
  const templates = [
    <ResetPasswordEmail key="reset" locale={locale} messages={reset} name="Alex" resetPasswordUrl={url} />,
    <VerifyEmail key="verify" locale={locale} messages={verify} name="Alex" verifyUrl={url} />,
    <ChangeEmailConfirmationEmail
      key="change"
      locale={locale}
      messages={change}
      name="Alex"
      newEmail="alex@example.test"
      confirmUrl={url}
    />,
  ]
  for (const template of templates) {
    const html = await render(template)
    expect(html).toContain(`lang="${locale}"`)
    expect(html).toContain(`href="${url}"`)
    expect(html).toContain("Alex")
    expect(html).not.toContain("{name}")
    expect(html).not.toContain("{newEmail}")
  }
})
