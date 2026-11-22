import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"

import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { localize } from "~/src/modules/_core/utils/localized-text"
import { lessonTitleQuery } from "~/src/modules/lesson/use-cases/get-lesson-title"

export const OpenedLessonName = ({ lessonId }: { readonly lessonId: string }): JSX.Element | undefined => {
  const { title } = useSuspenseQuery(lessonTitleQuery({ lessonId })).data

  if (title === undefined) {
    return undefined
  }

  const locale = getCurrentLocale()

  return (
    <span className="flex flex-col items-end">
      <span className="text-foreground">{localize(title.lesson, locale)}</span>
      <span className="text-spec text-muted-foreground">{localize(title.course, locale)}</span>
    </span>
  )
}
