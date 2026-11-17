import { render } from "react-email"
import { expect, it } from "vite-plus/test"

import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import type changeEmailMessages from "~/messages/en-US/emails.change-email-confirmation-email.json"
import type purchaseConfirmationMessages from "~/messages/en-US/emails.purchase-confirmation-email.json"
import type resetPasswordMessages from "~/messages/en-US/emails.reset-password-email.json"
import type verifyEmailMessages from "~/messages/en-US/emails.verify-email.json"
import { ChangeEmailConfirmationEmail } from "~/src/presentation/emails/change-email-confirmation-email"
import { PURCHASE_CONFIRMATION_EMAIL_NAMESPACE, PurchaseConfirmationEmail } from "~/src/presentation/emails/purchase-confirmation-email"
import { ResetPasswordEmail } from "~/src/presentation/emails/reset-password-email"
import { VerifyEmail } from "~/src/presentation/emails/verify-email"

it.each(I18N.SUPPORTED_LOCALES)("renders account emails in %s with working action links", async (locale) => {
  const url = `https://example.com/${locale}/auth/verify-email?token=example`
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

const PURCHASE_LINKS = {
  account: "https://example.com/app/license",
  licence: "https://example.com/licence",
  refunds: "https://example.com/refunds",
  terms: "https://example.com/terms",
}

it.each(I18N.SUPPORTED_LOCALES.flatMap((locale) => [true, false].map((withdrawalConsent) => ({ locale, withdrawalConsent }))))(
  "renders the purchase confirmation in $locale with consent $withdrawalConsent, every value filled in and every link",
  async ({ locale, withdrawalConsent }) => {
    const messages = await loadNamespace<typeof purchaseConfirmationMessages>({ locale, namespace: PURCHASE_CONFIRMATION_EMAIL_NAMESPACE })

    const html = await render(
      <PurchaseConfirmationEmail
        amount={279.3}
        currency="EUR"
        links={PURCHASE_LINKS}
        locale={locale}
        messages={messages}
        orderedAt={new Date("2026-11-16T09:30:00.000Z")}
        reference="SAASYLAND-0042"
        refundDeadline={new Date("2026-11-30T09:30:00.000Z")}
        tierName="Agency"
        withdrawalConsent={withdrawalConsent}
      />,
    )

    expect(html).toContain(`lang="${locale}"`)
    expect(html).toContain("SAASYLAND-0042")
    expect(html).toContain("Agency")
    expect(html).not.toMatch(/\{\w+\}/u)
    for (const href of Object.values(PURCHASE_LINKS)) {
      expect(html).toContain(`href="${href}"`)
    }
  },
)
