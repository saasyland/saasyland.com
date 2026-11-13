import { type JSX, useRef, useState } from "react"

import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ArrowRight, Lock, Play } from "lucide-react"
import { useInView } from "motion/react"
import { useTranslations } from "use-intl/react"

import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { COURSE_SHOWCASE } from "~/src/modules/course/course.constants"
import type { Course } from "~/src/modules/course/course.types"
import { courseShowcaseQuery } from "~/src/modules/course/use-cases/get-course-showcase"
import { LESSON_ACCESS } from "~/src/modules/lesson/lesson.constants"
import type { Lesson } from "~/src/modules/lesson/lesson.types"

import { cn } from "~/src/lib/cn"
import { formatClock } from "~/src/lib/duration"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import courseTourPosterAvif800 from "~/src/presentation/assets/motion/course-tour-800.avif?url"
import courseTourPosterWebp800 from "~/src/presentation/assets/motion/course-tour-800.webp?url"
import courseTourPosterAvif from "~/src/presentation/assets/motion/course-tour.avif?url"
import courseTourVideoMp4 from "~/src/presentation/assets/motion/course-tour.mp4?url"
import courseTourVideoWebm from "~/src/presentation/assets/motion/course-tour.webm?url"
import courseTourPosterWebp from "~/src/presentation/assets/motion/course-tour.webp?url"
import { ROUTES } from "~/src/routes"

const TOUR_WIDTH = 1600
const TOUR_HEIGHT = 900
const TOUR_POSTER_SMALL_WIDTH = 800

const TOUR_SIZES =
  "(min-width: 80rem) calc((80rem - 12.5rem - 2px) * 1.35 / 2.35), (min-width: 64rem) calc((100vw - 12.5rem - 2px) * 1.35 / 2.35), (min-width: 48rem) calc(100vw - 9.5rem - 2px), calc(100vw - 6.5rem - 2px)"

const NEAR_VIEWPORT = "100% 0px 100% 0px"
const SINGLE_COURSE = 1
const MILLISECONDS_PER_MINUTE = 60_000
const LESSON_NUMBER_BASE = 1
const LESSON_NUMBER_PAD = 2

const LINK_CLASSNAME =
  "rounded-sm transition-colors duration-200 ease-exp focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"

const posterSet = (small: string, large: string): string => `${small} ${String(TOUR_POSTER_SMALL_WIDTH)}w, ${large} ${String(TOUR_WIDTH)}w`

const takeOver = (video: HTMLVideoElement): (() => void) => {
  video.focus({ preventScroll: true })

  return () => {
    video.pause()
  }
}

const CourseTour = (): JSX.Element => {
  const t = useTranslations("pages.landing.studio.masterclass.tour")
  const [isStarted, setIsStarted] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-card">
      {isStarted && (
        <video
          ref={takeOver}
          aria-describedby="course-tour-body"
          aria-label={t("label")}
          autoPlay
          className="absolute inset-0 size-full"
          controls
          height={TOUR_HEIGHT}
          muted
          onPlaying={() => {
            setIsPlaying(true)
          }}
          playsInline
          width={TOUR_WIDTH}
        >
          <source src={courseTourVideoWebm} type="video/webm" />
          <source src={courseTourVideoMp4} type="video/mp4" />
        </video>
      )}
      <picture className={cn("pointer-events-none absolute inset-0", { invisible: isPlaying })}>
        <source sizes={TOUR_SIZES} srcSet={posterSet(courseTourPosterAvif800, courseTourPosterAvif)} type="image/avif" />
        <img
          alt=""
          className="size-full"
          decoding="async"
          height={TOUR_HEIGHT}
          loading="lazy"
          sizes={TOUR_SIZES}
          src={courseTourPosterWebp}
          srcSet={posterSet(courseTourPosterWebp800, courseTourPosterWebp)}
          width={TOUR_WIDTH}
        />
      </picture>
      {!isStarted && (
        <button
          className="group absolute inset-0 flex cursor-pointer items-center justify-center focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          onClick={() => {
            setIsStarted(true)
          }}
          type="button"
        >
          <span className="flex size-12 items-center justify-center rounded-full border border-ring/50 bg-background/72 shadow-[0_8px_24px_-8px_oklch(0_0_0/0.6)] backdrop-blur-sm transition-[scale,background-color] duration-300 ease-exp group-hover:scale-106 group-hover:bg-background/86 motion-reduce:transition-none md:size-16">
            <Play aria-hidden className="size-4 translate-x-0.5 fill-current text-ring md:size-5" strokeWidth={0} />
          </span>
          <span className="sr-only">{t("play")}</span>
        </button>
      )}
    </div>
  )
}

