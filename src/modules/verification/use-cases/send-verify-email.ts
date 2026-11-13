import { createElement } from "react"

import { getRequest } from "@tanstack/react-start/server"
import { createTranslator } from "use-intl"

import { EMAIL_PURPOSE } from "~/src/integrations/resend/resend.constants"
import { sendEmail } from "~/src/integrations/resend/resend.utils"
import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"
import { extractLocaleFromPath, localizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { withinRecipientRateLimit } from "~/src/lib/rate-limit"

import type verifyEmailMessages from "~/messages/en-US/emails.verify-email.json"
import { VERIFY_EMAIL_NAMESPACE, VerifyEmail } from "~/src/presentation/emails/verify-email"
import { ROUTES } from "~/src/routes"

export const sendVerifyEmail = async ({
  callbackURL,
  token,
  user,
}: {
  callbackURL: string
  token: string
  user: { email: string; name: string }
}): Promise<void> => {
  if (!(await withinRecipientRateLimit({ kind: EMAIL_PURPOSE.VERIFY_EMAIL, recipient: user.email }))) {
    console.warn("[email] verification email not sent: the recipient reached the hourly limit")
    return
  }

  const callback = new URL(callbackURL, getRequest().url)
  const locale = extractLocaleFromPath(callback.pathname) ?? I18N.DEFAULT_LOCALE
  const verifyUrl = new URL(localizePathname({ locale, pathname: ROUTES.VERIFY_EMAIL }), getRequest().url)
  verifyUrl.search = callback.search
  verifyUrl.searchParams.set("token", token)

  const messages = await loadNamespace<typeof verifyEmailMessages>({ locale, namespace: VERIFY_EMAIL_NAMESPACE })

  await sendEmail({
    idempotency: { purpose: EMAIL_PURPOSE.VERIFY_EMAIL, token },
    react: createElement(VerifyEmail, { locale, messages, name: user.name, verifyUrl: verifyUrl.toString() }),
    subject: createTranslator({ locale, messages })("subject"),
    to: user.email,
  })
}
