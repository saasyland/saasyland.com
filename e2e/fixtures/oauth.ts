import type { Page } from "@playwright/test"

const authorizationPage = (provider: string, approval: URL): string => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${provider} authorization test double</title>
  </head>
  <body>
    <script>
      window.location.replace(${JSON.stringify(approval.toString())})
    </script>
  </body>
</html>`

export const serveAuthorization = async (
  page: Page,
  { approve, authorizeUrl, provider }: { approve: (authorize: URL) => URL; authorizeUrl: string; provider: string },
): Promise<void> => {
  await page.route(authorizeUrl, async (route) => {
    await route.fulfill({ body: authorizationPage(provider, approve(new URL(route.request().url()))), contentType: "text/html" })
  })
}
