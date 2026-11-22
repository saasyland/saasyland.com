import { sendChangeEmailConfirmationEmail } from "~/src/modules/account/use-cases/send-change-email-confirmation-email"
import { sendExistingAccountEmail } from "~/src/modules/account/use-cases/send-existing-account-email"
import { sendPasswordChangedEmail } from "~/src/modules/account/use-cases/send-password-changed-email"
import { sendDeleteAccountEmail } from "~/src/modules/user/use-cases/send-delete-account-email"
import { sendResetPasswordEmail } from "~/src/modules/verification/use-cases/send-reset-password-email"
import { sendVerifyEmail } from "~/src/modules/verification/use-cases/send-verify-email"

import type { AuthEmails } from "~/src/data/auth-emails"

export const RESEND_AUTH_EMAILS = {
  sendChangeEmailConfirmation: sendChangeEmailConfirmationEmail,
  sendDeleteAccount: sendDeleteAccountEmail,
  sendExistingAccount: sendExistingAccountEmail,
  sendPasswordChanged: sendPasswordChangedEmail,
  sendResetPassword: sendResetPasswordEmail,
  sendVerification: sendVerifyEmail,
} as const satisfies AuthEmails
