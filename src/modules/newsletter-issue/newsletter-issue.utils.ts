import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import type { LocalizedText } from "~/src/modules/_core/utils/localized-text"
import { NEWSLETTER_ISSUE_TEXTS, type NewsletterIssueText } from "~/src/modules/newsletter-issue/newsletter-issue.constants"

import { isFilled } from "~/src/lib/localized-form"

const PARAGRAPH_BREAK = /\n\s*\n/u

export type NewsletterIssueTexts = Readonly<Record<NewsletterIssueText, LocalizedText>>

export interface NewsletterIssueContent {
  readonly locale: SupportedLocale
  readonly paragraphs: readonly string[]
  readonly subject: string
}

export const issueParagraphs = (body: string): string[] =>
  body
    .split(PARAGRAPH_BREAK)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)

export const issueLocale = (texts: NewsletterIssueTexts, locale: SupportedLocale): SupportedLocale =>
  NEWSLETTER_ISSUE_TEXTS.every((text) => isFilled(texts[text], locale)) ? locale : I18N.DEFAULT_LOCALE

export const issueContent = (texts: NewsletterIssueTexts, locale: SupportedLocale): NewsletterIssueContent => {
  const shown = issueLocale(texts, locale)

  return { locale: shown, paragraphs: issueParagraphs(texts.body[shown] ?? ""), subject: (texts.subject[shown] ?? "").trim() }
}
