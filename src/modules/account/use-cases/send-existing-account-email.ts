import "@tanstack/react-start/server-only"

import { createElement } from "react"

import { asc, eq } from "drizzle-orm"
import { createTranslator } from "use-intl"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { EMAIL_PURPOSE } from "~/src/integrations/resend/resend.constants"
import { sendEmail } from "~/src/integrations/resend/resend.utils"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import { accountEmailLinks } from "~/src/modules/account/account.links"
import { account } from "~/src/modules/account/account.schema"

import { withinRecipientRateLimit } from "~/src/lib/rate-limit"

import type existingAccountMessages from "~/messages/en-US/emails.existing-account-email.json"
import { APP_NAME } from "~/src/presentation/branding"
import { EXISTING_ACCOUNT_EMAIL_NAMESPACE, ExistingAccountEmail } from "~/src/presentation/emails/existing-account-email"

export const sendExistingAccountEmail = async ({
  callbackURL,
  user,
}: {
  callbackURL: string
  user: { email: string; id: string; name: string }
}): Promise<void> => {
  if (!(await withinRecipientRateLimit({ kind: EMAIL_PURPOSE.EXISTING_ACCOUNT, recipient: user.email }))) {
    console.warn("[email] existing account email not sent: the recipient reached the hourly limit")
    return
  }

  const { locale, resetPasswordUrl, signInUrl } = accountEmailLinks(callbackURL)
  const [messages, linked] = await Promise.all([
    loadNamespace<typeof existingAccountMessages>({ locale, namespace: EXISTING_ACCOUNT_EMAIL_NAMESPACE }),
    db.select({ providerId: account.providerId }).from(account).where(eq(account.userId, user.id)).orderBy(asc(account.providerId)),
  ])

  await sendEmail({
    idempotency: { purpose: EMAIL_PURPOSE.EXISTING_ACCOUNT, token: crypto.randomUUID() },
    react: createElement(ExistingAccountEmail, {
      locale,
      messages,
      name: user.name,
      providers: linked.map(({ providerId }) => providerId),
      resetPasswordUrl,
      signInUrl,
    }),
    subject: createTranslator({ locale, messages })("subject", { appName: APP_NAME }),
    to: user.email,
  })
}
