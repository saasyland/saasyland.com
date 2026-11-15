import { sendChangeEmailConfirmationEmail } from "~/src/modules/account/use-cases/send-change-email-confirmation-email"
import { sendResetPasswordEmail } from "~/src/modules/verification/use-cases/send-reset-password-email"
import { sendVerifyEmail } from "~/src/modules/verification/use-cases/send-verify-email"

import type { AuthEmails } from "~/src/data/auth-emails"

export const RESEND_AUTH_EMAILS = {
  sendChangeEmailConfirmation: sendChangeEmailConfirmationEmail,
  sendResetPassword: sendResetPasswordEmail,
  sendVerification: sendVerifyEmail,
} as const satisfies AuthEmails
