import type { JSX } from "react"

import { Link } from "@tanstack/react-router"
import { Check, Play } from "lucide-react"
import { useTranslations } from "use-intl/react"

import type { Course } from "~/src/modules/course/course.types"
import { courseLessons, nextLessonToWatch } from "~/src/modules/course/course.utils"
import { LESSON_ACCESS } from "~/src/modules/lesson/lesson.constants"

import { useCourseAccessNames } from "~/src/hooks/use-course-access-names"

import { CTA_CLASSES } from "~/src/data/cta"

import { cn } from "~/src/lib/cn"
import { wholeMinutes } from "~/src/lib/duration"

import { RecordingNow } from "~/src/presentation/components/custom/courses/course-card"
import { CourseCover } from "~/src/presentation/components/custom/courses/course-cover"
import { ConfirmEmailLink, SignInInstead, UnlockLink } from "~/src/presentation/components/custom/courses/locked-lesson"

const PANEL_COVER_SIZES = "(min-width: 64rem) 23rem, calc(100vw - 3rem)"

type Lesson = Course["pageLesson"]

const PanelStatus = ({ lessons }: { readonly lessons: readonly Lesson[] }): JSX.Element => {
  const t = useTranslations("pages.courses")
  const recorded = lessons.filter((lesson) => !lesson.recording).length

  if (recorded === 0) {
    return (
      <div>
        <RecordingNow className="text-title" />
        <p className="mt-2 text-body-sm text-pretty text-muted-foreground">{t("course.recording")}</p>
      </div>
    )
  }

  if (lessons.every((lesson) => !lesson.locked)) {
    return (
      <p className="inline-flex items-center gap-2 text-title text-foreground">
        <Check aria-hidden className="size-4 text-ring" strokeWidth={2.5} />
        {t("course.panel.access")}
      </p>
    )
  }

  return <p className="text-title text-foreground">{t("catalogue.recorded", { recorded, total: lessons.length })}</p>
}

const PanelUnlock = ({ viewer }: { readonly viewer: Course["page"]["viewer"] }): JSX.Element => {
  if (viewer.mustConfirmEmail) {
    return <ConfirmEmailLink />
  }

  return (
    <>
      <UnlockLink access={LESSON_ACCESS.PAID} signedIn={viewer.signedIn} />
      {!viewer.signedIn && <SignInInstead access={LESSON_ACCESS.PAID} className="text-center" />}
    </>
  )
}

const PanelActions = ({ data }: { readonly data: Course["page"] }): JSX.Element | undefined => {
  const t = useTranslations("pages.courses.course")

  const lessons = courseLessons(data)
  const next = nextLessonToWatch(lessons)
  const hasLockedLessons = lessons.some((lesson) => lesson.locked)

  if (next === undefined && !hasLockedLessons) {
    return undefined
  }

  return (
    <div className="mt-5 flex flex-col gap-3">
      {next !== undefined && (
        <Link
          className={cn({ [CTA_CLASSES.PRIMARY]: !hasLockedLessons, [CTA_CLASSES.SECONDARY]: hasLockedLessons })}
          params={{ course: data.course.slug, lesson: next.slug }}
          to="/courses/$course/$lesson"
        >
          <Play aria-hidden className="size-3.5 fill-current" strokeWidth={0} />
          {lessons.some((lesson) => lesson.completed) ? t("continue", { title: next.title }) : t("start")}
        </Link>
      )}
      {hasLockedLessons && <PanelUnlock viewer={data.viewer} />}
    </div>
  )
}

const PanelIncludes = ({ data }: { readonly data: Course["page"] }): JSX.Element => {
  const t = useTranslations("pages.courses")

  const { offer } = useCourseAccessNames()
  const lessons = courseLessons(data)
  const previews = lessons.filter((lesson) => lesson.access === LESSON_ACCESS.PREVIEW).length
  const durationMs = lessons.reduce((total, lesson) => total + (lesson.durationMs ?? 0), 0)
  const items = [
    t("catalogue.lessons", { count: lessons.length }),
    ...(durationMs > 0 ? [t("course.includes.video", { minutes: wholeMinutes(durationMs) })] : []),
    ...(previews > 0 ? [t("catalogue.previews", { count: previews })] : []),
    ...(data.course.materials > 0 ? [t("course.includes.materials", { count: data.course.materials })] : []),
    ...(lessons.some((lesson) => lesson.captioned) ? [t("course.includes.captions")] : []),
    t("course.includes.progress"),
    t("course.includes.level", { level: t(`levels.${data.course.level}`) }),
    t("course.includes.updates", { offer }),
  ]

  return (
    <div className="border-t border-border p-6">
      <h2 className="font-mono text-spec text-muted-foreground" id="course-includes">
        {t("course.includes.title")}
      </h2>
      <ul aria-labelledby="course-includes" className="mt-3 flex flex-col">
        {items.map((item) => (
          <li className="flex items-start gap-3 border-b border-border py-2.5 text-body-sm text-foreground last:border-b-0" key={item}>
            <span aria-hidden className="flex h-lh items-center">
              <Check className="size-3.5 text-ring" strokeWidth={2.5} />
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

export const CoursePanel = ({ className, data }: { readonly className?: string; readonly data: Course["page"] }): JSX.Element => (
  <section aria-label={data.course.title} className={cn("overflow-hidden rounded-lg border border-border bg-card", className)}>
    <CourseCover className="w-full" course={data.course} isPriority sizes={PANEL_COVER_SIZES} />
    <div className="p-6">
      <PanelStatus lessons={courseLessons(data)} />
      <PanelActions data={data} />
    </div>
    <PanelIncludes data={data} />
  </section>
)
