import type { Page } from "@playwright/test"

import { AUTH_PROVIDER } from "../../src/integrations/better-auth/auth.constants"
import { OAUTH_CLIENTS } from "../../src/data/auth"
import {
  GOOGLE_AUTHORIZE_PATH,
  GOOGLE_AUTHORIZE_TEST_PATH,
  GOOGLE_IDENTITY_PARAM,
  type GoogleIdentity,
  googleTestIdentityParam,
} from "../data/google"
import { serveAuthorization } from "./oauth"

const AUTHORIZE_URL = `${OAUTH_CLIENTS[AUTH_PROVIDER.GOOGLE].authorizeOrigin}${GOOGLE_AUTHORIZE_PATH}**`

export const approveGoogle = async (page: Page, identity: GoogleIdentity): Promise<void> => {
  await serveAuthorization(page, {
    approve: (authorize) => {
      const approval = new URL(GOOGLE_AUTHORIZE_TEST_PATH, authorize.searchParams.get("redirect_uri") ?? "")
      approval.search = authorize.search
      approval.searchParams.set(GOOGLE_IDENTITY_PARAM, googleTestIdentityParam(identity))
      return approval
    },
    authorizeUrl: AUTHORIZE_URL,
    provider: "Google",
  })
}
