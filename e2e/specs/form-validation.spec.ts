import type { Locator, Page } from "@playwright/test"

import { PASSWORD_MIN_LENGTH } from "../../src/integrations/better-auth/auth.constraints"
import { ROUTES } from "../../src/routes"
import { BREACHED_PASSWORD } from "../data/accounts"
import { expect, test } from "../fixtures/auth"

import validations from "../../messages/en-US/auth.validations.json" with { type: "json" }

const VALID_PASSWORD = "correct horse battery staple"
const PASSWORD_TOO_SHORT = validations.passwordMinLength.replace("{min}", String(PASSWORD_MIN_LENGTH))

const continueTyping = async (field: Locator, text: string): Promise<void> => {
  await field.focus()
  await field.evaluate((input: HTMLInputElement) => {
    input.setSelectionRange(input.value.length, input.value.length)
  })
  await field.pressSequentially(text)
}

const requirementsList = (page: Page) => page.getByRole("list", { name: validations.requirementsListLabel, exact: true })

const signUpUrl = new RegExp(`${ROUTES.AUTH.SIGN_UP}$`, "u")

test.describe("form validation timing", () => {
  test("a password being typed updates the requirement live but is reported only after the visitor leaves it", async ({
    authPage,
    page,
  }) => {
    await authPage.gotoSignUp()
    const password = authPage.signUpPasswordField()
    const met = requirementsList(page).getByText(validations.requirementMet, { exact: true })

    await password.pressSequentially("correct")

    await expect(met).toHaveCount(0)
    await expect(password).toHaveAttribute("aria-invalid", "false")
    await expect(page.getByText(PASSWORD_TOO_SHORT, { exact: true })).toHaveCount(0)

    await password.blur()

    await expect(password).toHaveAttribute("aria-invalid", "true")
    await expect(page.getByText(PASSWORD_TOO_SHORT, { exact: true })).toBeVisible()

    await continueTyping(password, " horse battery")

    await expect(password).toHaveAttribute("aria-invalid", "false")
    await expect(page.getByText(PASSWORD_TOO_SHORT, { exact: true })).toHaveCount(0)
    await expect(met).toHaveCount(1)
  })

  test("Continue stays enabled, and pressing it with mistakes reveals every error and focuses the first field", async ({
    authPage,
    page,
  }) => {
    await authPage.gotoSignUp()
    const submit = authPage.signUpSubmitButton()

    await expect(submit).toBeEnabled()
    await expect(submit).not.toHaveAttribute("aria-disabled")

    await submit.click()

    await expect(page).toHaveURL(signUpUrl)
    for (const message of [validations.nameRequired, validations.emailInvalid, validations.passwordRequired]) {
      await expect(page.getByText(message, { exact: true })).toBeVisible()
    }
    await expect(authPage.nameField()).toBeFocused()
    await expect(authPage.nameField()).toHaveAttribute("aria-invalid", "true")

    await authPage.nameField().fill("Test User")

    await expect(authPage.nameField()).toHaveAttribute("aria-invalid", "false")
    await expect(page.getByText(validations.nameRequired, { exact: true })).toHaveCount(0)
  })

  test("a password that is too short or found in a known data breach is refused under the password field", async ({ authPage, page }) => {
    const id = crypto.randomUUID()
    await page.setExtraHTTPHeaders({ "CF-Connecting-IP": `2001:db8:${id.slice(0, 4)}::` })
    await authPage.gotoSignUp()
    await authPage.nameField().fill("Test User")
    await authPage.emailField().fill(`breached.${id}@example.test`)
    await authPage.signUpPasswordField().fill(BREACHED_PASSWORD.slice(1))

    await authPage.signUpSubmitButton().click()

    await expect(page.getByText(PASSWORD_TOO_SHORT, { exact: true })).toBeVisible()
    await expect(authPage.signUpPasswordField()).toBeFocused()

    await authPage.signUpPasswordField().fill(BREACHED_PASSWORD)
    await authPage.signUpSubmitButton().click()

    await expect(page.getByText(validations.passwordCompromised, { exact: true })).toBeVisible()
    await expect(authPage.signUpPasswordField()).toHaveAttribute("aria-invalid", "true")
    await expect(authPage.signUpPasswordField()).toBeFocused()
    await expect(page).toHaveURL(signUpUrl)

    await continueTyping(authPage.signUpPasswordField(), VALID_PASSWORD)

    await expect(page.getByText(validations.passwordCompromised, { exact: true })).toHaveCount(0)
  })

  test("a misspelt email domain gets a suggestion once the visitor leaves the field", async ({ authPage, page }) => {
    await authPage.gotoSignUp()
    const email = authPage.emailField()

    await email.pressSequentially("ada@gmial.com")

    await expect(page.getByRole("button", { exact: true, name: "ada@gmail.com" })).toHaveCount(0)

    await email.blur()
    await page.getByRole("button", { exact: true, name: "ada@gmail.com" }).click()

    await expect(email).toHaveValue("ada@gmail.com")
  })

  test("sign-in reports an invalid email only after the visitor leaves the field", async ({ authPage, page }) => {
    await authPage.gotoSignIn()
    const email = authPage.emailField()

    await email.pressSequentially("ada")

    await expect(email).toHaveAttribute("aria-invalid", "false")
    await expect(page.getByText(validations.emailInvalid, { exact: true })).toHaveCount(0)

    await email.press("Tab")

    await expect(email).toHaveAttribute("aria-invalid", "true")
    await expect(page.getByText(validations.emailInvalid, { exact: true })).toBeVisible()
  })
})
