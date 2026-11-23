import "@tanstack/react-start/server-only"

import { createElement } from "react"

import { createTranslator } from "use-intl"

import { sendEmail } from "~/src/integrations/resend/resend.utils"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import { WITHDRAWAL_EMAIL_PURPOSE } from "~/src/modules/withdrawal/withdrawal.constants"
import type { Withdrawal } from "~/src/modules/withdrawal/withdrawal.types"

import type acknowledgementMessages from "~/messages/en-US/emails.withdrawal-acknowledgement-email.json"
import {
  WITHDRAWAL_ACKNOWLEDGEMENT_EMAIL_NAMESPACE,
  WithdrawalAcknowledgementEmail,
} from "~/src/presentation/emails/withdrawal-acknowledgement-email"

export const sendWithdrawalAcknowledgement = async (statement: Withdrawal["select"]): Promise<void> => {
  const { locale } = statement
  const messages = await loadNamespace<typeof acknowledgementMessages>({ locale, namespace: WITHDRAWAL_ACKNOWLEDGEMENT_EMAIL_NAMESPACE })

  await sendEmail({
    idempotency: { purpose: WITHDRAWAL_EMAIL_PURPOSE.WITHDRAWAL_ACKNOWLEDGEMENT, token: statement.id },
    react: createElement(WithdrawalAcknowledgementEmail, { locale, messages, statement }),
    subject: createTranslator({ locale, messages })("subject"),
    to: statement.email,
  })
}
