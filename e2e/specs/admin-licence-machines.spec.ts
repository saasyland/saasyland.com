import type { Page } from "@playwright/test"

import { createTranslator } from "use-intl"

import { I18N } from "../../src/integrations/use-intl/i18n.config"
import { LICENSE_ACTIVATION_LIMITS } from "../../src/modules/license/license.constants"
import { ROUTES } from "../../src/routes"
import { TEST_ACCOUNTS } from "../data/accounts"
import { TEST_COURSE, TEST_LESSONS } from "../data/courses"
import { TEST_MACHINES_LICENSE, TEST_TIER_LICENSES } from "../data/licenses"
import { expect, test } from "../fixtures/auth"
import type { AuthPage } from "../pages"
import type { BasePage } from "../pages/base-page"
import customersMessages from "../../messages/en-US/pages.admin.customers.json" with { type: "json" }
import licenseMessages from "../../messages/en-US/pages.admin.users.license.json" with { type: "json" }

const [admin] = TEST_ACCOUNTS
const { activations } = licenseMessages
const { user: licensee } = TEST_MACHINES_LICENSE
const [, , paidLesson] = TEST_LESSONS
const [unreadable] = TEST_TIER_LICENSES

const t = createTranslator({ locale: I18N.DEFAULT_LOCALE, messages: licenseMessages })
const machinesInUse = t("activations.count", {
  limit: LICENSE_ACTIVATION_LIMITS[TEST_MACHINES_LICENSE.tier],
  used: TEST_MACHINES_LICENSE.activations.length,
})

const signInAsAdmin = async ({ appPage, authPage, page }: { appPage: BasePage; authPage: AuthPage; page: Page }): Promise<void> => {
  await authPage.signIn(admin.email)
  await expect(page).toHaveURL(/\/admin\/?$/u)
  await appPage.waitForAppReady()
}

test("the customers tab and the profile show the machines a licence has activated in Polar, with their system", async ({
  appPage,
  authPage,
  page,
}) => {
  await signInAsAdmin({ appPage, authPage, page })
  await page.goto(ROUTES.ADMIN_USERS_CUSTOMERS)
  await appPage.waitForAppReady()

  await page.getByRole("searchbox", { name: customersMessages.search }).fill(licensee.email)
  const row = page.getByRole("table").locator("tbody tr")
  await expect(row).toHaveCount(1)
  await row.getByRole("button", { name: machinesInUse }).click()
  const popover = page.getByRole("dialog", { name: activations.title })
  for (const { label, platform } of TEST_MACHINES_LICENSE.activations) {
    await expect(popover.getByRole("listitem").filter({ hasText: label })).toContainText(activations.platforms[platform])
  }
  await page.keyboard.press("Escape")

  await row.getByRole("link", { exact: true, name: licensee.name }).click()
  await expect(page).toHaveURL(`${ROUTES.ADMIN_USERS}/${licensee.id}`)
  const machines = page.getByRole("region", { name: activations.title })
  await expect(machines).toContainText(machinesInUse)
  await expect(machines.getByRole("listitem")).toHaveText(
    TEST_MACHINES_LICENSE.activations.map(({ label, platform }) => new RegExp(`${label}${activations.platforms[platform]}`, "u")),
  )
})

test("a licence whose key Polar does not answer for keeps its card and says Polar could not be reached", async ({ appPage, authPage, page }) => {
  await signInAsAdmin({ appPage, authPage, page })
  await page.goto(`${ROUTES.ADMIN_USERS}/${unreadable.user.id}`)
  await appPage.waitForAppReady()

  const machines = page.getByRole("region", { name: activations.title })
  await expect(machines.getByRole("status")).toContainText(activations.unavailable.title)
  await expect(page.getByText(licenseMessages.details.machineLimit, { exact: true })).toBeVisible()
})

test("the profile's licence card names the first paid lesson the licence opened and its course", async ({ appPage, authPage, page }) => {
  await signInAsAdmin({ appPage, authPage, page })
  await page.goto(`${ROUTES.ADMIN_USERS}/${licensee.id}`)
  await appPage.waitForAppReady()

  const firstLesson = page.getByText(licenseMessages.details.firstLesson, { exact: true }).locator("xpath=following-sibling::dd")
  await expect(firstLesson).toContainText(paidLesson.title[I18N.DEFAULT_LOCALE])
  await expect(firstLesson).toContainText(TEST_COURSE.title[I18N.DEFAULT_LOCALE])
})
