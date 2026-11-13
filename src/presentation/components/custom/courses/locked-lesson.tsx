import type { JSX } from "react"

import { Link, useRouterState } from "@tanstack/react-router"
import { Lock } from "lucide-react"
import { useTranslations } from "use-intl/react"

import type { Course } from "~/src/modules/course/course.types"
import { LESSON_ACCESS } from "~/src/modules/lesson/lesson.constants"
import { LICENSE_TIER } from "~/src/modules/license/license.constants"

import { MARKETING_SECTION_IDS } from "~/src/data/marketing"

import { ROUTES } from "~/src/routes"

const CTA_CLASSNAME =
  "mt-6 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-body-sm font-semibold text-primary-foreground transition-[background-color,transform] duration-200 ease-exp hover:bg-primary/88 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring active:translate-y-px"

interface LockedLessonProps {
  readonly access: Course["pageLesson"]["access"]
  readonly signedIn: boolean
}

export const UnlockLink = ({ access, signedIn }: LockedLessonProps): JSX.Element => {
  const t = useTranslations("pages.courses.lesson.locked")
  const redirect = useRouterState({ select: ({ location }) => location.publicHref })

  if (access === LESSON_ACCESS.ACCOUNT) {
    return (
      <Link className={CTA_CLASSNAME} search={{ redirect }} to={ROUTES.SIGN_IN}>
        {t("account.cta")}
      </Link>
    )
  }

  if (signedIn) {
    return (
      <Link className={CTA_CLASSNAME} search={{ tier: LICENSE_TIER.COMPLETE }} to={ROUTES.APP_LICENSE}>
        {t("paid.cta")}
      </Link>
    )
  }

  return (
    <Link className={CTA_CLASSNAME} hash={MARKETING_SECTION_IDS.PRICING} to={ROUTES.HOME}>
      {t("paid.cta")}
    </Link>
  )
}

export const LockedLesson = ({ access, signedIn }: LockedLessonProps): JSX.Element => {
  const t = useTranslations("pages.courses.lesson.locked")
  const reason = access === LESSON_ACCESS.ACCOUNT ? LESSON_ACCESS.ACCOUNT : LESSON_ACCESS.PAID

  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center rounded-lg border border-border bg-radial from-ring/10 to-card to-70% px-6 text-center">
      <span aria-hidden className="flex size-11 items-center justify-center rounded-full border border-ring/40 bg-ring/10">
        <Lock className="size-4 text-ring" strokeWidth={2.25} />
      </span>
      <h2 className="mt-5 text-title text-balance text-foreground">{t(`${reason}.title`)}</h2>
      <p className="mt-2 max-w-[46ch] text-body-sm text-pretty text-muted-foreground">{t(`${reason}.body`)}</p>
      <UnlockLink access={access} signedIn={signedIn} />
    </div>
  )
}
