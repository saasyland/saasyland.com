import type { Page } from "@playwright/test"

import { GITHUB_AUTHORIZE_TEST_PATH } from "../data/auth.worker"
import { type GitHubIdentity, githubTestCode } from "../data/github"

const AUTHORIZE_URL = "https://github.com/login/oauth/authorize**"

const authorizationPage = (approval: URL): string => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>GitHub authorization test double</title>
  </head>
  <body>
    <script>
      window.location.replace(${JSON.stringify(approval.toString())})
    </script>
  </body>
</html>`

export const approveGitHub = async (page: Page, identity: GitHubIdentity): Promise<void> => {
  await page.route(AUTHORIZE_URL, async (route) => {
    const authorize = new URL(route.request().url())
    const approval = new URL(GITHUB_AUTHORIZE_TEST_PATH, authorize.searchParams.get("redirect_uri") ?? "")
    approval.search = authorize.search
    approval.searchParams.set("code", githubTestCode(identity))
    await route.fulfill({ body: authorizationPage(approval), contentType: "text/html" })
  })
}
