import { describe, expect, it } from "vite-plus/test"

import { NEWSLETTER_ISSUE_STATUSES } from "~/src/modules/newsletter-issue/newsletter-issue.constants"
import { newsletterIssue } from "~/src/modules/newsletter-issue/newsletter-issue.schema"

describe("newsletter issue schema", () => {
  it("stores the status as one of its statuses, starting while it is sent", () => {
    expect(NEWSLETTER_ISSUE_STATUSES).toStrictEqual(["sending", "sent"])
    expect(newsletterIssue.status.enumValues).toStrictEqual(["sending", "sent"])
    expect(newsletterIssue.status.default).toBe("sending")
    expect(newsletterIssue.sentCount.default).toBe(0)
  })

  it("keeps the subject and the body as JSON per language and restamps updates", () => {
    expect(newsletterIssue.subject).toMatchObject({ name: "subject", notNull: true })
    expect(newsletterIssue.body).toMatchObject({ name: "body", notNull: true })
    expect(newsletterIssue.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date)
  })
})
