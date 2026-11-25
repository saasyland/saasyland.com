import { createElement } from "react"

import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { and, asc, eq, isNull, lte, or, sql } from "drizzle-orm"

import { authorized, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { EMAIL_HEADER, ONE_CLICK_UNSUBSCRIBE, RESEND_BATCH_LIMIT } from "~/src/integrations/resend/resend.constants"
import { sendBatchEmails } from "~/src/integrations/resend/resend.utils"
import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { afterRecipient, issueAudience } from "~/src/modules/newsletter-issue/newsletter-issue.audience"
import {
  NEWSLETTER_ISSUE_BATCHES_PER_STEP,
  NEWSLETTER_ISSUE_EMAIL_PURPOSE,
  NEWSLETTER_ISSUE_LEASE_SECONDS,
  NEWSLETTER_ISSUE_MUTATION_KEYS,
  NEWSLETTER_ISSUE_RATE_LIMIT,
  NEWSLETTER_ISSUE_STATUS,
} from "~/src/modules/newsletter-issue/newsletter-issue.constants"
import { newsletterIssue } from "~/src/modules/newsletter-issue/newsletter-issue.schema"
import type { NewsletterIssue } from "~/src/modules/newsletter-issue/newsletter-issue.types"
import { issueContent } from "~/src/modules/newsletter-issue/newsletter-issue.utils"
import { newsletterIssueZodSchemas } from "~/src/modules/newsletter-issue/newsletter-issue.zod"
import { newsletterSubscriber } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.schema"
import { unsubscribeUrl } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.utils"

import { MILLISECONDS_PER_SECOND } from "~/src/lib/duration"
import { trustedRequestOrigin } from "~/src/lib/request-origin"

import type issueMessages from "~/messages/en-US/emails.newsletter-issue-email.json"
import { NEWSLETTER_ISSUE_NAMESPACE, NewsletterIssueEmail } from "~/src/presentation/emails/newsletter-issue-email"

type Issue = NewsletterIssue["select"]

const LAST_INDEX = -1

interface Recipient {
  readonly email: string
  readonly id: string
  readonly locale: SupportedLocale
  readonly unsubscribeToken: string
}

const progressOf = ({ id, recipientCount, sentCount, status }: Issue, isClaimed: boolean) => ({
  isClaimed,
  issueId: id,
  recipientCount,
  sentCount,
  status,
})

const leaseUntil = (now: Date): Date => new Date(now.getTime() + NEWSLETTER_ISSUE_LEASE_SECONDS * MILLISECONDS_PER_SECOND)

const nextRecipients = (issue: Issue): Promise<Recipient[]> =>
  db
    .select({
      email: newsletterSubscriber.email,
      id: newsletterSubscriber.id,
      locale: newsletterSubscriber.locale,
      unsubscribeToken: newsletterSubscriber.unsubscribeToken,
    })
    .from(newsletterSubscriber)
    .where(and(...issueAudience(issue.createdAt), ...afterRecipient(issue.lastRecipientId)))
    .orderBy(asc(newsletterSubscriber.id))
    .limit(RESEND_BATCH_LIMIT)

const issueEmail = async (issue: Issue, recipient: Recipient, origin: string) => {
  const content = issueContent(issue, recipient.locale)
  const messages = await loadNamespace<typeof issueMessages>({ locale: content.locale, namespace: NEWSLETTER_ISSUE_NAMESPACE })
  const url = unsubscribeUrl({ locale: recipient.locale, origin, token: recipient.unsubscribeToken })

  return {
    headers: { [EMAIL_HEADER.LIST_UNSUBSCRIBE]: `<${url}>`, [EMAIL_HEADER.LIST_UNSUBSCRIBE_POST]: ONE_CLICK_UNSUBSCRIBE },
    react: createElement(NewsletterIssueEmail, { content, messages, unsubscribeUrl: url }),
    subject: content.subject,
    to: recipient.email,
  }
}

const sendBatch = async (issue: Issue, origin: string): Promise<{ readonly isDone: boolean; readonly issue: Issue }> => {
  const recipients = await nextRecipients(issue)
  const last = recipients.at(LAST_INDEX)

  if (last === undefined) {
    return { isDone: true, issue }
  }

  const accepted = await sendBatchEmails({
    emails: await Promise.all(recipients.map((recipient) => issueEmail(issue, recipient, origin))),
    idempotency: {
      purpose: NEWSLETTER_ISSUE_EMAIL_PURPOSE.NEWSLETTER_ISSUE,
      token: [issue.id, ...recipients.map(({ id }) => id)].join(":"),
    },
  })

  const sent = { ...issue, lastRecipientId: last.id, sentCount: issue.sentCount + accepted.length }
  await db
    .update(newsletterIssue)
    .set({ lastRecipientId: sent.lastRecipientId, leaseExpiresAt: leaseUntil(new Date()), sentCount: sent.sentCount })
    .where(eq(newsletterIssue.id, issue.id))

  return { isDone: recipients.length < RESEND_BATCH_LIMIT, issue: sent }
}

const releaseLease = (issueId: string) =>
  db
    .update(newsletterIssue)
    .set({ leaseExpiresAt: sql`null` })
    .where(eq(newsletterIssue.id, issueId))

const sendBatches = async (issue: Issue, origin: string, batchesLeft: number): Promise<Issue> => {
  const { isDone, issue: sent } = await sendBatch(issue, origin)

  if (isDone) {
    await db
      .update(newsletterIssue)
      .set({ leaseExpiresAt: sql`null`, sentAt: new Date(), status: NEWSLETTER_ISSUE_STATUS.SENT })
      .where(eq(newsletterIssue.id, issue.id))
    return { ...sent, status: NEWSLETTER_ISSUE_STATUS.SENT }
  }

  if (batchesLeft > 1) {
    return sendBatches(sent, origin, batchesLeft - 1)
  }

  await releaseLease(issue.id)
  return sent
}

export const sendNewsletterIssue = createServerFn({ method: "POST" })
  .middleware([authorized({ admin: ["access"] }), withRateLimit("send-newsletter-issue", NEWSLETTER_ISSUE_RATE_LIMIT)])
  .validator((input: NewsletterIssue["sendNewsletterIssue"]) => newsletterIssueZodSchemas.sendNewsletterIssue.parse(input))
  .handler(async ({ data: { issueId } }) => {
    const origin = trustedRequestOrigin(getRequest())
    const now = new Date()
    const isUnleased = or(isNull(newsletterIssue.leaseExpiresAt), lte(newsletterIssue.leaseExpiresAt, now))
    const [claimed] = await db
      .update(newsletterIssue)
      .set({ leaseExpiresAt: leaseUntil(now) })
      .where(and(eq(newsletterIssue.id, issueId), eq(newsletterIssue.status, NEWSLETTER_ISSUE_STATUS.SENDING), isUnleased))
      .returning()

    if (claimed === undefined) {
      const [issue] = await db.select().from(newsletterIssue).where(eq(newsletterIssue.id, issueId)).limit(1)
      if (issue === undefined) {
        throw new AppError(ERROR_CODES.NOT_FOUND)
      }
      return progressOf(issue, false)
    }

    try {
      return progressOf(await sendBatches(claimed, origin, NEWSLETTER_ISSUE_BATCHES_PER_STEP), true)
    } catch (error) {
      await releaseLease(issueId)
      throw error
    }
  })

const sendUntilDone = async (data: NewsletterIssue["sendNewsletterIssue"]): Promise<Awaited<ReturnType<typeof sendNewsletterIssue>>> => {
  const progress = await sendNewsletterIssue({ data })

  return progress.isClaimed && progress.status === NEWSLETTER_ISSUE_STATUS.SENDING ? sendUntilDone(data) : progress
}

export const sendNewsletterIssueMutation = mutationOptions({
  mutationFn: sendUntilDone,
  mutationKey: NEWSLETTER_ISSUE_MUTATION_KEYS.SEND,
})
