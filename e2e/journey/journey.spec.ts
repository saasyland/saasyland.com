import assert from "node:assert/strict"

import type { APIRequestContext, Page, TestInfo } from "@playwright/test"
import type { models } from "@polar-sh/sdk/2026-10"
import * as zod from "zod"

import { expect, test as base } from "../fixtures/auth"
import type { AuthPage, BasePage } from "../pages"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

import { POLAR_ORDER_STATUS } from "../../src/integrations/polar/polar.constants"
import { I18N } from "../../src/integrations/use-intl/i18n.config"
import { toMinorUnits } from "../../src/modules/_core/constants/currency"
import { CURRENCY_FORMAT, DEFAULT_CURRENCY_CODE } from "../../src/modules/_core/constants/pricing"
import { PPP_PERCENT, pppMultiplierKey } from "../../src/modules/license/license.pricing"
import { LICENSE_ACTIVATION_LIMITS, LICENSE_TIER, LICENSE_TIERS, type LicenseTier } from "../../src/modules/license/license.constants"

import {
  CLI_COMMAND,
  CLI_CREDENTIALS_FILE_MODE,
  CLI_EXIT_CODE,
  CLI_LICENSE_COMMANDS,
  CLI_LICENSE_KEY_VARIABLE,
  cliCommand,
} from "../../src/data/cli"
import { TIER_PRICES } from "../../src/data/marketing"

import { CLI_ERROR, CLI_RESULT, type Machine, createMachine, runCli, storedCredentials } from "./cli"
import { inboxAddress, verificationLink } from "./inbox"
import { POLAR_SANDBOX_CHECKOUT, PolarCheckoutPage } from "./polar-checkout-page"
import { accountOrders, refundOrder, refundPaidOrders } from "./sandbox"
import { PRODUCT_IDS } from "./settings"

interface Buyer {
  readonly email: string
  readonly name: string
  readonly tier: LicenseTier
  readonly userId: string
}

interface Pages {
  readonly appPage: BasePage
  readonly page: Page
}

interface Machines {
  readonly ci: readonly Machine[]
  readonly overflow: Machine
  readonly workstation: Machine
}

interface JourneyFixtures {
  buyers: Set<string>
}

const TIER_NAMES = {
  [LICENSE_TIER.AGENCY]: "Agency",
  [LICENSE_TIER.COMPLETE]: "Complete",
  [LICENSE_TIER.CORE]: "Core",
} as const satisfies Record<LicenseTier, string>

const RUN = crypto.randomUUID().slice(0, 8)
const WEBHOOK_TIMEOUT_MS = 120_000
const WORKSTATION_SLOT = 1
const LICENCE_KEY = /^SAASYLAND(?:-[\dA-F]+)+$/u
const RUNNER_COUNTRY = /^loc=(?<country>[A-Z]{2})$/mu

const sessionSchema = zod.object({ user: zod.object({ id: zod.string() }) })

const test = base.extend<JourneyFixtures>({
  buyers: async ({}, use) => {
    const buyers = new Set<string>()
    await use(buyers)
    await Promise.all([...buyers].map(async (userId) => refundPaidOrders(userId)))
  },
})

const formatPrice = (amount: number): string => new Intl.NumberFormat(I18N.DEFAULT_LOCALE, CURRENCY_FORMAT).format(amount)

const regionalPrice = async (request: APIRequestContext, tier: LicenseTier): Promise<number> => {
  const trace = await (await request.get("/cdn-cgi/trace")).text()

  return (TIER_PRICES[tier] * pppMultiplierKey(RUNNER_COUNTRY.exec(trace)?.groups?.["country"])) / PPP_PERCENT
}

const ciRepository = (tier: LicenseTier, slot: number): string => `journey/${RUN}/${tier}/${String(slot)}`

const usage = (used: number, tier: LicenseTier): string => `${String(used)} of ${String(LICENSE_ACTIVATION_LIMITS[tier])} in use`

