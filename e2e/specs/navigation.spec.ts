import { expect, test } from "../fixtures/test"

test.describe("server rendering and client navigation", () => {
  for (const path of ["/", "/auth/sign-in", "/terms", "/blog"]) {
    test(`${path} renders its heading before JavaScript runs`, async ({ browser, baseURL }) => {
      const context = await browser.newContext({ ...(baseURL === undefined ? {} : { baseURL }), javaScriptEnabled: false })
      const page = await context.newPage()
      await page.goto(path)
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
      if (path === "/auth/sign-in") await expect(page.getByLabel("Email", { exact: true })).toBeVisible()
      if (path === "/blog") await expect(page.locator('main a[href^="/blog/"]').first()).toBeVisible()
      await context.close()
    })
  }

  test("pricing navigates to sign-up without reloading the document", async ({ appPage, page }) => {
    await page.goto("/")
    await appPage.waitForAppReady()
    await page.evaluate(() => (document.documentElement.dataset["navigationProbe"] = "same-document"))
    await page.locator('#pricing a[href^="/auth/sign-up"]').first().click()
    await page.waitForURL((url) => url.pathname.endsWith("/auth/sign-up"))
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(page.locator("html")).toHaveAttribute("data-navigation-probe", "same-document")
  })

  test("landing keeps its responsive styles after visiting the docs", async ({ appPage, page }) => {
    await page.goto("/")
    await appPage.waitForAppReady()
    await page.locator('header a[href="/docs"]').first().click()
    await expect(page.getByRole("heading", { level: 1, name: "Documentation" })).toBeVisible()
    await page.locator('a[href="/"]:visible').first().click()
    await page.waitForURL((url) => url.pathname === "/")
    await expect(page.locator("h1 svg")).toBeVisible()
    await expect(page.locator('header a[href="/docs"]').first()).toBeVisible()
  })

  for (const prefix of ["", "/ja-JP", "/pt-BR"]) {
    test(`${prefix || "/"} docs navigation during hydration keeps the next page intact`, async ({ appPage, browserName, page }) => {
      test.skip(browserName !== "chromium", "CPU throttling uses the Chrome DevTools Protocol")
      const errors: string[] = []
      page.on("pageerror", (error) => errors.push(error.message))
      const devtools = await page.context().newCDPSession(page)
      await devtools.send("Emulation.setCPUThrottlingRate", { rate: 6 })
      await page.goto(`${prefix}/docs/getting-started`)
      await appPage.waitForAppReady()
      await page.locator(`a[href="${prefix}/docs/getting-started/installation"]`).first().click()
      await expect(page).toHaveURL(new RegExp(`${prefix}/docs/getting-started/installation$`, "u"))
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
      await expect(page.locator("html")).toHaveAttribute("lang", prefix === "" ? "en-US" : prefix.slice(1))
      expect(errors).toEqual([])
    })
  }
})