const LessonMarker = ({ access }: { readonly access: Lesson["select"]["access"] }): JSX.Element => {
  const t = useTranslations("pages.landing.studio.masterclass")

  if (access === LESSON_ACCESS.PREVIEW) {
    return <Play aria-hidden className="size-3 shrink-0 fill-current text-ring" strokeWidth={0} />
  }

  return (
    <>
      <Lock aria-hidden className="size-3 shrink-0 text-muted-foreground/60" strokeWidth={2.25} />
      <span className="sr-only">{t(`access.${access}`)}</span>
    </>
  )
}

const ShowcaseCourse = ({ course }: { readonly course: Course["showcase"]["courses"][number] }): JSX.Element => {
  const t = useTranslations("pages.landing.studio.masterclass")

  return (
    <div className="flex flex-col p-7 md:p-9">
      <h4 className="text-title text-balance">
        <Link className={cn(LINK_CLASSNAME, "text-foreground hover:text-ring")} params={{ course: course.slug }} to="/courses/$course">
          {course.title}
        </Link>
      </h4>
      <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-mono text-spec text-muted-foreground">
        <span>{t(`kinds.${course.kind}`)}</span>
        <span>{t("lessons", { count: course.lessonCount })}</span>
        <span>{t("minutes", { minutes: Math.round(course.durationMs / MILLISECONDS_PER_MINUTE) })}</span>
        <span className="text-ring">{t("previews", { count: course.previewCount })}</span>
      </p>
      {course.lessons.length === 0 && (
        <p className="mt-5 border-t border-border pt-5 text-body-sm text-muted-foreground">{t("noLessons")}</p>
      )}
      {course.lessons.length > 0 && (
        <ol className="mt-5 border-t border-border">
          {course.lessons.map((lesson, index) => (
            <li className="border-b border-border last:border-b-0" key={lesson.id}>
              <Link
                className="group flex items-baseline gap-4 rounded-sm py-3.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                params={{ course: course.slug, lesson: lesson.slug }}
                to="/courses/$course/$lesson"
              >
                <span aria-hidden className="font-mono text-spec text-muted-foreground tabular-nums">
                  {String(index + LESSON_NUMBER_BASE).padStart(LESSON_NUMBER_PAD, "0")}
                </span>
                <span className="min-w-0 flex-1 text-body-sm text-pretty text-muted-foreground transition-colors duration-200 ease-exp group-hover:text-foreground">
                  {lesson.title}
                  {lesson.access === LESSON_ACCESS.PREVIEW && (
                    <span className="ml-2 rounded-xs border border-ring/30 bg-ring/10 px-1.5 py-0.5 align-middle font-mono text-[10px] text-ring uppercase">
                      {t("access.preview")}
                    </span>
                  )}
                </span>
                {lesson.durationMs !== null && (
                  <span className="font-mono text-spec text-muted-foreground tabular-nums">{formatClock(lesson.durationMs)}</span>
                )}
                <LessonMarker access={lesson.access} />
              </Link>
            </li>
          ))}
        </ol>
      )}
      {course.lessonCount > course.lessons.length && (
        <Link
          className={cn(
            LINK_CLASSNAME,
            "group mt-5 inline-flex items-center gap-2 self-start text-body-sm text-muted-foreground hover:text-foreground",
          )}
          params={{ course: course.slug }}
          to="/courses/$course"
        >
          {t.rich("allLessons", {
            count: course.lessonCount,
            course: (chunks) => <span className="sr-only">{chunks}</span>,
            title: course.title,
          })}
          <ArrowRight
            aria-hidden
            className="size-3.5 transition-transform duration-200 ease-exp group-hover:translate-x-0.5 motion-reduce:transition-none"
          />
        </Link>
      )}
    </div>
  )
}

