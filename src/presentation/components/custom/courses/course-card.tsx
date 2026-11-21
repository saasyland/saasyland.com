import type { JSX } from "react"

import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { useTranslations } from "use-intl/react"

import type { Course } from "~/src/modules/course/course.types"

import { cn } from "~/src/lib/cn"
import { wholeMinutes } from "~/src/lib/duration"

import { Progress, ProgressLabel } from "~/src/presentation/components/shadcn/progress"

import { CourseCover } from "~/src/presentation/components/custom/courses/course-cover"

type CatalogueCourse = Course["catalogueCourse"]

const CARD_CLASSNAME =
  "group relative isolate flex overflow-hidden rounded-lg border border-border bg-card transition-[border-color,translate,box-shadow] duration-300 ease-exp hover:border-ring/40 hover:shadow-[0_24px_48px_-24px_oklch(0_0_0/0.7)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring motion-safe:hover:-translate-y-0.5"

const COVER_CLASSNAME = "size-full transition-transform duration-700 ease-exp motion-safe:group-hover:scale-103"

const FEATURED_SIZES = "(min-width: 80rem) 44rem, (min-width: 64rem) 56vw, calc(100vw - 3rem)"

const CARD_SIZES = "(min-width: 80rem) 37rem, (min-width: 48rem) calc(50vw - 3.5rem), calc(100vw - 3rem)"

export const RecordingNow = ({ className }: { readonly className?: string }): JSX.Element => {
  const t = useTranslations("pages.courses.catalogue")

  return (
    <span className={cn("inline-flex items-center gap-2 text-ring", className)}>
      <span aria-hidden className="relative flex size-2">
        <span className="absolute inset-0 rounded-full bg-ring/60 motion-safe:animate-ping" />
        <span className="relative size-2 rounded-full bg-ring" />
      </span>
      {t("recordingNow")}
    </span>
  )
}

export const CourseFacts = ({
  course,
}: {
  readonly course: Pick<CatalogueCourse, "durationMs" | "lessons" | "previews" | "recorded">
}): JSX.Element => {
  const t = useTranslations("pages.courses.catalogue")
  const isPartlyRecorded = course.recorded > 0 && course.recorded < course.lessons

  return (
    <>
      {course.recorded === 0 && <RecordingNow />}
      {!isPartlyRecorded && <span>{t("lessons", { count: course.lessons })}</span>}
      {isPartlyRecorded && <span>{t("recorded", { recorded: course.recorded, total: course.lessons })}</span>}
      {course.recorded > 0 && <span>{t("minutes", { minutes: wholeMinutes(course.durationMs) })}</span>}
      {course.previews > 0 && <span className="text-ring">{t("previews", { count: course.previews })}</span>}
    </>
  )
}

export const CourseBadges = ({
  className,
  course,
}: {
  readonly className?: string
  readonly course: Pick<CatalogueCourse, "kind" | "level">
}): JSX.Element => {
  const t = useTranslations("pages.courses")

  return (
    <p className={cn("flex flex-wrap gap-2 text-spec font-medium", className)}>
      <span className="rounded-md border border-ring/40 bg-background/80 px-2.5 py-1 text-ring backdrop-blur-sm">
        {t(`kinds.${course.kind}`)}
      </span>
      <span className="rounded-md border border-border bg-background/80 px-2.5 py-1 text-foreground backdrop-blur-sm">
        {t(`levels.${course.level}`)}
      </span>
    </p>
  )
}

const CourseProgress = ({ course }: { readonly course: CatalogueCourse }): JSX.Element | undefined => {
  const t = useTranslations("pages.courses.catalogue")

  if (course.completed === 0) {
    return undefined
  }

  return (
    <Progress className="mt-5 **:data-[slot=progress-indicator]:bg-ring" maxValue={course.lessons} value={course.completed}>
      <ProgressLabel className="font-mono text-spec text-muted-foreground">
        {t("progress", { completed: course.completed, total: course.lessons })}
      </ProgressLabel>
    </Progress>
  )
}

const ViewCourse = (): JSX.Element => {
  const t = useTranslations("pages.courses.catalogue")

  return (
    <span className="inline-flex items-center gap-2 text-body-sm font-medium text-foreground">
      {t("view")}
      <ArrowRight aria-hidden className="size-4 transition-transform duration-300 ease-exp motion-safe:group-hover:translate-x-1" />
    </span>
  )
}

export const FeaturedCourseCard = ({ course }: { readonly course: CatalogueCourse }): JSX.Element => (
  <Link className={cn(CARD_CLASSNAME, "flex-col lg:grid lg:grid-cols-[1.4fr_1fr]")} params={{ course: course.slug }} to="/courses/$course">
    <div className="relative overflow-hidden">
      <CourseCover className={COVER_CLASSNAME} course={course} isDecorative isPriority sizes={FEATURED_SIZES} />
      <span
        aria-hidden
        className="absolute inset-0 bg-linear-to-t from-card/70 via-transparent to-transparent lg:bg-linear-to-r lg:from-transparent lg:to-card"
      />
    </div>
    <div className="flex flex-col p-7 md:p-10">
      <CourseBadges course={course} />
      <h2 className="mt-6 text-headline-peak text-balance text-foreground">{course.title}</h2>
      <p className="mt-4 max-w-[52ch] text-body text-pretty text-muted-foreground">{course.summary}</p>
      <p className="mt-6 flex flex-wrap gap-x-5 gap-y-2 font-mono text-spec text-muted-foreground">
        <CourseFacts course={course} />
      </p>
      <CourseProgress course={course} />
      <div className="mt-auto pt-8">
        <ViewCourse />
      </div>
    </div>
  </Link>
)

export const CourseCard = ({ course }: { readonly course: CatalogueCourse }): JSX.Element => (
  <Link className={cn(CARD_CLASSNAME, "h-full flex-col")} params={{ course: course.slug }} to="/courses/$course">
    <div className="relative overflow-hidden border-b border-border">
      <CourseCover className={COVER_CLASSNAME} course={course} isDecorative sizes={CARD_SIZES} />
      <CourseBadges className="absolute bottom-4 left-4" course={course} />
    </div>
    <div className="flex flex-1 flex-col p-6 md:p-8">
      <h2 className="text-headline-support text-balance text-foreground">{course.title}</h2>
      <p className="mt-3 line-clamp-3 max-w-[60ch] text-body text-pretty text-muted-foreground">{course.summary}</p>
      <p className="mt-6 flex flex-wrap gap-x-5 gap-y-2 font-mono text-spec text-muted-foreground">
        <CourseFacts course={course} />
      </p>
      <CourseProgress course={course} />
      <div className="mt-auto pt-6">
        <ViewCourse />
      </div>
    </div>
  </Link>
)
