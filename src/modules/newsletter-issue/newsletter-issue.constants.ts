import { SECONDS_PER_MINUTE } from "~/src/lib/duration"

export const NEWSLETTER_ISSUE_SUBJECT_MAX_LENGTH = 150

export const NEWSLETTER_ISSUE_BODY_MAX_LENGTH = 20_000

export const NEWSLETTER_ISSUE_BATCHES_PER_STEP = 5

export const NEWSLETTER_ISSUE_LEASE_SECONDS = 60

export const NEWSLETTER_ISSUE_RATE_LIMIT = { max: 30, window: SECONDS_PER_MINUTE } as const

export const NEWSLETTER_ISSUE_STATUS = {
  SENDING: "sending",
  SENT: "sent",
} as const

export const NEWSLETTER_ISSUE_STATUSES = [NEWSLETTER_ISSUE_STATUS.SENDING, NEWSLETTER_ISSUE_STATUS.SENT] as const

export type NewsletterIssueStatus = (typeof NEWSLETTER_ISSUE_STATUSES)[number]

export const NEWSLETTER_ISSUE_TEXT = {
  BODY: "body",
  SUBJECT: "subject",
} as const

export const NEWSLETTER_ISSUE_TEXTS = [NEWSLETTER_ISSUE_TEXT.SUBJECT, NEWSLETTER_ISSUE_TEXT.BODY] as const

export type NewsletterIssueText = (typeof NEWSLETTER_ISSUE_TEXTS)[number]

export const NEWSLETTER_ISSUE_SORT_COLUMNS = ["createdAt", "sentAt", "sentCount", "status"] as const

export const NEWSLETTER_ISSUE_VALIDATION_PARAMS: Record<string, Record<string, number>> = {
  bodyTooLong: { max: NEWSLETTER_ISSUE_BODY_MAX_LENGTH },
  subjectTooLong: { max: NEWSLETTER_ISSUE_SUBJECT_MAX_LENGTH },
}

export const NEWSLETTER_ISSUE_QUERY_KEYS = {
  ALL: ["newsletter-issue"],
  LIST: ["newsletter-issue", "getNewsletterIssues"],
} as const

export const NEWSLETTER_ISSUE_MUTATION_KEYS = {
  CREATE: ["newsletter-issue", "createNewsletterIssue"],
  SEND: ["newsletter-issue", "sendNewsletterIssue"],
} as const

export const NEWSLETTER_ISSUE_EMAIL_PURPOSE = {
  NEWSLETTER_ISSUE: "newsletter-issue",
} as const
