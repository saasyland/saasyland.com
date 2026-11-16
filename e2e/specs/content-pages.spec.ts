import type { Locator, Page } from "@playwright/test"

import { NEWSLETTER_TOKEN_LENGTH } from "../../src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import { ROUTES } from "../../src/routes"
import common from "../../messages/en-US/common.json" with { type: "json" }
import confirm from "../../messages/en-US/pages.newsletter.confirm.json" with { type: "json" }
import landing from "../../messages/en-US/pages.landing.json" with { type: "json" }
import { expect, test } from "../fixtures/test"
import { APP_NAVIGATION_WAIT_UNTIL, BasePage } from "../pages/base-page"

const CONTENT_PAGES = [
  ROUTES.BLOG,
  ROUTES.COURSES,
  ROUTES.NEWSLETTER_CONFIRM,
  ROUTES.NEWSLETTER_UNSUBSCRIBE,
  ROUTES.PRIVACY,
  ROUTES.TERMS,
  ROUTES.REFUNDS,
  ROUTES.LICENCE,
  ROUTES.AFFILIATES,
  "/this-page-does-not-exist",
]

const TOKEN = "a".repeat(NEWSLETTER_TOKEN_LENGTH)

const visit = async (page: Page, path: string): Promise<void> => {
  await page.goto(path, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await new BasePage(page).waitForAppReady()
}

const typeAndPlace = async (heading: Locator) =>
  heading.evaluate((element) => {
    const { fontFamily, fontSize, fontWeight, letterSpacing, lineHeight } = getComputedStyle(element)
    const { left, top } = element.getBoundingClientRect()
    return { fontFamily, fontSize, fontWeight, left: Math.round(left), letterSpacing, lineHeight, top: Math.round(top + window.scrollY) }
  })

const buttonShape = async (button: Locator) =>
  button.evaluate((element) => {
    const { borderRadius, fontSize, fontWeight, paddingLeft, paddingRight } = getComputedStyle(element)
    return { borderRadius, fontSize, fontWeight, height: Math.round(element.getBoundingClientRect().height), paddingLeft, paddingRight }
  })

test("every content page sets its title in the same type at the same place", async ({ page }) => {
  const titles = new Map<string, Awaited<ReturnType<typeof typeAndPlace>>>()
  for (const path of CONTENT_PAGES) {
    await visit(page, path)
    titles.set(path, await typeAndPlace(page.getByRole("heading", { level: 1 })))
  }

  const [first] = titles.values()
  for (const [path, title] of titles) {
    expect(title, path).toStrictEqual(first)
  }
})

test("the primary call to action has one size on the landing page, the not-found page and the newsletter pages", async ({ page }) => {
  await visit(page, ROUTES.HOME)
  const landingButton = await buttonShape(page.getByRole("main").getByRole("link", { exact: true, name: landing.hero.ctaPrimary }).first())

  await visit(page, "/this-page-does-not-exist")
  const notFoundButton = await buttonShape(page.getByRole("main").getByRole("link", { exact: true, name: common.backHome }))

  await visit(page, `${ROUTES.NEWSLETTER_CONFIRM}?token=${TOKEN}`)
  const newsletterButton = await buttonShape(page.getByRole("button", { exact: true, name: confirm.prompt.action }))

  expect(notFoundButton).toStrictEqual(landingButton)
  expect(newsletterButton).toStrictEqual(landingButton)
})

test("the spent newsletter link offers the same way home as the not-found page", async ({ page }) => {
  await visit(page, ROUTES.NEWSLETTER_CONFIRM)

  await expect(page.getByRole("heading", { exact: true, level: 1, name: confirm.expired.title })).toBeVisible()
  await expect(page.getByRole("main").getByRole("link", { exact: true, name: common.backHome })).toHaveAttribute("href", ROUTES.HOME)
})
