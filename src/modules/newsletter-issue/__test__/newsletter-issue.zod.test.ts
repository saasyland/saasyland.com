import { describe, expect, it } from "vite-plus/test"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import {
  NEWSLETTER_ISSUE_BODY_MAX_LENGTH,
  NEWSLETTER_ISSUE_SUBJECT_MAX_LENGTH,
} from "~/src/modules/newsletter-issue/newsletter-issue.constants"
import { newsletterIssueZodSchemas } from "~/src/modules/newsletter-issue/newsletter-issue.zod"

const POLISH = "pl-PL"

const issuesOf = (texts: unknown) =>
  newsletterIssueZodSchemas.issueTexts.safeParse(texts).error?.issues.map(({ message, path }) => ({ message, path })) ?? []

describe("newsletter issue texts", () => {
  it("accepts an English issue with complete or empty translations, trimmed", () => {
    expect(
      newsletterIssueZodSchemas.issueTexts.parse({
        body: { [I18N.DEFAULT_LOCALE]: " Body ", [POLISH]: "Treść" },
        subject: { [I18N.DEFAULT_LOCALE]: "Subject", [POLISH]: "Temat", "uk-UA": " " },
      }),
    ).toStrictEqual({
      body: { [I18N.DEFAULT_LOCALE]: "Body", [POLISH]: "Treść" },
      subject: { [I18N.DEFAULT_LOCALE]: "Subject", [POLISH]: "Temat", "uk-UA": "" },
    })
  })

  it("requires the English subject and body", () => {
    expect(issuesOf({ body: {}, subject: {} })).toStrictEqual([
      { message: "defaultLocaleRequired", path: ["subject", I18N.DEFAULT_LOCALE] },
      { message: "defaultLocaleRequired", path: ["body", I18N.DEFAULT_LOCALE] },
    ])
  })

  it("asks for the missing half of a translation", () => {
    expect(
      issuesOf({ body: { [I18N.DEFAULT_LOCALE]: "Body" }, subject: { [I18N.DEFAULT_LOCALE]: "Subject", [POLISH]: "Temat" } }),
    ).toStrictEqual([{ message: "translationIncomplete", path: ["body", POLISH] }])
  })

  it("limits the subject and the body", () => {
    expect(
      issuesOf({
        body: { [I18N.DEFAULT_LOCALE]: "b".repeat(NEWSLETTER_ISSUE_BODY_MAX_LENGTH + 1) },
        subject: { [I18N.DEFAULT_LOCALE]: "s".repeat(NEWSLETTER_ISSUE_SUBJECT_MAX_LENGTH + 1) },
      }),
    ).toStrictEqual([
      { message: "bodyTooLong", path: ["body", I18N.DEFAULT_LOCALE] },
      { message: "subjectTooLong", path: ["subject", I18N.DEFAULT_LOCALE] },
    ])
  })

  it("takes a version 7 UUID as the ID of a new issue", () => {
    const texts = { body: { [I18N.DEFAULT_LOCALE]: "Body" }, subject: { [I18N.DEFAULT_LOCALE]: "Subject" } }

    expect(newsletterIssueZodSchemas.createNewsletterIssue.safeParse({ ...texts, issueId: "issue-1" }).success).toBe(false)
    expect(
      newsletterIssueZodSchemas.createNewsletterIssue.safeParse({ ...texts, issueId: "019ab7c0-0000-7000-8000-000000000000" }).success,
    ).toBe(true)
  })
})
