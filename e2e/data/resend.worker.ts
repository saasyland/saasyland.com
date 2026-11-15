import { HTTP_STATUS } from "../../src/modules/_core/constants/api"
import { TEST_WORKER_KIND, type TestWorkerEntry } from "./worker"

export const RESEND_TEST_WORKER = [
  {
    kind: TEST_WORKER_KIND.ENDPOINT,
    path: "/__test/emails",
    respond: async (url) => {
      const recipient = url.searchParams.get("to")
      if (recipient === null || recipient.length === 0) {
        return Response.json({ error: "An email recipient is required" }, { status: HTTP_STATUS.BAD_REQUEST })
      }
      const { getSentEmails } = await import("../../src/platform/testing/mocks/resend")
      return Response.json(getSentEmails(recipient))
    },
  },
] as const satisfies readonly TestWorkerEntry[]
