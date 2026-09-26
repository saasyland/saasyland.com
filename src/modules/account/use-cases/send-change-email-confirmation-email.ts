import { createElement } from "react"

import { createTranslator } from "use-intl"

import { sendEmail } from "~/src/integrations/resend/resend.utils"
import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"
import { extractLocaleFromCallbackURL } from "~/src/integrations/use-intl/i18n.paths"

import type changeEmailMessages from "~/messages/en-US/emails.change-email-confirmation-email.json"
import {
  CHANGE_EMAIL_CONFIRMATION_NAMESPACE,
  ChangeEmailConfirmationEmail,
} from "~/src/presentation/emails/change-email-confirmation-email"

export const sendChangeEmailConfirmationEmail = async ({
  newEmail,
  token,
  url,
  user,
}: {
  newEmail: string
  token: string
  url: string
  user: { email: string; name: string }
}): Promise<void> => {
  const locale = extractLocaleFromCallbackURL(url) ?? I18N.DEFAULT_LOCALE
  const messages = await loadNamespace<typeof changeEmailMessages>({ locale, namespace: CHANGE_EMAIL_CONFIRMATION_NAMESPACE })

  await sendEmail({
    idempotencyKey: `change-email-confirmation/${token}`,
    react: createElement(ChangeEmailConfirmationEmail, { confirmUrl: url, locale, messages, name: user.name, newEmail }),
    subject: createTranslator({ locale, messages })("subject"),
    to: user.email,
  })
}
