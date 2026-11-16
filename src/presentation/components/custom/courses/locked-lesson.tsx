import type { JSX } from "react"

import { Link, useRouterState } from "@tanstack/react-router"
import { Lock } from "lucide-react"
import { useTranslations } from "use-intl/react"

import type { Course } from "~/src/modules/course/course.types"
import { LESSON_ACCESS } from "~/src/modules/lesson/lesson.constants"

import { useCourseAccessNames } from "~/src/hooks/use-course-access-names"

import { COURSE_ACCESS_GRANTS } from "~/src/data/course-access"
import { CTA_CLASSES } from "~/src/data/cta"

import { cn } from "~/src/lib/cn"

import { ROUTES } from "~/src/routes"

const CTA_CLASSNAME = cn("mt-6", CTA_CLASSES.PRIMARY)

interface LockedLessonProps {
  readonly access: Course["pageLesson"]["access"]
  readonly signedIn: boolean
}

export const UnlockLink = ({ access, signedIn }: LockedLessonProps): JSX.Element | JSX.Element[] => {
  const tName = useTranslations()
  const t = useTranslations("pages.courses.lesson.locked")
  const redirect = useRouterState({ select: ({ location }) => location.publicHref })

  if (access === LESSON_ACCESS.ACCOUNT) {
    return (
      <Link className={CTA_CLASSNAME} search={{ redirect }} to={ROUTES.SIGN_IN}>
        {t("account.cta")}
      </Link>
    )
  }

  return COURSE_ACCESS_GRANTS.map(({ key, offer, unlock }) => (
    <Link className={CTA_CLASSNAME} key={key} {...(signedIn ? unlock.signedIn : unlock.signedOut)}>
      {t("paid.cta", { offer: tName(offer) })}
    </Link>
  ))
}

export const LockedLesson = ({ access, signedIn }: LockedLessonProps): JSX.Element => {
  const t = useTranslations("pages.courses.lesson.locked")

  const { offer } = useCourseAccessNames()
  const reason = access === LESSON_ACCESS.ACCOUNT ? LESSON_ACCESS.ACCOUNT : LESSON_ACCESS.PAID

  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center rounded-lg border border-border bg-radial from-ring/10 to-card to-70% px-6 text-center">
      <span aria-hidden className="flex size-11 items-center justify-center rounded-full border border-ring/40 bg-ring/10">
        <Lock className="size-4 text-ring" strokeWidth={2.25} />
      </span>
      <h2 className="mt-5 text-title text-balance text-foreground">{t(`${reason}.title`, { offer })}</h2>
      <p className="mt-2 max-w-[46ch] text-body-sm text-pretty text-muted-foreground">{t(`${reason}.body`, { offer })}</p>
      <UnlockLink access={access} signedIn={signedIn} />
    </div>
  )
}
