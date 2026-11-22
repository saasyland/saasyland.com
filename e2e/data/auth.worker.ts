import { API_AUTH_BASE } from "../../src/data/auth.routes"
import { AUTH_PROVIDER } from "../../src/integrations/better-auth/auth.constants"
import { HTTP_STATUS } from "../../src/modules/_core/constants/api"
import { githubTestIdentity } from "./github"
import { TEST_WORKER_KIND, type TestWorkerEntry } from "./worker"

export const GITHUB_AUTHORIZE_TEST_PATH = "/__test/github/authorize"

const GITHUB_CALLBACK_PATH = `${API_AUTH_BASE}/callback/${AUTH_PROVIDER.GITHUB}`

const refuseAuthorization = (error: string): Response => Response.json({ error }, { status: HTTP_STATUS.BAD_REQUEST })

export const AUTH_TEST_WORKER = [
  {
    kind: TEST_WORKER_KIND.ENDPOINT,
    path: GITHUB_AUTHORIZE_TEST_PATH,
    respond: (url, env) => {
      const redirectUri = URL.parse(url.searchParams.get("redirect_uri") ?? "")
      const state = url.searchParams.get("state") ?? ""
      const code = url.searchParams.get("code") ?? ""
      if (url.searchParams.get("client_id") !== env.AUTH_GITHUB_CLIENT_ID) {
        return Promise.resolve(refuseAuthorization("The client_id is not the app's GitHub client"))
      }
      if (redirectUri?.origin !== url.origin || redirectUri.pathname !== GITHUB_CALLBACK_PATH) {
        return Promise.resolve(refuseAuthorization("The redirect_uri is not the app's GitHub callback"))
      }
      if (state.length === 0 || githubTestIdentity(code) === undefined) {
        return Promise.resolve(refuseAuthorization("A state and a test identity code are required"))
      }
      redirectUri.searchParams.set("code", code)
      redirectUri.searchParams.set("state", state)
      return Promise.resolve(Response.redirect(redirectUri.toString(), HTTP_STATUS.FOUND))
    },
  },
] as const satisfies readonly TestWorkerEntry[]
