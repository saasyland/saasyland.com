import { createElement } from "react"

import { getRequest } from "@tanstack/react-start/server"
import { createTranslator } from "use-intl"

import { sendEmail } from "~/src/integrations/resend/resend.utils"
import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"
import { localizePathname } from "~/src/integrations/use-intl/i18n.paths"

import type verifyEmailMessages from "~/messages/en-US/emails.verify-email.json"
import { VERIFY_EMAIL_NAMESPACE, VerifyEmail } from "~/src/presentation/emails/verify-email"
import { ROUTES } from "~/src/routes"

export const sendVerifyEmail = async ({
  locale,
  token,
  user,
}: {
  locale: SupportedLocale
  token: string
  user: { email: string; name: string }
}): Promise<void> => {
  const messages = await loadNamespace<typeof verifyEmailMessages>({ locale, namespace: VERIFY_EMAIL_NAMESPACE })
  const verifyUrl = new URL(localizePathname({ locale, pathname: ROUTES.VERIFY_EMAIL }), getRequest().url)
  verifyUrl.searchParams.set("token", token)

  await sendEmail({
    idempotencyKey: `verify-email/${token}`,
    react: createElement(VerifyEmail, { locale, messages, name: user.name, verifyUrl: verifyUrl.toString() }),
    subject: createTranslator({ locale, messages })("subject"),
    to: user.email,
  })
}
