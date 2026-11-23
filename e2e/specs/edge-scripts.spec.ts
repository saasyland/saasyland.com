import { expect, test } from "../fixtures/test"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

import * as ROUTES from "../../src/routes"

const POLICY_HEADER = "content-security-policy"
const NONCE = /'nonce-(?<nonce>[\da-f]{32})'/u

for (const path of [ROUTES.HOME, ROUTES.SIGN_IN]) {
  test(`on ${path}, a script the edge adds with the header's nonce runs, and one without the nonce is blocked`, async ({
    appPage,
    cspViolations,
    page,
  }) => {
    await page.route(path, async (route) => {
      const response = await route.fetch()
      const nonce = NONCE.exec(response.headers()[POLICY_HEADER] ?? "")?.groups?.["nonce"] ?? ""
      const scripts = `<script nonce="${nonce}">window.__edge = true</script><script>window.__injected = true</script>`
      await route.fulfill({ body: (await response.text()).replace("</body>", `${scripts}</body>`), response })
    })

    await page.goto(path, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    await appPage.waitForAppReady()

    expect(await page.evaluate(() => [Reflect.get(window, "__edge"), Reflect.get(window, "__injected")])).toEqual([true, undefined])
    await expect.poll(() => cspViolations.length).toBe(1)
    expect(cspViolations.splice(0)).toEqual([expect.stringContaining("script-src")])
  })
}