const ShowcasePending = (): JSX.Element => (
  <div aria-hidden className="grid divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
    {Array.from({ length: COURSE_SHOWCASE.COURSES }, (_, course) => (
      <div className="p-7 md:p-9" key={course}>
        <Skeleton className="h-lh w-2/3 scale-y-70 text-title" />
        <Skeleton className="mt-2 h-lh w-1/2 scale-y-70 text-spec" />
        <div className="mt-5 border-t border-border">
          {Array.from({ length: COURSE_SHOWCASE.LESSONS }, (__, lesson) => (
            <div className="border-b border-border py-3.5 last:border-b-0" key={lesson}>
              <Skeleton className="h-lh w-4/5 scale-y-70 text-body-sm" />
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
)

const ShowcaseCourses = ({ showcase }: { readonly showcase: Course["showcase"] | undefined }): JSX.Element => {
  const t = useTranslations("pages.landing.studio.masterclass")

  if (showcase === undefined) {
    return <ShowcasePending />
  }

  if (showcase.courses.length === 0) {
    return <p className="p-7 text-body text-pretty text-muted-foreground md:p-9">{t("empty")}</p>
  }

  return (
    <div
      className={cn("grid divide-y divide-border", { "md:grid-cols-2 md:divide-x md:divide-y-0": showcase.courses.length > SINGLE_COURSE })}
    >
      {showcase.courses.map((course) => (
        <ShowcaseCourse course={course} key={course.id} />
      ))}
    </div>
  )
}

const FreeLessonLink = ({ freeLesson }: { readonly freeLesson: Course["showcase"]["freeLesson"] }): JSX.Element | undefined => {
  const t = useTranslations("pages.landing.studio.masterclass")

  if (freeLesson === undefined) {
    return
  }

  return (
    <Link
      className="group mt-7 inline-flex items-center gap-3.5 self-start rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      params={{ course: freeLesson.courseSlug, lesson: freeLesson.slug }}
      to="/courses/$course/$lesson"
    >
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-[scale] duration-200 ease-exp group-hover:scale-106 motion-reduce:transition-none"
      >
        <Play className="size-3.5 translate-x-px fill-current" strokeWidth={0} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-body-sm font-semibold text-foreground">{t("freeLesson")}</span>
        <span className="text-body-sm text-pretty text-muted-foreground transition-colors duration-200 ease-exp group-hover:text-foreground">
          {freeLesson.title}
        </span>
      </span>
    </Link>
  )
}

export const CourseShowcase = (): JSX.Element => {
  const t = useTranslations("pages.landing.studio.masterclass")
  const locale = getCurrentLocale()
  const article = useRef<HTMLElement>(null)
  const isNear = useInView(article, { margin: NEAR_VIEWPORT, once: true })

  const { data, isError } = useQuery({ ...courseShowcaseQuery({ locale }), enabled: isNear })

  return (
    <article
      ref={article}
      aria-busy={isNear && data === undefined && !isError}
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="p-7 md:p-9">
        <h3 className="text-headline-support text-balance text-foreground">{t("title")}</h3>
        <p className="mt-3 max-w-[68ch] text-body text-pretty text-muted-foreground">{t("body")}</p>
      </div>

      <div className="grid gap-7 border-y border-border bg-background px-7 py-8 md:px-9 md:py-10 lg:grid-cols-[1.35fr_1fr] lg:items-center lg:gap-12">
        <CourseTour />
        <div className="flex min-w-0 flex-col">
          <p className="text-title text-balance text-foreground">{t("tour.title")}</p>
          <p className="mt-2 max-w-[46ch] text-body-sm text-pretty text-muted-foreground" id="course-tour-body">
            {t("tour.body")}
          </p>
          <FreeLessonLink freeLesson={data?.freeLesson} />
        </div>
      </div>

      {isError && <p className="p-7 text-body text-pretty text-muted-foreground md:p-9">{t("error")}</p>}
      {!isError && <ShowcaseCourses showcase={data} />}

      <div className="border-t border-border px-7 py-5 md:px-9">
        <Link
          className={cn(
            LINK_CLASSNAME,
            "group inline-flex items-center gap-2 text-body-sm font-medium text-foreground hover:text-muted-foreground",
          )}
          to={ROUTES.COURSES}
        >
          {t("browse")}
          <ArrowRight
            aria-hidden
            className="size-3.5 transition-transform duration-200 ease-exp group-hover:translate-x-0.5 motion-reduce:transition-none"
          />
        </Link>
      </div>
    </article>
  )
}
