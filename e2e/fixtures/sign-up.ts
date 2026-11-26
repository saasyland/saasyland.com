import type { APIRequestContext, Page } from "@playwright/test"
import * as zod from "zod"

import type { AuthPage } from "../pages"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"
import { ownAddress } from "./address"
import { expectVerificationEmail } from "./emails"
import { expect } from "./test"

export const SIGN_UP_PASSWORD = "StrongPassword123!"

const sessionSchema = zod.object({ user: zod.object({ id: zod.string() }) })

interface SignUpScope {
  readonly authPage: AuthPage
  readonly page: Page
  readonly request: APIRequestContext
}

export const signUpAndVerify = async ({ authPage, page, request }: SignUpScope): Promise<{ email: string; userId: string }> => {
  await page.setExtraHTTPHeaders({ "CF-Connecting-IP": ownAddress() })
  const email = `learner.${crypto.randomUUID()}@example.test`
  await authPage.signUp(email, SIGN_UP_PASSWORD)
  await expect(page).not.toHaveURL(/\/auth\//u)
  const session = sessionSchema.parse(await (await page.request.get("/api/auth/get-session")).json())
  await page.goto((await expectVerificationEmail(request, email)).toString(), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })

  return { email, userId: session.user.id }
}
