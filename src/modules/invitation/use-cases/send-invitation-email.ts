import "@tanstack/react-start/server-only"

import { createElement } from "react"

import { getRequest } from "@tanstack/react-start/server"
import { createTranslator } from "use-intl"

import type { Role } from "~/src/integrations/better-auth/auth.roles"
import { sendEmail } from "~/src/integrations/resend/resend.utils"
import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"
import { localizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { INVITATION_EMAIL_PURPOSE } from "~/src/modules/invitation/invitation.constants"

import { withinRecipientRateLimit } from "~/src/lib/rate-limit"

import type invitationMessages from "~/messages/en-US/emails.invitation-email.json"
import { APP_NAME } from "~/src/presentation/branding"
import { INVITATION_EMAIL_NAMESPACE, InvitationEmail } from "~/src/presentation/emails/invitation-email"
import * as ROUTES from "~/src/routes"

interface InvitationEmailInput {
  readonly email: string
  readonly inviter: string
  readonly locale: SupportedLocale
  readonly role: Role
  readonly token: string
}

export const sendInvitationEmail = async ({ email, inviter, locale, role, token }: InvitationEmailInput): Promise<void> => {
  if (!(await withinRecipientRateLimit({ kind: INVITATION_EMAIL_PURPOSE.INVITATION, recipient: email }))) {
    throw new AppError(ERROR_CODES.TOO_MANY_REQUESTS)
  }

  const acceptUrl = new URL(localizePathname({ locale, pathname: ROUTES.ACCEPT_INVITATION }), getRequest().url)
  acceptUrl.searchParams.set("token", token)
  const messages = await loadNamespace<typeof invitationMessages>({ locale, namespace: INVITATION_EMAIL_NAMESPACE })

  await sendEmail({
    idempotency: { purpose: INVITATION_EMAIL_PURPOSE.INVITATION, token },
    react: createElement(InvitationEmail, { acceptUrl: acceptUrl.toString(), inviter, locale, messages, role }),
    subject: createTranslator({ locale, messages })("subject", { appName: APP_NAME }),
    to: email,
  })
}
