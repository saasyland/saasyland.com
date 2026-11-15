import { HTTP_STATUS } from "../../src/modules/_core/constants/api"
import { TEST_WORKER_KIND, type TestWorkerEntry } from "./worker"

export const NEWSLETTER_TEST_WORKER = [
  {
    kind: TEST_WORKER_KIND.ENDPOINT,
    path: "/__test/newsletter",
    respond: async (url, env) => {
      const email = url.searchParams.get("email")
      if (email === null || !email.endsWith("@example.test")) {
        return Response.json({ error: "A test email address is required" }, { status: HTTP_STATUS.BAD_REQUEST })
      }
      const subscriber = await env.DB.prepare(
        "SELECT status, unsubscribe_token AS unsubscribeToken, unsubscribed_at AS unsubscribedAt FROM newsletter_subscriber WHERE email = ?",
      )
        .bind(email)
        .first()
      return Response.json(subscriber)
    },
  },
] as const satisfies readonly TestWorkerEntry[]
