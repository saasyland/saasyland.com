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

interface DeleteAccount {
  readonly token: string
  readonly url: string
  readonly user: Recipient
}

interface AccountHolder extends Recipient {
  readonly id: string
}

interface ExistingAccount {
  readonly callbackURL: string
  readonly user: AccountHolder
}

interface PasswordChanged {
  readonly callbackURL: string
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
  readonly sendDeleteAccount: (email: DeleteAccount) => Promise<void>
  readonly sendExistingAccount: (email: ExistingAccount) => Promise<void>
  readonly sendPasswordChanged: (email: PasswordChanged) => Promise<void>
  readonly sendResetPassword: (email: ResetPassword) => Promise<void>
  readonly sendVerification: (email: Verification) => Promise<void>
}

const AREAS: readonly AuthEmails[] = Object.values(AREA_AUTH_EMAILS)

export const AUTH_EMAILS: AuthEmails = {
  sendChangeEmailConfirmation: async (email) => {
    await Promise.all(AREAS.map((area) => area.sendChangeEmailConfirmation(email)))
  },
  sendDeleteAccount: async (email) => {
    await Promise.all(AREAS.map((area) => area.sendDeleteAccount(email)))
  },
  sendExistingAccount: async (email) => {
    await Promise.all(AREAS.map((area) => area.sendExistingAccount(email)))
  },
  sendPasswordChanged: async (email) => {
    await Promise.all(AREAS.map((area) => area.sendPasswordChanged(email)))
  },
  sendResetPassword: async (email) => {
    await Promise.all(AREAS.map((area) => area.sendResetPassword(email)))
  },
  sendVerification: async (email) => {
    await Promise.all(AREAS.map((area) => area.sendVerification(email)))
  },
}
