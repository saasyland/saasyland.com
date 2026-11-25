import type { JSX } from "react"

import { Send } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { NEWSLETTER_ISSUE_STATUS } from "~/src/modules/newsletter-issue/newsletter-issue.constants"
import type { NewsletterIssue } from "~/src/modules/newsletter-issue/newsletter-issue.types"

import { useNewsletterSending } from "~/src/hooks/use-newsletter-sending"

import { DropdownMenuItem } from "~/src/presentation/components/shadcn/dropdown-menu"

import { RowMenu } from "~/src/presentation/components/custom/row-menu"

export const NewsletterIssueActions = ({ row }: { readonly row: NewsletterIssue["listRow"] }): JSX.Element | undefined => {
  const t = useTranslations("pages.admin.newsletter.issues")
  const sending = useNewsletterSending()

  if (row.status === NEWSLETTER_ISSUE_STATUS.SENT) {
    return
  }

  return (
    <div className="flex justify-end">
      <RowMenu isPending={sending.isPending} label={t("menu", { subject: row.subject })}>
        <DropdownMenuItem
          onAction={() => {
            sending.mutate({ issueId: row.id })
          }}
          textValue={t("resume")}
        >
          <Send aria-hidden />
          {t("resume")}
        </DropdownMenuItem>
      </RowMenu>
    </div>
  )
}
