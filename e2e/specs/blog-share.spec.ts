import { globSync } from "node:fs"
import { basename } from "node:path"

import type { Page } from "@playwright/test"

import pagesBlog from "../../messages/en-US/pages.blog.json" with { type: "json" }
import { APP_URL } from "../../src/presentation/branding"
import { ROUTES } from "../../src/routes"
import { expect, test } from "../fixtures/test"

const POST = `${ROUTES.BLOG}/${basename(globSync("content/blog/*.en-US.mdx").toSorted()[0] ?? "", ".en-US.mdx")}`
const CANONICAL = `${APP_URL}${POST}`
const { share } = pagesBlog.post
const NETWORKS = [share.targets.x, share.targets.linkedin, share.targets.bluesky, share.targets.hackerNews, share.targets.reddit]
const PHONE = { height: 844, width: 390 }
const SHARE_LISTS = 2
const TRACKING_PARAMETER = /utm_|fbclid|gclid/u

const stubNativeShare = (): void => {
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: (data: ShareData) => {
      document.documentElement.dataset["shared"] = JSON.stringify(data)
      return Promise.resolve()
    },
  })
}

const removeNativeShare = (): void => {
  Reflect.deleteProperty(Navigator.prototype, "share")
}

const shareListPlacement = async (page: Page) => {
  const [list, title] = await Promise.all([
    page.getByRole("list", { name: share.label }).first().boundingBox(),
    page.getByRole("heading", { level: 1 }).boundingBox(),
  ])

  return { height: list?.height, left: list?.x, top: (list?.y ?? 0) - (title?.y ?? 0), width: list?.width }
}

test("shares the post's canonical URL on every network from under the title and from the end of the article", async ({ appPage, page }) => {
  await page.goto(POST)
  await appPage.waitForAppReady()
  await expect(page.getByRole("list", { name: share.label })).toHaveCount(SHARE_LISTS)

  for (const name of NETWORKS) {
    const links = page.getByRole("link", { name })
    await expect(links).toHaveCount(SHARE_LISTS)
    for (const link of await links.all()) {
      const href = (await link.getAttribute("href")) ?? ""
      await expect(link).toHaveAttribute("target", "_blank")
      await expect(link).toHaveAttribute("rel", "noopener noreferrer")
      expect(decodeURIComponent(href)).toContain(CANONICAL)
      expect(href).not.toMatch(TRACKING_PARAMETER)
    }
  }

  const email = page.getByRole("link", { name: share.targets.email }).first()
  expect(decodeURIComponent((await email.getAttribute("href")) ?? "")).toContain(CANONICAL)
  await expect(email).not.toHaveAttribute("target")
})

test("copies the canonical URL and confirms it on screen", async ({ appPage, context, page }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"])
  await page.goto(POST)
  await appPage.waitForAppReady()
  const copy = page.getByRole("button", { name: share.copy }).first()
  await appPage.waitForHydration(copy)
  await copy.click()

  await expect(page.getByText(share.copied)).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(CANONICAL)
})

test("hands the post to the system share sheet where the browser has one", async ({ appPage, page }) => {
  await page.addInitScript(stubNativeShare)
  await page.goto(POST)
  await appPage.waitForAppReady()
  await page.getByRole("button", { name: share.native }).first().click()

  await expect(page.locator("html")).toHaveAttribute("data-shared", JSON.stringify({ title: await page.locator("h1").innerText(), url: CANONICAL }))
})

test("hides the system share button where the browser has no share sheet", async ({ appPage, page }) => {
  await page.addInitScript(removeNativeShare)
  await page.goto(POST)
  await appPage.waitForAppReady()

  await expect(page.getByRole("button", { name: share.copy }).first()).toBeVisible()
  await expect(page.getByRole("button", { name: share.native }).first()).toBeHidden()
})

test("keeps the share controls on a phone in place and on screen when the system share button appears", async ({
  appPage,
  page,
  pageWithoutJavaScript,
}) => {
  await page.setViewportSize(PHONE)
  await pageWithoutJavaScript.setViewportSize(PHONE)
  await page.addInitScript(stubNativeShare)
  await pageWithoutJavaScript.goto(POST)
  await page.goto(POST)
  await appPage.waitForAppReady()
  await expect(page.getByRole("button", { name: share.native }).first()).toBeVisible()

  expect(await shareListPlacement(page)).toStrictEqual(await shareListPlacement(pageWithoutJavaScript))
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(PHONE.width)
  await expect(page.getByRole("button", { name: share.native }).first()).toBeInViewport()
})

test("shares by link without JavaScript", async ({ pageWithoutJavaScript }) => {
  await pageWithoutJavaScript.goto(POST)

  for (const name of [...NETWORKS, share.targets.email]) {
    const href = await pageWithoutJavaScript.getByRole("link", { name }).first().getAttribute("href")
    expect(decodeURIComponent(href ?? "")).toContain(CANONICAL)
  }
  await expect(pageWithoutJavaScript.getByRole("button", { name: share.native }).first()).toBeHidden()
})

test("links every section of the post to itself", async ({ pageWithoutJavaScript }) => {
  await pageWithoutJavaScript.goto(POST)
  const heading = pageWithoutJavaScript.locator("article h2[id]").first()
  const id = (await heading.getAttribute("id")) ?? ""

  await expect(heading.locator(`a[href="#${id}"]`)).toHaveCount(1)
})
