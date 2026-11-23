import type { JSX } from "react"

import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { useTranslations } from "use-intl/react"

import type { Course } from "~/src/modules/course/course.types"

import { cn } from "~/src/lib/cn"

import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Progress, ProgressLabel } from "~/src/presentation/components/shadcn/progress"

import { CourseCover } from "~/src/presentation/components/custom/courses/course-cover"
import { CourseFacts } from "~/src/presentation/components/custom/courses/course-facts"

type CatalogueCourse = Course["catalogueCourse"]

const CARD_CLASSNAME =
  "group relative isolate flex overflow-hidden rounded-lg border border-border bg-card transition-[border-color,translate,box-shadow] duration-300 ease-exp hover:border-ring/40 hover:shadow-[0_24px_48px_-24px_oklch(0_0_0/0.7)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring motion-safe:hover:-translate-y-0.5"

const COVER_CLASSNAME = "size-full transition-transform duration-700 ease-exp motion-safe:group-hover:scale-103"

const FEATURED_SIZES = "(min-width: 80rem) 44rem, (min-width: 64rem) 56vw, calc(100vw - 3rem)"

const CARD_SIZES = "(min-width: 80rem) 37rem, (min-width: 48rem) calc(50vw - 3.5rem), calc(100vw - 3rem)"

export const CourseBadges = ({
  className,
  course,
}: {
  readonly className?: string
  readonly course: Pick<CatalogueCourse, "kind" | "level">
}): JSX.Element => {
  const t = useTranslations("pages.courses")

  return (
    <p className={cn("flex flex-wrap gap-2", className)}>
      <Badge variant="accent">{t(`kinds.${course.kind}`)}</Badge>
      <Badge>{t(`levels.${course.level}`)}</Badge>
    </p>
  )
}

const CourseProgress = ({ course }: { readonly course: CatalogueCourse }): JSX.Element | undefined => {
  const t = useTranslations("pages.courses.catalogue")

  if (course.completed === 0) {
    return
  }

  return (
    <Progress className="mt-5 **:data-[slot=progress-indicator]:bg-ring" maxValue={course.lessons} value={course.completed}>
      <ProgressLabel className="text-spec text-muted-foreground">
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
      <CourseFacts className="mt-6" course={course} />
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
      <CourseBadges className="absolute bottom-4 left-4 gap-1 rounded-lg bg-background/85 p-1 backdrop-blur-sm" course={course} />
    </div>
    <div className="flex flex-1 flex-col p-6 md:p-8">
      <h2 className="text-headline-support text-balance text-foreground">{course.title}</h2>
      <p className="mt-3 line-clamp-3 max-w-[60ch] text-body text-pretty text-muted-foreground">{course.summary}</p>
      <CourseFacts className="mt-6" course={course} />
      <CourseProgress course={course} />
      <div className="mt-auto pt-6">
        <ViewCourse />
      </div>
    </div>
  </Link>
)
