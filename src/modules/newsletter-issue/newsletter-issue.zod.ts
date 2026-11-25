import * as zod from "zod"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { choiceOf, paginationSchema, searchTextField, sortingOf } from "~/src/modules/_core/utils/pagination"
import { dateRangeField, idField, localeField } from "~/src/modules/_core/utils/zod-fields"
import {
  NEWSLETTER_ISSUE_BODY_MAX_LENGTH,
  NEWSLETTER_ISSUE_SORT_COLUMNS,
  NEWSLETTER_ISSUE_STATUSES,
  NEWSLETTER_ISSUE_SUBJECT_MAX_LENGTH,
  NEWSLETTER_ISSUE_TEXTS,
} from "~/src/modules/newsletter-issue/newsletter-issue.constants"

import { isFilled } from "~/src/lib/localized-form"

const issueText = (maxLength: number, tooLong: string) =>
  zod.partialRecord(localeField, zod.string().trim().max(maxLength, { message: tooLong }))

const issueTexts = zod
  .object({
    body: issueText(NEWSLETTER_ISSUE_BODY_MAX_LENGTH, "bodyTooLong"),
    subject: issueText(NEWSLETTER_ISSUE_SUBJECT_MAX_LENGTH, "subjectTooLong"),
  })
  .superRefine((texts, context) => {
    for (const locale of I18N.SUPPORTED_LOCALES) {
      const filled = NEWSLETTER_ISSUE_TEXTS.filter((text) => isFilled(texts[text], locale))
      const isStarted = filled.length > 0 || locale === I18N.DEFAULT_LOCALE

      for (const text of NEWSLETTER_ISSUE_TEXTS.filter((candidate) => isStarted && !filled.includes(candidate))) {
        context.addIssue({
          code: "custom",
          message: locale === I18N.DEFAULT_LOCALE ? "defaultLocaleRequired" : "translationIncomplete",
          path: [text, locale],
        })
      }
    }
  })

const createNewsletterIssue = issueTexts.safeExtend({ issueId: zod.uuidv7() })

const sendNewsletterIssue = zod.object({ issueId: idField })

const issueFilters = zod.object({
  createdAt: dateRangeField.optional(),
  status: zod.array(choiceOf(NEWSLETTER_ISSUE_STATUSES)).max(NEWSLETTER_ISSUE_STATUSES.length).optional(),
})

const getNewsletterIssues = paginationSchema.extend({
  filters: issueFilters.default({}),
  search: searchTextField.default(""),
  sorting: sortingOf(NEWSLETTER_ISSUE_SORT_COLUMNS),
})

export const newsletterIssueZodSchemas = {
  createNewsletterIssue,
  getNewsletterIssues,
  issueTexts,
  sendNewsletterIssue,
}
