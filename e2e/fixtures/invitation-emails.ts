import type { APIRequestContext } from "@playwright/test"

import { INVITATION_EMAIL_PURPOSE } from "../../src/modules/invitation/invitation.constants"
import { APP_NAME } from "../../src/presentation/branding"
import { latestEmail, linkTo } from "./emails"
import { expect } from "./test"

export const expectInvitationEmail = async (request: APIRequestContext, recipient: string, expectedCount = 1): Promise<URL> => {
  const email = await latestEmail(request, recipient, INVITATION_EMAIL_PURPOSE.INVITATION, expectedCount)

  expect(email.subject).toBe(`You're invited to ${APP_NAME}`)
  expect(email.html).toContain('lang="en-US"')
  return linkTo(email.html, "/auth/invite")
}
