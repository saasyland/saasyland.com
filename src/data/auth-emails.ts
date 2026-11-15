import * as AREA_AUTH_EMAILS from "~/src/data/auth-emails.entries"

interface Recipient {
  readonly email: string
  readonly name: string
}

interface ChangeEmailConfirmation {
  readonly newEmail: string
  readonly token: string
  readonly url: string
  readonly user: Recipient
}

interface ResetPassword {
  readonly token: string
  readonly url: string
  readonly user: Recipient
}

interface Verification {
  readonly callbackURL: string
  readonly token: string
  readonly user: Recipient
}

export interface AuthEmails {
  readonly sendChangeEmailConfirmation: (email: ChangeEmailConfirmation) => Promise<void>
  readonly sendResetPassword: (email: ResetPassword) => Promise<void>
  readonly sendVerification: (email: Verification) => Promise<void>
}

const AREAS: readonly AuthEmails[] = Object.values(AREA_AUTH_EMAILS)

export const AUTH_EMAILS: AuthEmails = {
  sendChangeEmailConfirmation: async (email) => {
    await Promise.all(AREAS.map((area) => area.sendChangeEmailConfirmation(email)))
  },
  sendResetPassword: async (email) => {
    await Promise.all(AREAS.map((area) => area.sendResetPassword(email)))
  },
  sendVerification: async (email) => {
    await Promise.all(AREAS.map((area) => area.sendVerification(email)))
  },
}
