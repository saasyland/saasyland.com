import type { Page } from "@playwright/test"

import { GITHUB_AUTHORIZE_TEST_PATH } from "../data/auth.worker"
import { type GitHubIdentity, githubTestCode } from "../data/github"
import { serveAuthorization } from "./oauth"

const AUTHORIZE_URL = "https://github.com/login/oauth/authorize**"

export const approveGitHub = async (page: Page, identity: GitHubIdentity): Promise<void> => {
  await serveAuthorization(page, {
    approve: (authorize) => {
      const approval = new URL(GITHUB_AUTHORIZE_TEST_PATH, authorize.searchParams.get("redirect_uri") ?? "")
      approval.search = authorize.search
      approval.searchParams.set("code", githubTestCode(identity))
      return approval
    },
    authorizeUrl: AUTHORIZE_URL,
    provider: "GitHub",
  })
}
