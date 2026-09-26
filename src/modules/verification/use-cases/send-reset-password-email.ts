import { createElement } from "react"

import { createTranslator } from "use-intl"

import { sendEmail } from "~/src/integrations/resend/resend.utils"
import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"
import { extractLocaleFromCallbackURL } from "~/src/integrations/use-intl/i18n.paths"

import type resetPasswordMessages from "~/messages/en-US/emails.reset-password-email.json"
import { RESET_PASSWORD_NAMESPACE, ResetPasswordEmail } from "~/src/presentation/emails/reset-password-email"

export const sendResetPasswordEmail = async ({
  token,
  url,
  user,
}: {
  token: string
  url: string
  user: { email: string; name: string }
}): Promise<void> => {
  const locale = extractLocaleFromCallbackURL(url) ?? I18N.DEFAULT_LOCALE
  const messages = await loadNamespace<typeof resetPasswordMessages>({ locale, namespace: RESET_PASSWORD_NAMESPACE })

  await sendEmail({
    idempotencyKey: `reset-password/${token}`,
    react: createElement(ResetPasswordEmail, { locale, messages, name: user.name, resetPasswordUrl: url }),
    subject: createTranslator({ locale, messages })("subject"),
    to: user.email,
  })
}