const openLicence = async ({ appPage, page }: Pages): Promise<void> => {
  await page.goto("/app/license", { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
}

const signUp = async ({ authPage, page }: { authPage: AuthPage; page: Page }, tier: LicenseTier): Promise<Buyer> => {
  const email = inboxAddress(`journey-${RUN}-${tier}`)
  const name = `Journey ${TIER_NAMES[tier]}`
  const password = `${crypto.randomUUID()}-Journey!`

  await authPage.gotoSignUp()
  await authPage.waitForHydration(page.getByRole("main"))
  await authPage.nameField().fill(name)
  await authPage.emailField().fill(email)
  await authPage.signUpPasswordField().fill(password)
  await authPage.confirmPasswordField().fill(password)
  await authPage.signUpSubmitButton().click()
  await expect(page).toHaveURL(/\/auth\/verify-email\?email=/u)

  await page.goto((await verificationLink(email)).toString(), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await expect(page).toHaveURL(/\/app\/?$/u)
  const { user } = sessionSchema.parse(await (await page.request.get("/api/auth/get-session")).json())

  return { email, name, tier, userId: user.id }
}

const buy = async (pages: Pages, buyer: Buyer, price: number): Promise<void> => {
  const { appPage, page } = pages
  await openLicence(pages)
  const offer = page.getByRole("region", { name: "Get your licence" })
  await expect(offer).toContainText(formatPrice(price), { useInnerText: true })

  await offer.getByRole("button", { name: `Get ${TIER_NAMES[buyer.tier]}`, exact: true }).click()
  await page.waitForURL(POLAR_SANDBOX_CHECKOUT)
  await new PolarCheckoutPage(page).pay(buyer)

  await page.waitForURL(/\/app\?checkoutId=/u, { timeout: WEBHOOK_TIMEOUT_MS })
  await appPage.waitForAppReady()
  await expect(page.getByRole("heading", { name: "Your licence is active" })).toBeVisible({ timeout: WEBHOOK_TIMEOUT_MS })
  await expect(page.getByText(`Thank you for buying ${TIER_NAMES[buyer.tier]}.`)).toBeVisible()
}

const paidOrder = async ({ tier, userId }: Buyer, price: number): Promise<models.Order> => {
  const [order, ...others] = await accountOrders(userId)
  assert(order !== undefined)
  expect(others).toEqual([])
  expect(order).toMatchObject({
    product_id: PRODUCT_IDS[tier],
    status: POLAR_ORDER_STATUS.PAID,
    subtotal_amount: toMinorUnits(TIER_PRICES[tier], DEFAULT_CURRENCY_CODE),
  })
  expect(order.subtotal_amount - order.discount_amount).toBe(toMinorUnits(price, DEFAULT_CURRENCY_CODE))

  return order
}

const issuedKey = async (pages: Pages, tier: LicenseTier): Promise<string> => {
  const { page } = pages
  const key = page.getByText(LICENCE_KEY)
  await expect(async () => {
    await openLicence(pages)
    await expect(key).toBeVisible()
  }).toPass({ timeout: WEBHOOK_TIMEOUT_MS })

  await expect(page.getByRole("heading", { exact: true, level: 2, name: TIER_NAMES[tier] })).toBeVisible()
  await expect(page.getByText("Activate the key with the SaaSy Land CLI on each machine you build on. Keep the key private.")).toBeVisible()
  await Promise.all(CLI_LICENSE_COMMANDS.map((command) => expect(page.getByText(cliCommand(command), { exact: true })).toBeVisible()))
  await expect(page.getByText(`In CI, store the key as a secret in ${CLI_LICENSE_KEY_VARIABLE}.`)).toBeVisible()
  await expect(page.getByText(usage(0, tier))).toBeVisible()
  await expect(page.getByText("No machines have used this key yet.")).toBeVisible()

  return zod
    .string()
    .regex(LICENCE_KEY)
    .parse(await key.textContent())
}

const machines = async (
  testInfo: TestInfo,
  { key, origin, tier }: { key: string; origin: string; tier: LicenseTier },
): Promise<Machines> => {
  const npmCache = testInfo.outputPath("npm-cache")
  const limit = LICENSE_ACTIVATION_LIMITS[tier]
  const ciMachine = async (slot: number): Promise<Machine> =>
    createMachine({
      apiUrl: origin,
      home: testInfo.outputPath("machines", `ci-${String(slot)}`),
      licenseKey: key,
      npmCache,
      repository: ciRepository(tier, slot),
    })

  return {
    ci: await Promise.all(Array.from({ length: limit - WORKSTATION_SLOT }, async (_, index) => ciMachine(WORKSTATION_SLOT + index + 1))),
    overflow: await ciMachine(limit + 1),
    workstation: await createMachine({ apiUrl: origin, home: testInfo.outputPath("machines", "workstation"), npmCache }),
  }
}

for (const tier of LICENSE_TIERS) {
  const limit = LICENSE_ACTIVATION_LIMITS[tier]
  const label = `Journey ${TIER_NAMES[tier]} workstation`

  test(`${TIER_NAMES[tier]}: pays in the Polar sandbox, uses its ${String(limit)} machines with the published CLI and loses the key to a refund`, async ({
    appPage,
    authPage,
    baseURL,
    buyers,
    page,
    request,
  }, testInfo) => {
    const pages = { appPage, page }
    const price = await regionalPrice(request, tier)
    const buyer = await test.step("sign up and verify the email address", async () => signUp({ authPage, page }, tier))
    buyers.add(buyer.userId)

    await test.step("pay the regional price with the Stripe test card", async () => buy(pages, buyer, price))
    const order = await test.step("Polar records the order of the tier", async () => paidOrder(buyer, price))
    const key = await test.step("the webhooks issue the key on /app/license", async () => issuedKey(pages, tier))
    const { ci, overflow, workstation } = await machines(testInfo, { key, origin: String(baseURL), tier })

    const activationId = await test.step("activate this machine with the key", async () => {
      expect(await runCli(workstation, [CLI_COMMAND.ACTIVATE, key, "--label", label])).toMatchObject({
        exitCode: CLI_EXIT_CODE.SUCCESS,
        output: { license: { machineLimit: limit, machinesUsed: WORKSTATION_SLOT, tier }, result: CLI_RESULT.ACTIVATED },
      })
      const stored = await storedCredentials(workstation)
      assert(stored !== undefined)
      expect(stored).toMatchObject({ credentials: { key }, mode: CLI_CREDENTIALS_FILE_MODE })

      return stored.credentials.activationId
    })

    await test.step("activating again keeps the same slot, and whoami shows it", async () => {
      expect(await runCli(workstation, [CLI_COMMAND.ACTIVATE])).toMatchObject({
        exitCode: CLI_EXIT_CODE.SUCCESS,
        output: { activationId, license: { machinesUsed: WORKSTATION_SLOT }, result: CLI_RESULT.ALREADY_ACTIVATED },
      })
      expect(await runCli(workstation, [CLI_COMMAND.WHOAMI])).toMatchObject({
        exitCode: CLI_EXIT_CODE.SUCCESS,
        output: {
          activationId,
          license: { machineLimit: limit, machinesUsed: WORKSTATION_SLOT, tier },
          machines: [{ current: true, id: activationId, label }],
          result: CLI_RESULT.LICENSE_ACTIVE,
        },
      })
    })

    await test.step(`CI machines fill the ${String(limit)} slots and the next one is refused`, async () => {
      for (const [index, machine] of ci.entries()) {
        expect(await runCli(machine, [CLI_COMMAND.ACTIVATE])).toMatchObject({
          exitCode: CLI_EXIT_CODE.SUCCESS,
          output: { license: { machinesUsed: WORKSTATION_SLOT + index + 1 }, result: CLI_RESULT.ACTIVATED },
        })
      }
      expect(await runCli(overflow, [CLI_COMMAND.ACTIVATE])).toMatchObject({
        exitCode: CLI_EXIT_CODE.NO_PERMISSION,
        output: {
          api: { code: CLI_ERROR.ACTIVATION_LIMIT_REACHED, license: { machineLimit: limit, machinesUsed: limit, tier } },
          reason: CLI_ERROR.ACTIVATION_LIMIT_REACHED,
        },
      })
      expect(await storedCredentials(overflow)).toBeUndefined()
    })

    await test.step("free a CI slot on /app/license, and the refused machine takes it", async () => {
      const freed = ci.at(-1)
      assert(freed !== undefined)
      await openLicence(pages)
      await expect(page.getByText(usage(limit, tier))).toBeVisible()
      await expect(page.getByText(label, { exact: true })).toBeVisible()

      await page
        .getByRole("listitem")
        .filter({ has: page.getByText(`CI ${ciRepository(tier, limit)}`, { exact: true }) })
        .getByRole("button", { name: "Free this slot" })
        .click()
      await expect(page.getByText("Slot freed.")).toBeVisible()
      await expect(page.getByText(usage(limit - 1, tier))).toBeVisible()

      expect(await runCli(freed, [CLI_COMMAND.WHOAMI])).toMatchObject({
        exitCode: CLI_EXIT_CODE.NO_PERMISSION,
        output: { reason: CLI_ERROR.ACTIVATION_NOT_FOUND },
      })
      expect(await runCli(overflow, [CLI_COMMAND.ACTIVATE])).toMatchObject({
        exitCode: CLI_EXIT_CODE.SUCCESS,
        output: { license: { machinesUsed: limit }, result: CLI_RESULT.ACTIVATED },
      })
    })

    await test.step("deactivate frees this machine and removes its credentials", async () => {
      expect(await runCli(workstation, [CLI_COMMAND.DEACTIVATE])).toMatchObject({
        exitCode: CLI_EXIT_CODE.SUCCESS,
        output: { activationId, license: { machinesUsed: limit - 1 }, result: CLI_RESULT.DEACTIVATED },
      })
      expect(await storedCredentials(workstation)).toBeUndefined()
      expect(await runCli(workstation, [CLI_COMMAND.WHOAMI])).toMatchObject({
        exitCode: CLI_EXIT_CODE.NO_PERMISSION,
        output: { reason: CLI_ERROR.NOT_ACTIVATED },
      })
    })

    await test.step("a refund in the Polar sandbox stops the key and removes the credentials", async () => {
      await refundOrder(order)
      await expect(async () => {
        await openLicence(pages)
        await expect(
          page.getByText("This licence was refunded, so its key no longer works. Write to us if that looks wrong."),
        ).toBeVisible()
      }).toPass({ timeout: WEBHOOK_TIMEOUT_MS })
      expect(await accountOrders(buyer.userId)).toMatchObject([{ status: POLAR_ORDER_STATUS.REFUNDED }])

      expect(await runCli(overflow, [CLI_COMMAND.WHOAMI])).toMatchObject({
        exitCode: CLI_EXIT_CODE.NO_PERMISSION,
        output: { reason: CLI_ERROR.LICENSE_REFUNDED },
      })
      expect(await storedCredentials(overflow)).toBeUndefined()
    })
  })
}
