import type { Locator } from "@playwright/test"

import { TEST_PASSWORD } from "../data/accounts"
import { BasePage } from "./base-page"

export class AuthPage extends BasePage {
  async signIn(email: string): Promise<void> {
    await this.page.setExtraHTTPHeaders({ "CF-Connecting-IP": `2001:db8:${crypto.randomUUID().slice(0, 4)}::` })
    await this.gotoSignIn()
    await this.emailField().fill(email)
    await this.passwordField().fill(TEST_PASSWORD)
    await this.signInSubmitButton().click()
  }

  async signUp(email: string, password: string, path = "/auth/sign-up"): Promise<void> {
    await this.open(path)
    await this.nameField().fill("Test User")
    await this.emailField().fill(email)
    await this.signUpPasswordField().fill(password)
    await this.signUpSubmitButton().click()
  }

  async gotoSignIn(localePrefix = ""): Promise<void> {
    await this.open(`${localePrefix}/auth/sign-in`)
  }

  async gotoSignUp(localePrefix = ""): Promise<void> {
    await this.open(`${localePrefix}/auth/sign-up`)
  }

  async gotoForgotPassword(localePrefix = ""): Promise<void> {
    await this.open(`${localePrefix}/auth/forgot-password`)
  }

  async gotoResetPassword(localePrefix = "", query = ""): Promise<void> {
    await this.open(`${localePrefix}/auth/reset-password${query}`)
  }

  async gotoVerifyEmail(localePrefix = "", query = ""): Promise<void> {
    await this.open(`${localePrefix}/auth/verify-email${query}`)
  }

  async gotoTwoFactor(localePrefix = ""): Promise<void> {
    await this.open(`${localePrefix}/auth/two-factor`)
  }

  heading(): Locator {
    return this.page.getByRole("heading", { level: 1 })
  }

  emailField(): Locator {
    return this.page.getByRole("textbox", { name: /email/iu })
  }

  passwordField(): Locator {
    return this.page.locator("#sign-in-password")
  }

  signInSubmitButton(): Locator {
    return this.page.getByTestId("sign-in-form-submit-button")
  }

  nameField(): Locator {
    return this.page.getByRole("textbox", { name: /name/iu })
  }

  signUpPasswordField(): Locator {
    return this.page.locator("#sign-up-password")
  }

  signUpSubmitButton(): Locator {
    return this.page.locator("#sign-up-form-submit-button")
  }

  oauthGitHubButton(): Locator {
    return this.page.getByRole("button", { name: /continue with github/iu })
  }

  oauthGoogleButton(): Locator {
    return this.page.getByRole("button", { name: /continue with google/iu })
  }

  twoFactorSubmitButton(): Locator {
    return this.page.getByTestId("two-factor-form-submit-button")
  }

  verifyEmailResendButton(): Locator {
    return this.page.getByTestId("email-link-resend-button")
  }

  resetPasswordSubmitButton(): Locator {
    return this.page.getByTestId("reset-password-form-submit-button")
  }

  requestNewResetLink(): Locator {
    return this.page.getByRole("link", { name: /request a new reset link/iu })
  }
}
