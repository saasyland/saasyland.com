import { type Locator, type Page, expect } from "@playwright/test"

export const POLAR_SANDBOX_CHECKOUT = /^https:\/\/sandbox\.polar\.sh\/checkout\//u

const TEST_CARD = { cvc: "123", number: "4242 4242 4242 4242" } as const
const CARD_VALID_FOR_YEARS = 5
const TWO_DIGITS = 100
const BILLING_COUNTRY = "Poland"
const SUBMIT_TIMEOUT_MS = 5000
const PAYMENT_TIMEOUT_MS = 60_000

const expiry = (): string => `12 / ${String((new Date().getFullYear() + CARD_VALID_FOR_YEARS) % TWO_DIGITS).padStart(2, "0")}`

export class PolarCheckoutPage {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async pay({ email, name }: { readonly email: string; readonly name: string }): Promise<void> {
    const card = this.page.locator('iframe[title="Secure payment input frame"]:not([aria-hidden="true"])').contentFrame()

    await expect(this.page.getByRole("textbox", { name: "Email" })).toHaveValue(email)
    await this.billingCountry().click()
    await this.page.keyboard.type(BILLING_COUNTRY)
    await this.page.getByRole("option", { name: BILLING_COUNTRY, exact: true }).click()
    await card.getByRole("textbox", { name: "Card number" }).fill(TEST_CARD.number)
    await card.getByRole("textbox", { name: /^Expiration/u }).fill(expiry())
    await card.getByRole("textbox", { name: "Security code" }).fill(TEST_CARD.cvc)
    await this.page.getByRole("textbox", { name: "Cardholder name" }).fill(name)
    await expect(async () => {
      await this.page.getByRole("button", { name: "Pay now" }).click({ timeout: SUBMIT_TIMEOUT_MS })
      await expect(this.page.getByText(/^(?:Processing payment|Payment successful)/u)).toBeVisible({ timeout: SUBMIT_TIMEOUT_MS })
    }).toPass({ timeout: PAYMENT_TIMEOUT_MS })
  }

  private billingCountry(): Locator {
    return this.page.getByRole("combobox").last()
  }
}
