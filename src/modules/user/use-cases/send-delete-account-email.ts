import "@tanstack/react-start/server-only"

import { createElement } from "react"

import { getRequest } from "@tanstack/react-start/server"
import { createTranslator } from "use-intl"

import { sendEmail } from "~/src/integrations/resend/resend.utils"
import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"
import { extractLocaleFromCallbackURL, localizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { USER_EMAIL_PURPOSE } from "~/src/modules/user/user.constants"

import { withinRecipientRateLimit } from "~/src/lib/rate-limit"

import type deleteAccountMessages from "~/messages/en-US/emails.delete-account-email.json"
import { DELETE_ACCOUNT_EMAIL_NAMESPACE, DeleteAccountEmail } from "~/src/presentation/emails/delete-account-email"
import { ROUTES } from "~/src/routes"

export const sendDeleteAccountEmail = async ({
  token,
  url,
  user,
}: {
  token: string
  url: string
  user: { email: string; name: string }
}): Promise<void> => {
  if (!(await withinRecipientRateLimit({ kind: USER_EMAIL_PURPOSE.DELETE_ACCOUNT, recipient: user.email }))) {
    console.warn("[email] account deletion email not sent: the recipient reached the hourly limit")
    return
  }

  const locale = extractLocaleFromCallbackURL(url) ?? I18N.DEFAULT_LOCALE
  const confirmUrl = new URL(localizePathname({ locale, pathname: ROUTES.APP.SETTINGS.DELETE_ACCOUNT }), getRequest().url)
  confirmUrl.searchParams.set("token", token)
  const messages = await loadNamespace<typeof deleteAccountMessages>({ locale, namespace: DELETE_ACCOUNT_EMAIL_NAMESPACE })

  await sendEmail({
    idempotency: { purpose: USER_EMAIL_PURPOSE.DELETE_ACCOUNT, token },
    react: createElement(DeleteAccountEmail, { confirmUrl: confirmUrl.toString(), locale, messages, name: user.name }),
    subject: createTranslator({ locale, messages })("subject"),
    to: user.email,
  })
}
