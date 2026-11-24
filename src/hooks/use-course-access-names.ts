import { useFormatter, useTranslations } from "use-intl/react"

import { COURSE_ACCESS_GRANTS } from "~/src/modules/lesson/lesson.access"

interface CourseAccessNames {
  readonly holders: string
  readonly includedWith: string
  readonly offer: string
}

export const useCourseAccessNames = (): CourseAccessNames => {
  const t = useTranslations()
  const format = useFormatter()

  return {
    holders: format.list(COURSE_ACCESS_GRANTS.map((grant) => t(grant.holders))),
    includedWith: format.list(COURSE_ACCESS_GRANTS.flatMap((grant) => grant.includedWith).map((key) => t(key))),
    offer: format.list(
      COURSE_ACCESS_GRANTS.map((grant) => t(grant.offer)),
      { type: "disjunction" },
    ),
  }
}
