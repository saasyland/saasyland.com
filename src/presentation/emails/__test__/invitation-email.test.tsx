import { render } from "react-email"
import { createTranslator } from "use-intl"
import { expect, it } from "vite-plus/test"

import { ROLE_VALUES } from "~/src/integrations/better-auth/auth.roles"
import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import { INVITATION_LIFETIME_DAYS } from "~/src/modules/invitation/invitation.constants"

import messages from "~/messages/en-US/emails.invitation-email.json"
import { APP_NAME } from "~/src/presentation/branding"
import { INVITATION_EMAIL_NAMESPACE, InvitationEmail } from "~/src/presentation/emails/invitation-email"

const ACCEPT_URL = "https://example.com/auth/invite?token=invitation-token"
const INVITER = "Ada Lovelace"
const t = createTranslator({ locale: "en-US", messages })

it.each(ROLE_VALUES)("invites the recipient as %s with the inviter, the role, the link and how long it works", async (role) => {
  const html = await render(<InvitationEmail acceptUrl={ACCEPT_URL} inviter={INVITER} locale="en-US" messages={messages} role={role} />)

  expect(html).toContain('lang="en-US"')
  expect(html).toContain(`href="${ACCEPT_URL}"`)
  expect(html).toContain(t("preview", { appName: APP_NAME, inviter: INVITER }))
  expect(html).toContain(t("heading", { appName: APP_NAME }))
  expect(html).toContain(t("body", { appName: APP_NAME, inviter: INVITER, role: t(`roles.${role}`) }))
  expect(html).toContain(messages.button)
  expect(html).toContain(t("expiry", { days: INVITATION_LIFETIME_DAYS }))
  expect(html).toContain(messages.footer)
})

it.each(I18N.SUPPORTED_LOCALES)("fills every placeholder of the invitation in %s", async (locale) => {
  const localized = await loadNamespace<typeof messages>({ locale, namespace: INVITATION_EMAIL_NAMESPACE })

  for (const role of ROLE_VALUES) {
    const html = await render(<InvitationEmail acceptUrl={ACCEPT_URL} inviter={INVITER} locale={locale} messages={localized} role={role} />)

    expect(html).toContain(`lang="${locale}"`)
    expect(html).toContain(`href="${ACCEPT_URL}"`)
    expect(html).toContain(INVITER)
    expect(html).not.toMatch(/\{\w+\}/u)
  }
})
