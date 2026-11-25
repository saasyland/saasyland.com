import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { type NewsletterIssueTexts, issueContent } from "~/src/modules/newsletter-issue/newsletter-issue.utils"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"

interface NewsletterIssuePreviewProps {
  readonly locale: SupportedLocale
  readonly texts: NewsletterIssueTexts
}

export const NewsletterIssuePreview = ({ locale, texts }: NewsletterIssuePreviewProps): JSX.Element => {
  const t = useTranslations()

  const content = issueContent(texts, locale)
  const isFallback = content.locale !== locale

  return (
    <Card aria-labelledby="newsletter-issue-preview" className="lg:sticky lg:top-6" role="region">
      <CardHeader className="border-b">
        <CardTitle>
          <h2 id="newsletter-issue-preview">{t("pages.admin.newsletter.compose.preview.title")}</h2>
        </CardTitle>
        <CardDescription>
          {t("pages.admin.newsletter.compose.preview.description", { language: t(`locales.${locale}`) })}
          {isFallback && ` ${t("pages.admin.newsletter.compose.preview.fallback", { language: t(`locales.${content.locale}`) })}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4" lang={content.locale}>
        <p className="text-title font-semibold text-balance text-foreground">
          {content.subject.length > 0 ? content.subject : t("pages.admin.newsletter.compose.preview.noSubject")}
        </p>
        {content.paragraphs.map((paragraph, index) => (
          <p className="text-body-sm whitespace-pre-line text-foreground" key={`${String(index)}-${paragraph}`}>
            {paragraph}
          </p>
        ))}
        <p className="border-t border-border pt-4 text-spec text-muted-foreground">{t("pages.admin.newsletter.compose.preview.footer")}</p>
      </CardContent>
    </Card>
  )
}
