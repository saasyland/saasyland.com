import { render } from "react-email"
import { createTranslator } from "use-intl"
import { expect, it } from "vite-plus/test"

import { AUTH_PROVIDER, EMAIL_LINK_LIFETIME_HOURS } from "~/src/integrations/better-auth/auth.constants"
import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import type changeEmailMessages from "~/messages/en-US/emails.change-email-confirmation-email.json"
import type existingAccountMessages from "~/messages/en-US/emails.existing-account-email.json"
import type passwordChangedMessages from "~/messages/en-US/emails.password-changed-email.json"
import type purchaseConfirmationMessages from "~/messages/en-US/emails.purchase-confirmation-email.json"
import type resetPasswordMessages from "~/messages/en-US/emails.reset-password-email.json"
import type unmatchedOrderAlertMessages from "~/messages/en-US/emails.unmatched-order-alert-email.json"
import type verifyEmailMessages from "~/messages/en-US/emails.verify-email.json"
import { APP_NAME, CONTACT_EMAIL } from "~/src/presentation/branding"
import { ChangeEmailConfirmationEmail } from "~/src/presentation/emails/change-email-confirmation-email"
import { EXISTING_ACCOUNT_EMAIL_NAMESPACE, ExistingAccountEmail } from "~/src/presentation/emails/existing-account-email"
import { PASSWORD_CHANGED_EMAIL_NAMESPACE, PasswordChangedEmail } from "~/src/presentation/emails/password-changed-email"
import { PURCHASE_CONFIRMATION_EMAIL_NAMESPACE, PurchaseConfirmationEmail } from "~/src/presentation/emails/purchase-confirmation-email"
import { ResetPasswordEmail } from "~/src/presentation/emails/reset-password-email"
import { UNMATCHED_ORDER_ALERT_EMAIL_NAMESPACE, UnmatchedOrderAlertEmail } from "~/src/presentation/emails/unmatched-order-alert-email"
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

it.each(I18N.SUPPORTED_LOCALES)("renders the existing account notice in %s with its sign-in and password reset links", async (locale) => {
  const signInUrl = `https://example.com/${locale}/auth/sign-in`
  const resetPasswordUrl = `https://example.com/${locale}/auth/forgot-password`
  const messages = await loadNamespace<typeof existingAccountMessages>({ locale, namespace: EXISTING_ACCOUNT_EMAIL_NAMESPACE })

  const html = await render(
    <ExistingAccountEmail
      locale={locale}
      messages={messages}
      name="Alex"
      providers={[AUTH_PROVIDER.CREDENTIAL, AUTH_PROVIDER.GITHUB]}
      resetPasswordUrl={resetPasswordUrl}
      signInUrl={signInUrl}
    />,
  )

  expect(html).toContain(`lang="${locale}"`)
  expect(html).toContain(`href="${signInUrl}"`)
  expect(html).toContain(`href="${resetPasswordUrl}"`)
  expect(html).toContain("Alex")
  expect(html).toContain(APP_NAME)
  expect(html).toContain("GitHub")
  expect(html).not.toMatch(/\{\w+\}|<\/?link>/u)
})

it.each(I18N.SUPPORTED_LOCALES)("renders the password change notice in %s with its sign-in, reset and contact links", async (locale) => {
  const signInUrl = `https://example.com/${locale}/auth/sign-in`
  const resetPasswordUrl = `https://example.com/${locale}/auth/forgot-password`
  const messages = await loadNamespace<typeof passwordChangedMessages>({ locale, namespace: PASSWORD_CHANGED_EMAIL_NAMESPACE })

  const html = await render(
    <PasswordChangedEmail locale={locale} messages={messages} name="Alex" resetPasswordUrl={resetPasswordUrl} signInUrl={signInUrl} />,
  )

  expect(html).toContain(`lang="${locale}"`)
  for (const href of [signInUrl, resetPasswordUrl, `mailto:${CONTACT_EMAIL}`]) {
    expect(html).toContain(`href="${href}"`)
  }
  expect(html).toContain("Alex")
  expect(html).not.toMatch(/\{\w+\}|<\/?(?:reset|mail)>/u)
})

it.each(I18N.SUPPORTED_LOCALES)("states in %s how long the verification, reset and email change links work", async (locale) => {
  const url = `https://example.com/${locale}/auth/verify-email?token=example`
  const reset = await loadNamespace<typeof resetPasswordMessages>({ locale, namespace: "emails.reset-password-email" })
  const verify = await loadNamespace<typeof verifyEmailMessages>({ locale, namespace: "emails.verify-email" })
  const change = await loadNamespace<typeof changeEmailMessages>({ locale, namespace: "emails.change-email-confirmation-email" })
  const expiry = (message: string): string =>
    createTranslator({ locale, messages: { message } })("message", { hours: EMAIL_LINK_LIFETIME_HOURS })
  const rendered = [
    { html: await render(<ResetPasswordEmail locale={locale} messages={reset} name="Alex" resetPasswordUrl={url} />), messages: reset },
    { html: await render(<VerifyEmail locale={locale} messages={verify} name="Alex" verifyUrl={url} />), messages: verify },
    {
      html: await render(
        <ChangeEmailConfirmationEmail locale={locale} messages={change} name="Alex" newEmail="alex@example.test" confirmUrl={url} />,
      ),
      messages: change,
    },
  ]

  for (const { html, messages } of rendered) {
    expect(html).toContain(expiry(messages.expiry))
    expect(html).toContain(messages.fallback)
    expect(html.split(`href="${url}"`)).toHaveLength(3)
    expect(html).toContain(APP_NAME)
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

it.each(I18N.SUPPORTED_LOCALES)(
  "renders the unmatched order alert in %s with every value filled in and the link to Polar",
  async (locale) => {
    const messages = await loadNamespace<typeof unmatchedOrderAlertMessages>({ locale, namespace: UNMATCHED_ORDER_ALERT_EMAIL_NAMESPACE })
    const polarUrl = "https://polar.sh/dashboard/saasyland/sales/ord_unmatched"

    const html = await render(
      <UnmatchedOrderAlertEmail
        amount={719.2}
        currency="EUR"
        customer={{ email: "guest@example.test", name: "Grace Hopper" }}
        locale={locale}
        messages={messages}
        orderId="ord_unmatched"
        orderedAt={new Date("2026-11-16T09:30:00.000Z")}
        polarUrl={polarUrl}
        tierName="Agency"
      />,
    )

    expect(html).toContain(`lang="${locale}"`)
    for (const value of ["ord_unmatched", "Agency", "guest@example.test", "Grace Hopper", `href="${polarUrl}"`]) {
      expect(html).toContain(value)
    }
    expect(html).not.toMatch(/\{\w+\}/u)
  },
)
