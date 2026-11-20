import "@tanstack/react-start/server-only"

import { createElement } from "react"

import { createTranslator } from "use-intl"

import { EMAIL_PURPOSE } from "~/src/integrations/resend/resend.constants"
import { sendEmail } from "~/src/integrations/resend/resend.utils"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import { accountEmailLinks } from "~/src/modules/account/account.links"

import type passwordChangedMessages from "~/messages/en-US/emails.password-changed-email.json"
import { APP_NAME } from "~/src/presentation/branding"
import { PASSWORD_CHANGED_EMAIL_NAMESPACE, PasswordChangedEmail } from "~/src/presentation/emails/password-changed-email"

export const sendPasswordChangedEmail = async ({
  callbackURL,
  user,
}: {
  callbackURL: string
  user: { email: string; name: string }
}): Promise<void> => {
  const { locale, resetPasswordUrl, signInUrl } = accountEmailLinks(callbackURL)
  const messages = await loadNamespace<typeof passwordChangedMessages>({ locale, namespace: PASSWORD_CHANGED_EMAIL_NAMESPACE })

  await sendEmail({
    idempotency: { purpose: EMAIL_PURPOSE.PASSWORD_CHANGED, token: crypto.randomUUID() },
    react: createElement(PasswordChangedEmail, { locale, messages, name: user.name, resetPasswordUrl, signInUrl }),
    subject: createTranslator({ locale, messages })("subject", { appName: APP_NAME }),
    to: user.email,
  })
}
