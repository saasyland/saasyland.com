import type { Page } from "@playwright/test"

import { HTTP_STATUS } from "../../src/modules/_core/constants/api"
import { type GitHubIdentity, githubTestCode } from "../data/github"

const AUTHORIZE_URL = "https://github.com/login/oauth/authorize**"

export const approveGitHub = async (page: Page, identity: GitHubIdentity): Promise<void> => {
  await page.route(AUTHORIZE_URL, async (route) => {
    const authorize = new URL(route.request().url())
    const callback = new URL(authorize.searchParams.get("redirect_uri") ?? "")
    callback.searchParams.set("code", githubTestCode(identity))
    callback.searchParams.set("state", authorize.searchParams.get("state") ?? "")
    await route.fulfill({ headers: { location: callback.toString() }, status: HTTP_STATUS.FOUND })
  })
}
