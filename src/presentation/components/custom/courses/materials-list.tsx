import type { JSX } from "react"

import { FileText, Link2, Lock } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { LESSON_ATTACHMENT_KIND } from "~/src/modules/lesson-attachment/lesson-attachment.constants"
import type { Lesson } from "~/src/modules/lesson/lesson.types"

import { useFileSize } from "~/src/hooks/use-file-size"

import { AnchorButton } from "~/src/presentation/components/shadcn/button"

const MaterialLink = ({ attachment, href }: { readonly attachment: Lesson["attachment"]; readonly href: string }): JSX.Element => {
  if (attachment.kind === LESSON_ATTACHMENT_KIND.LINK) {
    return (
      <AnchorButton className="h-auto p-0 text-body-sm" href={href} variant="link">
        {attachment.title}
      </AnchorButton>
    )
  }

  return (
    <AnchorButton className="h-auto p-0 text-body-sm" download={attachment.fileName} href={href} variant="link">
      {attachment.title}
    </AnchorButton>
  )
}

const MaterialSize = ({ attachment }: { readonly attachment: Lesson["attachment"] }): JSX.Element | undefined => {
  const fileSize = useFileSize()

  if (attachment.kind === LESSON_ATTACHMENT_KIND.LINK) {
    return undefined
  }

  return <span className="text-spec text-muted-foreground tabular-nums">{fileSize(attachment.sizeBytes)}</span>
}

export const MaterialsList = ({ attachments }: { readonly attachments: readonly Lesson["attachment"][] }): JSX.Element => {
  const t = useTranslations("pages.courses.lesson.materials")

  return (
    <section aria-labelledby="lesson-materials" className="mt-10">
      <h2 className="text-title text-foreground" id="lesson-materials">
        {t("title")}
      </h2>
      <ul className="mt-4 border-t border-border">
        {attachments.map((attachment) => {
          const Icon = attachment.kind === LESSON_ATTACHMENT_KIND.LINK ? Link2 : FileText

          return (
            <li className="flex items-center gap-3 border-b border-border py-3" key={attachment.id}>
              <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                {attachment.href === undefined && <span className="text-body-sm text-muted-foreground">{attachment.title}</span>}
                {attachment.href !== undefined && <MaterialLink attachment={attachment} href={attachment.href} />}
              </span>
              <MaterialSize attachment={attachment} />
              {attachment.href === undefined && (
                <>
                  <Lock aria-hidden className="size-3 shrink-0 text-muted-foreground/60" strokeWidth={2.25} />
                  <span className="sr-only">{t("locked")}</span>
                </>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
